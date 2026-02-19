---
name: plan
description: Complete Solutioning (Epics/Stories/Readiness)
agent: compass
trigger: /plan command
category: router
phase: 3
phase_name: Solutioning
---

# /plan — Solutioning Phase Router

**Purpose:** Complete the Solutioning phase with Epics, Stories, and Readiness checklist, including mandatory adversarial and party-mode stress tests for epic quality.

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead

---

## Prerequisites

- [x] `/spec` complete (Phase 2 merged)
- [x] Large review approved (small → large merged)
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] P2 gate passed (Planning artifacts committed)

---

## Execution Sequence

### 0. Git Discipline — Verify Clean State

```yaml
# Verify working directory is clean
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Read size from initiative config (shared, canonical)
size = initiative.size
domain_prefix = initiative.domain_prefix

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
prd = load_file("${docs_path}/prd.md")
architecture = load_file("${docs_path}/architecture.md")

if product_brief == null or prd == null or architecture == null:
  FAIL("Required planning artifacts missing from ${docs_path}/")

if repo_docs_path != null:
  repo_readme = load_if_exists("${repo_docs_path}/README.md")
  repo_setup = load_if_exists("${repo_docs_path}/SETUP.md")
  repo_context = { readme: repo_readme, setup: repo_setup }
else:
  repo_context = null

# Validate we're on the correct branch (or can switch)
# Branch pattern: {featureBranchRoot}-{audience}-p{N}
expected_branch: "${initiative.featureBranchRoot}-${audience}-p3"
current_branch = casey.get-current-branch()

if current_branch != expected_branch:
  if branch_exists(expected_branch):
    invoke: casey.checkout-branch
    params:
      branch: ${expected_branch}
    invoke: casey.pull-latest
  # else: branch will be created in Step 2
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify P2 (Spec/Planning) is complete
# Branch pattern: {featureBranchRoot}-{audience}-p{N}
p2_branch = "${initiative.featureBranchRoot}-${audience}-p2"
audience_branch = "${initiative.featureBranchRoot}-${audience}"

# Ancestry check: P2 must be merged into size branch
result = casey.exec("git merge-base --is-ancestor origin/${p2_branch} origin/${audience_branch}")

if result.exit_code != 0:
  error: "Phase 2 (Planning) not complete. Run /spec first or merge pending PRs."

# Verify large review is merged (if applicable)
if not large_review_merged():
  warning: "Large review PR not merged. Proceeding but architecture may change."

# Verify P2 artifacts exist
required_artifacts:
  - "${docs_path}/prd.md"
  - "${docs_path}/architecture.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    # Fallback: check legacy path for backward compatibility
    legacy_path = artifact.replace("${docs_path}/", "_bmad-output/planning-artifacts/")
    if file_exists(legacy_path):
      warning: "Found artifact at legacy path: ${legacy_path}. Consider migrating."
    else:
      warning: "Required artifact not found: ${artifact}."
```

### 1a. Constitution Compliance Gate (ADVISORY)

```yaml
# Invoke compliance-check to verify inherited constitution constraints
# Mode: ADVISORY (log warnings, do not block)
invoke: lens-work.compliance-check
params:
  phase: "p3"
  phase_name: "Solutioning"
  initiative_id: ${initiative.id}
  target_repos: ${initiative.target_repos}
  mode: "ADVISORY"

# Compliance check logs findings to _bmad-output/lens-work/compliance-reports/
# Warnings are surfaced to user but do not block workflow progression
```

### 2. Start Phase 3 — Auto-Branch Creation

```yaml
# Casey creates P3 branch if it doesn't exist
# Branch pattern: {featureBranchRoot}-{audience}-p{N}
if not branch_exists("${initiative.featureBranchRoot}-${audience}-p3"):
  invoke: casey.start-phase
  params:
    phase_number: 3
    phase_name: "Solutioning"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${initiative.featureBranchRoot}
  # Casey creates: ${featureBranchRoot}-${audience}-p3 and pushes to remote

  invoke: casey.pull-latest
else:
  # Branch exists, ensure we're on it
  invoke: casey.checkout-branch
  params:
    branch: "${initiative.featureBranchRoot}-${audience}-p3"
  invoke: casey.pull-latest
```

### 2a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for this context before solutioning workflows
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
    phase_number: "3"
    phase_name: "Solutioning"
    template_path: "templates/phase-3-solutioning-questions.template.md"
    output_filename: "phase-3-solutioning-questions.md"
  exit: 0
```

### 3. Execute Workflows

#### Epics — Story Breakdown Integration:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: epics

# Reference Epic generation workflow from BMM module
invoke: bmm.create-epics
params:
  architecture: "${docs_path}/architecture.md"
  prd: "${docs_path}/prd.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### Epic Stress Gate (Required: Adversarial + Party Mode):
```yaml
# Run adversarial + party-mode teardown for EACH generated epic
epic_ids = extract_epic_ids("_bmad-output/planning-artifacts/epics.md")

for epic_id in epic_ids:
  readiness_adversarial = invoke("bmm.check-implementation-readiness")
  params:
    mode: "adversarial"
    scope: "epic"
    epic_id: ${epic_id}
    prd: "_bmad-output/planning-artifacts/prd.md"
    architecture: "_bmad-output/planning-artifacts/architecture.md"
    epics: "_bmad-output/planning-artifacts/epics.md"
    constitutional_context: ${constitutional_context}

  if readiness_adversarial.status in ["blocked", "fail"]:
    error: |
      Epic adversarial review failed for ${epic_id}.
      Resolve implementation-readiness findings before continuing.

  invoke: core.party-mode
  params:
    input_file: "_bmad-output/planning-artifacts/epics.md"
    focus_epic: ${epic_id}
    artifacts_path: "_bmad-output/planning-artifacts/"
    output_file: "_bmad-output/planning-artifacts/epic-${epic_id}-party-mode-review.md"
    constitutional_context: ${constitutional_context}

  if party_mode.status not in ["pass", "complete"]:
    error: |
      Epic party-mode review flagged unresolved issues for ${epic_id}.
      Address _bmad-output/planning-artifacts/epic-${epic_id}-party-mode-review.md and re-run /plan.
```
#### Stories — Story Breakdown Integration:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: stories

# Reference Story generation workflow from BMM module
invoke: bmm.create-stories
params:
  epics: "${docs_path}/epics.md"
  architecture: "${docs_path}/architecture.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### Readiness Checklist:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: readiness

invoke: bmm.readiness-checklist
params:
  artifacts:
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
    - stories.md
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

### 4. Phase Completion

```yaml
if all_workflows_complete("p3"):
  invoke: casey.finish-phase
  invoke: casey.open-final-pbr  # PR: large → base
  
  output: |
    ✅ /plan complete
    ├── Phase 3 (Solutioning) finished
    ├── Final PBR PR opened (large → base)
    ├── Stories ready for sprint planning
    └── Next: Run /review for implementation gate
```

### 5. Update State Files

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "p3"
    current_phase_name: "Solutioning"
    phases:
      p3:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"
    gates:
      p2_complete:
        status: "passed"
        verified_at: "${ISO_TIMESTAMP}"
      large_review:
        status: "passed"
        verified_at: "${ISO_TIMESTAMP}"

# Update state.yaml
invoke: tracey.update-state
params:
  updates:
    current_phase: "p3"
    current_phase_name: "Solutioning"
    active_branch: "${initiative.featureBranchRoot}-${audience}-p3"
```

### 6. Commit State Changes

```yaml
# Casey commits all state and artifact changes
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens-work] /plan: Phase 3 Solutioning — ${initiative.id}"
  branch: "${initiative.featureBranchRoot}-${audience}-p3"
```

### 7. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"plan","id":"${initiative.id}","phase":"p3","workflow":"plan","status":"complete"}
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Epics | `${docs_path}/epics.md` |
| Epic Party-Mode Review | `_bmad-output/planning-artifacts/epic-*-party-mode-review.md` |
| Implementation Readiness Adversarial Report | `_bmad-output/planning-artifacts/implementation-readiness-report-*.md` |
| Stories | `${docs_path}/stories.md` |
| Readiness | `${docs_path}/readiness-checklist.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| P2 not complete | Error with merge instructions |
| Large review not merged | Warn but allow proceeding |
| PRD/Architecture missing | Warn, proceeding may produce incomplete epics |
| Dirty working directory | Prompt to stash or commit changes first |
| Branch creation failed | Check remote connectivity, retry with backoff |
| P2 ancestry check failed | Prompt to merge P2 PR before continuing |
| Epic/Story generation failed | Retry or allow manual creation |
| Epic adversarial review failed | Resolve implementation-readiness findings and re-run /plan |
| Epic party-mode review failed | Address party-mode findings and re-run /plan |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] On correct branch: `{featureBranchRoot}-{audience}-p3`
- [ ] state.yaml updated with phase p3
- [ ] initiatives/{id}.yaml updated with p3 status and p2 gate passed
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (epics, stories, readiness-checklist)
- [ ] Epic adversarial review executed and passed
- [ ] Epic party-mode review executed and report generated
- [ ] Final PBR PR opened (large → base)
- [ ] All changes pushed to origin

