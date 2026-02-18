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

# Derive audience for P3 from review_audience_map [REQ-9]
audience = initiative.review_audience_map.p3
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

# REQ-7/REQ-9: Validate previous phase PR merged [S1.5]
prev_phase = "p2"
prev_phase_audience = initiative.review_audience_map.p2
prev_phase_branch = "${initiative.featureBranchRoot}-${prev_phase_audience}-p2"
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
            p2:
              status: "complete"
              completed_at: "${ISO_TIMESTAMP}"
      output: "✅ Previous phase (p2 spec) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phases[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (p2 spec) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch
      
      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Determine phase branch [REQ-9]
phase_branch = "${initiative.featureBranchRoot}-${audience}-p3"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: casey.start-phase
  params:
    phase_number: 3
    phase_name: "Solutioning"
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
  ├── Phase: P3 Solutioning
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
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

### 2. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation and checkout handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
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

### 4. Phase Completion — Push Only

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
if all_workflows_complete("p3"):
  invoke: casey.commit-and-push
  params:
    branch: ${phase_branch}
    message: "[${initiative.id}] P3 Solutioning complete"
  # Phase branch remains alive — PR handles merge to audience branch

  # REQ-8: Create PR for phase merge
  invoke: casey.create-pr
  params:
    head: ${phase_branch}
    base: ${audience_branch}
    title: "[P3] Solutioning: ${initiative.name}"
    body: "Phase 3 (Solutioning) complete for ${initiative.id}.\n\nArtifacts: epics.md, stories.md, readiness-checklist.md"
  capture: pr_result  # { url, number } or fallback message

  # REQ-7/REQ-8: Phase enters pr_pending after PR creation
  invoke: tracey.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phases:
        p3:
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
          p3:
            status: "pr_pending"
            pr_url: null
            pr_number: null

  output: |
    ✅ /plan complete
    ├── Phase 3 (Solutioning) finished
    ├── Branch pushed: ${phase_branch}
    ├── PR: ${pr_result}
    ├── Status: pr_pending (awaiting merge)
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
    workflow_status: "pr_pending"
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
- [ ] On phase branch: `{featureBranchRoot}-{audience}-p3` (REQ-7: no auto-merge)
- [ ] state.yaml updated with phase p3
- [ ] initiatives/{id}.yaml updated with p3 status and p2 gate passed
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (epics, stories, readiness-checklist)
- [ ] Epic adversarial review executed and passed
- [ ] Epic party-mode review executed and report generated
- [ ] All changes pushed to origin

