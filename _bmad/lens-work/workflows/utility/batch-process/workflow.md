---
name: batch-process
description: Process batch question files and run party-mode review
agent: compass
trigger: "@compass batch-process"
category: utility
---

# Batch Process Workflow

**Purpose:** Generate or process phase question files in batch mode, run adversarial review, and advance the phase when complete.

---

## Input Parameters

```yaml
phase_number: string      # "1", "2", "3", "4"
phase_name: string        # Analysis | Planning | Solutioning | Implementation
template_path: string     # Module template path
output_filename: string   # File name for generated batch file
```

---

## Execution Sequence

### 0. Load State

```yaml
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
```

### 0a. Path Resolver (S01-S06: Context Enhancement)

```yaml
# === Path Resolver (S01-S06: Context Enhancement) ===
docs_path = initiative.docs.path    # e.g., "docs/BMAD/LENS/BMAD.Lens/context-enhancement-9bfe4e"
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  # Fallback for older initiatives without docs block
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
  warning: "  → Run: /compass migrate <initiative-id> to add docs.path"
  warning: "  → This fallback will be removed in a future version."

ensure_directory(docs_path)
```

### 1. Resolve Docs Path

```yaml
# Use docs_path from path resolver
docs_root = docs_path
output_file = "${docs_root}/${output_filename}"
```

### 2. Generate Batch File (if missing)

```yaml
if not file_exists(output_file):
  # Ensure directory exists
  ensure_directory(dirname(output_file))

  # Copy template and inject variables
  template = load(template_path)
  rendered = render(template, {
    initiative_id: initiative.id,
    initiative_name: initiative.name,
    layer: initiative.layer,
    domain: initiative.domain,
    service: initiative.service,
    target_repos: initiative.target_repos,
    docs_path: docs_root,
    user_name: user.name,
    timestamp: ISO_TIMESTAMP,
    submission_date: ""
  })
  save(rendered, output_file)

  output: |
    🧾 Batch mode enabled
    ├── Phase: ${phase_name}
    ├── File created: ${output_file}
    └── Fill it out, then re-run the phase command to process it.
  exit: 0
```

### 3. Validate Completion

```yaml
# Ensure all placeholders are filled
content = load(output_file)
if "[ANSWER HERE]" in content:
  output: |
    ⚠️ Batch file incomplete: ${output_file}
    Remove all [ANSWER HERE] placeholders and re-run the phase command.
  exit: 0
```

### 4. Process Phase Artifacts

```yaml
# Use the batch file as the primary input for artifacts.
output_root = phase_number == "4" ? "_bmad-output/implementation-artifacts/" : "${docs_path}/"

if phase_number == "1":
  invoke: bmm.product-brief
  params:
    output_path: ${output_root}
  # Use batch file content to answer prompts

if phase_number == "2":
  invoke: bmm.create-prd
  params:
    product_brief: "${docs_path}/product-brief.md"
    output_path: ${output_root}

  invoke: bmm.create-ux-design
  params:
    output_path: ${output_root}

  invoke: bmm.create-architecture
  params:
    prd: "${docs_path}/prd.md"
    product_brief: "${docs_path}/product-brief.md"
    output_path: ${output_root}

if phase_number == "3":
  invoke: bmm.create-epics
  params:
    architecture: "${docs_path}/architecture.md"
    prd: "${docs_path}/prd.md"
    output_path: ${output_root}

  invoke: bmm.create-stories
  params:
    epics: "${docs_path}/epics.md"
    architecture: "${docs_path}/architecture.md"
    output_path: ${output_root}

  invoke: bmm.readiness-checklist
  params:
    artifacts:
      - product-brief.md
      - prd.md
      - architecture.md
      - epics.md
      - stories.md
    output_path: ${output_root}

if phase_number == "4":
  selected_story = extract_story_id(output_file)
  invoke: bmm.sprint-planning
  params:
    stories: "${docs_path}/stories.md"

  invoke: bmm.create-dev-story
  params:
    story_id: "${selected_story}"
    output_path: ${output_root}
```

### 5. Adversarial Review (Party Mode)

```yaml
review_output = "${docs_root}/phase-${phase_number}-review.md"

invoke: core.party-mode
params:
  input_file: ${output_file}
  artifacts_path: ${output_root}
  output_file: ${review_output}

if party_mode.status != "pass":
  # YOLO fix: apply corrections directly to the batch file, then re-run once
  apply_fixes(output_file, party_mode.findings)

  invoke: core.party-mode
  params:
    input_file: ${output_file}
    artifacts_path: ${output_root}
    output_file: ${review_output}

  if party_mode.status != "pass":
    output: |
      ❌ Party mode review failed after YOLO fix.
      Review findings: ${review_output}
      Update the batch file and re-run.
    exit: 1
```

### 6. Update State

```yaml
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "p${phase_number}"
    current_phase_name: ${phase_name}
    phases:
      p${phase_number}:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"

gate_updates = {}
if phase_number == "2":
  gate_updates.p1_complete = {
    status: "passed",
    verified_at: "${ISO_TIMESTAMP}"
  }

if phase_number == "3":
  gate_updates.p2_complete = {
    status: "passed",
    verified_at: "${ISO_TIMESTAMP}"
  }
  gate_updates.large_review = {
    status: "passed",
    verified_at: "${ISO_TIMESTAMP}"
  }

if gate_updates not empty:
  invoke: tracey.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      gates: ${gate_updates}

invoke: tracey.update-state
params:
  updates:
    current_phase: "p${phase_number}"
    current_phase_name: ${phase_name}

invoke: casey.finish-phase

if phase_number == "2":
  invoke: casey.open-large-review

if phase_number == "3":
  invoke: casey.open-final-pbr
```

### 7. Commit Results

```yaml
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${output_root}"
    - "${docs_root}/"
  message: "[lens-work] batch: Phase ${phase_number} ${phase_name} — ${initiative.id}"
  branch: "${initiative.domain_prefix}/${initiative.id}/${initiative.size}-${phase_number}"
```

### 8. Log Event

```yaml
event = {"ts":"${ISO_TIMESTAMP}","event":"batch-process","id":"${initiative.id}","phase":"p${phase_number}","status":"complete","docs":"${output_file}"}

invoke: tracey.append-events
params:
  events:
    - ${event}
```

---

## Output

```
✅ Batch processing complete
├── Phase: ${phase_name}
├── Batch file: ${output_file}
├── Review: ${review_output}
└── Next: Run the next phase command
```
