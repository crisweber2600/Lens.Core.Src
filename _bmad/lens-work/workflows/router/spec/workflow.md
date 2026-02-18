---
name: spec
description: Launch Planning phase (PRD/UX/Architecture)
agent: compass
trigger: /spec command
category: router
phase: 2
phase_name: Planning
---

# /spec — Planning Phase Router

**Purpose:** Guide users through the Planning phase, invoking PRD, UX, and Architecture workflows.

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead

---

## Prerequisites

- [x] `/pre-plan` complete (Phase 1 merged)
- [x] Product Brief exists
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] P1 gate passed (Analysis artifacts committed)

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Check previous phase status (if applicable)
# 4. Determine correct phase branch: {featureBranchRoot}-{audience}-p{N}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to artifact work

# Verify working directory is clean
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix

# Derive audience for P2 from review_audience_map [REQ-9]
audience = initiative.review_audience_map.p2
featureBranchRoot = initiative.featureBranchRoot
audience_branch = initiative.branches.audiences[audience]

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

output_path = docs_path
ensure_directory(output_path)

# === Context Loader (S08: Context Enhancement) ===
product_brief = load_file("${docs_path}/product-brief.md")
if product_brief == null:
  FAIL("Product brief not found at ${docs_path}/product-brief.md")

if repo_docs_path != null:
  repo_readme = load_if_exists("${repo_docs_path}/README.md")
  repo_architecture = load_if_exists("${repo_docs_path}/ARCHITECTURE.md")
  repo_context = { readme: repo_readme, architecture: repo_architecture }
else:
  repo_context = null

# REQ-7/REQ-9: Validate previous phase PR merged [S1.5]
prev_phase = "p1"
prev_phase_audience = initiative.review_audience_map.p1
prev_phase_branch = "${initiative.featureBranchRoot}-${prev_phase_audience}-p1"
prev_audience_branch = initiative.branches.audiences[prev_phase_audience]

if initiative.phases[prev_phase] exists:
  if initiative.phases[prev_phase].status == "pr_pending":
    # Check if the audience branch contains the phase commits (merged via PR)
    result = casey.exec("git merge-base --is-ancestor origin/${prev_phase_branch} origin/${prev_audience_branch}")
    
    if result.exit_code == 0:
      # PR was merged! Auto-update status
      invoke: tracey.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          phases:
            p1:
              status: "complete"
              completed_at: "${ISO_TIMESTAMP}"
      output: "✅ Previous phase (p1 pre-plan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phases[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (p1 pre-plan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch
      
      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Determine phase branch [REQ-9]
phase_branch = "${initiative.featureBranchRoot}-${audience}-p2"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: casey.start-phase
  params:
    phase_number: 2
    phase_name: "Planning"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${initiative.featureBranchRoot}
    parent_branch: ${audience_branch}
  if start_phase.exit_code != 0:
    FAIL("❌ Pre-flight failed: Could not create branch ${phase_branch}")

# Step 6: Checkout phase branch
invoke: casey.checkout-branch
params:
  branch: ${phase_branch}
invoke: casey.pull-latest

# Step 7: Confirm to user
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: P2 Planning
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify P1 (Analysis/Pre-Plan) artifacts exist
# Branch pattern: {featureBranchRoot}-{audience}-p{N}
p1_branch = "${initiative.featureBranchRoot}-${audience}-p1"

if not phase_complete("p1"):
  # Ancestry check: P1 must be merged into audience branch
  audience_branch = "${initiative.featureBranchRoot}-${audience}"
  result = casey.exec("git merge-base --is-ancestor origin/${p1_branch} origin/${audience_branch}")
  
  if result.exit_code != 0:
    error: "Phase 1 (Analysis) not complete. Run /pre-plan first or merge pending PRs."

# Verify P1 artifacts exist
required_artifacts:
  - "${docs_path}/product-brief.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    # Fallback: check legacy path for backward compatibility
    legacy_path = artifact.replace("${docs_path}/", "_bmad-output/planning-artifacts/")
    if file_exists(legacy_path):
      warning: "Found artifact at legacy path: ${legacy_path}. Consider migrating."
    else:
      warning: "Required artifact not found: ${artifact}. Proceeding but spec quality may suffer."
```

### 1a. Constitution Compliance Gate (ADVISORY)

```yaml
# Invoke compliance-check to verify inherited constitution constraints
# Mode: ADVISORY (log warnings, do not block)
invoke: lens-work.compliance-check
params:
  phase: "p2"
  phase_name: "Planning"
  initiative_id: ${initiative.id}
  target_repos: ${initiative.target_repos}
  mode: "ADVISORY"

# Compliance check logs findings to _bmad-output/lens-work/compliance-reports/
# Warnings are surfaced to user but do not block workflow progression
```

### 2. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation and checkout handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
```

### 2a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for this context before planning workflows
constitutional_context = invoke("scribe.resolve-context")

if constitutional_context.status == "parse_error":
  error: |
    Constitutional context parse error:
    ${constitutional_context.error_details.file}
    ${constitutional_context.error_details.error}

session.constitutional_context = constitutional_context
```

### 2b. Batch Mode (Single-File Questions)

```yaml
if initiative.question_mode == "batch":
  invoke: lens-work.batch-process
  params:
    phase_number: "2"
    phase_name: "Planning"
    template_path: "templates/phase-2-planning-questions.template.md"
    output_filename: "phase-2-planning-questions.md"
  exit: 0
```

### 3. Offer Workflow Options

```
🧭 /spec — Planning Phase

You're starting the Planning phase. Workflows:

**[1] PRD** (required) — Product Requirements Document
**[2] UX Design** (if UI involved) — User experience design
**[3] Architecture** (required) — Technical architecture design

Select workflow(s): [1] [2] [3] [A]ll
```

### 4. Execute Workflows

#### PRD:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: prd

invoke: bmm.create-prd
params:
  product_brief: "${docs_path}/product-brief.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### UX (if selected):
```yaml
invoke: casey.start-workflow
params:
  workflow_name: ux-design

invoke: bmm.create-ux-design
params:
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### Architecture — Technical Spec Generation:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: architecture

# Reference architecture workflow from BMM module
invoke: bmm.create-architecture
params:
  prd: "${docs_path}/prd.md"
  product_brief: "${docs_path}/product-brief.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

### 5. Phase Completion — Push Only

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
if all_workflows_complete("p2"):
  invoke: casey.commit-and-push
  params:
    branch: ${phase_branch}
    message: "[${initiative.id}] P2 Planning complete"
  # Phase branch remains alive — PR handles merge to audience branch

  # REQ-8: Create PR for phase merge
  invoke: casey.create-pr
  params:
    head: ${phase_branch}
    base: ${audience_branch}
    title: "[P2] Planning: ${initiative.name}"
    body: "Phase 2 (Planning) complete for ${initiative.id}.\n\nArtifacts: prd.md, ux-design.md, architecture.md"
  capture: pr_result  # { url, number } or fallback message

  # REQ-7/REQ-8: Phase enters pr_pending after PR creation
  invoke: tracey.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phases:
        p2:
          status: "pr_pending"
          pr_url: "${pr_result.url}"
          pr_number: ${pr_result.number}
  # If manual fallback (no PAT), still set pr_pending with null PR info
  if pr_result.fallback:
    invoke: tracey.update-initiative
    params:
      initiative_id: ${initiative.id}
      updates:
        phases:
          p2:
            status: "pr_pending"
            pr_url: null
            pr_number: null

  output: |
    ✅ /spec complete
    ├── Phase 2 (Planning) finished
    ├── Branch pushed: ${phase_branch}
    ├── PR: ${pr_result}
    ├── Status: pr_pending (awaiting merge)
    ├── Remaining on: ${phase_branch}
    └── Next: Run /plan to continue to Solutioning phase
```

### 6. Update State Files

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "p2"
    current_phase_name: "Planning"
    phases:
      p2:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"
    gates:
      p1_complete:
        status: "passed"
        verified_at: "${ISO_TIMESTAMP}"

# Update state.yaml
invoke: tracey.update-state
params:
  updates:
    current_phase: "p2"
    current_phase_name: "Planning"
    workflow_status: "pr_pending"
    active_branch: "${initiative.featureBranchRoot}-${audience}-p2"
```

### 7. Commit State Changes

```yaml
# Casey commits all state and artifact changes
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens-work] /spec: Phase 2 Planning — ${initiative.id}"
  branch: "${initiative.featureBranchRoot}-${audience}-p2"
```

### 8. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"spec","id":"${initiative.id}","phase":"p2","workflow":"spec","status":"complete"}
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| PRD | `${docs_path}/prd.md` |
| UX Design | `${docs_path}/ux-design.md` |
| Architecture | `${docs_path}/architecture.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| P1 not complete | Error with merge instructions |
| Product brief missing | Warn but allow proceeding |
| Dirty working directory | Prompt to stash or commit changes first |
| Branch creation failed | Check remote connectivity, retry with backoff |
| P1 ancestry check failed | Prompt to merge P1 PR before continuing |
| Architecture workflow failed | Retry or skip with warning |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] On phase branch: `{featureBranchRoot}-{audience}-p2` (REQ-7: no auto-merge)
- [ ] state.yaml updated with phase p2
- [ ] initiatives/{id}.yaml updated with p2 status and p1 gate passed
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (PRD, architecture; optionally UX)
- [ ] All changes pushed to origin
