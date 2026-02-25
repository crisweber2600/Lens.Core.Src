---
name: story-gen
description: Story generation phase — create implementation stories from architecture
agent: compass
trigger: /story-gen command
category: router
phase: 4
phase_name: Story Generation
---

# /story-gen — Story Generation Phase Router

**Purpose:** Generate implementation stories from architecture documents, add estimates, and map dependencies. Split from the old `/plan` workflow to provide finer-grained lifecycle control.

**Mapping:** Old P3 Solutioning (story generation half) → New `/story-gen`

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead

---

## Prerequisites

- [x] `/tech-plan` complete (Phase 3 merged)
- [x] Architecture document exists
- [x] state.yaml + initiatives/{id} config exist
- [x] P3 gate passed (Tech-plan artifacts committed)

---

## Gate Chain Position

```
(none) → pre-plan → plan → tech-plan → [story-gen] → review → dev
```

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
initiative = load_initiative_config(state.active_initiative)

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix
docs_path = initiative.docs.path
output_path = docs_path
ensure_directory(output_path)

# REQ-7/REQ-9: Validate previous phase PR merged [S1.5]
prev_phase = "techplan"
prev_phase_branch = "${initiative.featureBranchRoot}-small-techplan"
prev_audience_branch = "${initiative.featureBranchRoot}-small"

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
            techplan:
              status: "complete"
              completed_at: "${ISO_TIMESTAMP}"
      output: "✅ Previous phase (techplan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phases[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (techplan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch
      
      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Derive audience for story-gen (medium for devproposal) [REQ-9]
audience = "medium"
featureBranchRoot = initiative.featureBranchRoot
audience_branch = "${featureBranchRoot}-medium"

# Determine phase branch [REQ-9]
phase_branch = "${featureBranchRoot}-medium-devproposal"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: casey.create-and-push-branch
  params:
    branch: ${phase_branch}
    from: ${audience_branch}
  if create_branch.exit_code != 0:
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
  ├── Phase: P4 Story Generation
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify P3 (Tech-Plan) artifacts exist and P3 gate passed
if not gate_passed("tech_plan"):
  error: "Tech-plan phase not complete. Run /tech-plan first or merge pending PRs."
  exit: 1

# Verify P3 artifacts exist
required_artifacts:
  - "${docs_path}/architecture.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    warning: "Required artifact not found: ${artifact}. Proceeding but story quality may suffer."
```

### 2. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
```

### 3. Story Generation

```yaml
# Load context from all previous phases
product_brief = load_file("${docs_path}/product-brief.md")
prd = load_file("${docs_path}/prd.md")
epics = load_if_exists("${docs_path}/epics.md")
architecture = load_file("${docs_path}/architecture.md")
tech_decisions = load_if_exists("${docs_path}/tech-decisions.md")

output: |
  📝 Story Generation Phase
  
  Generating implementation stories from:
  - Architecture document (from tech-plan)
  - PRD and epics (from plan)
  - Product brief (from pre-plan)
  
  This phase produces:
  1. Implementation stories with acceptance criteria
  2. Story estimates (T-shirt sizing or story points)
  3. Dependency map between stories

# Generate stories from architecture
invoke: workflow-step
params:
  step: story-generation
  context: { product_brief, prd, epics, architecture, tech_decisions }
  output_file: "${docs_path}/implementation-stories.md"

# Add estimates
invoke: workflow-step
params:
  step: story-estimation
  context: { implementation_stories }
  output_file: "${docs_path}/story-estimates.md"

# Map dependencies
invoke: workflow-step
params:
  step: dependency-mapping
  context: { implementation_stories }
  output_file: "${docs_path}/dependency-map.md"
```

### 4. Commit & Gate

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
# Commit all story-gen artifacts
invoke: casey.targeted-commit
params:
  branch: ${phase_branch}
  files:
    - "${docs_path}/implementation-stories.md"
    - "${docs_path}/story-estimates.md"
    - "${docs_path}/dependency-map.md"
  message: "[lens-work] P4 story-gen: implementation stories and estimates"
# Phase branch remains alive — PR handles merge to audience branch

# REQ-8: Create PR for phase merge
invoke: casey.create-pr
params:
  head: ${phase_branch}
  base: ${audience_branch}
  title: "[DevProposal] Story Generation: ${initiative.name}"
  body: "DevProposal (Story Generation) complete for ${initiative.id}.\n\nArtifacts: implementation-stories.md, story-estimates.md, dependency-map.md"
capture: pr_result  # { url, number } or fallback message

# REQ-7/REQ-8: Phase enters pr_pending after PR creation
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    phases:
      devproposal:
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
        devproposal:
          status: "pr_pending"
          pr_url: null
          pr_number: null

# Update state
state.current_phase = "story-gen"
state.gate_status.story_gen = "passed"
state.workflow_status = "pr_pending"
save(state)

# Dual-write to initiative config
initiative.gate_status.story_gen = "passed"
initiative.current_phase = "story-gen"
save(initiative)

# Background triggers: workflow_end, phase_transition
# (state-sync, event-log, checklist-update, branch-validate, constitution-check)

output: |
  ✅ Story Generation phase complete!
  
  Artifacts:
  - Stories: ${docs_path}/implementation-stories.md
  - Estimates: ${docs_path}/story-estimates.md
  - Dependencies: ${docs_path}/dependency-map.md
  
  Branch pushed: ${phase_branch}
  PR: ${pr_result}
  Status: pr_pending (awaiting merge)
  Remaining on: ${phase_branch}
  
  Next: Run /review for implementation readiness check
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Tech-plan gate not passed | Block, suggest /tech-plan |
| Architecture doc missing | Error with clear message |
| Story generation incomplete | Warn, allow re-run |
| State write failure | Log to background_errors[] |

---

_Phase workflow backported from lens module on 2026-02-17_
