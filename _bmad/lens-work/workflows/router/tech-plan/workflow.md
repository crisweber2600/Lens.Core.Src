---
name: tech-plan
description: Architecture and technical design phase (split from /spec)
agent: compass
trigger: /tech-plan command
category: router
phase: 3
phase_name: Technical Planning
---

# /tech-plan — Technical Planning Phase Router

**Purpose:** Guide users through the Technical Planning phase — architecture, technical design, API contracts, and technology decisions. This is split from the old `/spec` workflow to provide finer-grained lifecycle control.

**Mapping:** Old P3 Solutioning (architecture half) → New `/tech-plan`

---

## Role Authorization

**Authorized:** Architect, Tech Lead

---

## Prerequisites

- [x] `/plan` complete (Phase 2 merged)
- [x] PRD exists
- [x] Epics and user stories defined
- [x] state.yaml + initiatives/{id} config exist
- [x] P2 gate passed (Plan artifacts committed)

---

## Gate Chain Position

```
(none) → pre-plan → plan → [tech-plan] → story-gen → review → dev
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
      output: "✅ Previous phase (p2 plan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phases[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (p2 plan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch
      
      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Derive audience for tech-plan (always large) [REQ-9]
audience = "large"
featureBranchRoot = initiative.featureBranchRoot
audience_branch = "${featureBranchRoot}-large"

# Determine phase branch [REQ-9]
phase_branch = "${featureBranchRoot}-large-p3"

# Audience cascade merge: medium → large (bring P1+P2 artifacts forward)
prev_audience_branch = "${featureBranchRoot}-medium"
result = casey.exec("git merge-base --is-ancestor origin/${prev_audience_branch} origin/${audience_branch}")

if result.exit_code != 0:
  invoke: casey.checkout-branch
  params:
    branch: ${audience_branch}
  result = casey.exec("git merge origin/${prev_audience_branch} --no-edit -m '[lens-work] cascade: P1+P2 artifacts from ${prev_audience_branch} → ${audience_branch}'")
  if result.exit_code != 0:
    FAIL("❌ Pre-flight failed: Cascade merge conflict ${prev_audience_branch} → ${audience_branch}")
  invoke: casey.push-branch
  params:
    branch: ${audience_branch}

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
  ├── Phase: P3 Technical Planning
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify P2 (Plan) artifacts exist and P2 gate passed
if not gate_passed("plan"):
  error: "Plan phase not complete. Run /plan first or merge pending PRs."
  exit: 1

# Verify P2 artifacts exist
required_artifacts:
  - "${docs_path}/prd.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    warning: "Required artifact not found: ${artifact}. Proceeding but tech-plan quality may suffer."
```

### 2. Audience Cascade Merge (consolidated into Pre-Flight)

```yaml
# Audience cascade merge handled in Step 0 Pre-Flight [REQ-9]
# Cascade: medium → large already completed during pre-flight.
assert: cascade_merge_complete == true
```

### 3. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
```

### 4. Architecture Design

```yaml
# Load context from previous phases
product_brief = load_file("${docs_path}/product-brief.md")
prd = load_file("${docs_path}/prd.md")
epics = load_if_exists("${docs_path}/epics.md")

output: |
  🏗️ Technical Planning Phase
  
  We'll now design the technical architecture based on:
  - Product Brief (from pre-plan)
  - PRD and epics (from plan)
  
  This phase produces:
  1. Architecture document
  2. Technology decisions log
  3. API contracts (if applicable)
  4. Data model specification (if applicable)

# Guide through architecture decisions
invoke: workflow-step
params:
  step: architecture-design
  context: { product_brief, prd, epics }
  output_file: "${docs_path}/architecture.md"

invoke: workflow-step
params:
  step: tech-decisions
  context: { product_brief, prd }
  output_file: "${docs_path}/tech-decisions.md"

# Optional: API contracts
ask: "Does this initiative involve API contracts? [Y/n]"
if answer == "Y":
  invoke: workflow-step
  params:
    step: api-contracts
    context: { architecture }
    output_file: "${docs_path}/api-contracts.md"
```

### 5. Commit & Gate

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
# Commit all tech-plan artifacts
invoke: casey.targeted-commit
params:
  branch: ${phase_branch}
  files:
    - "${docs_path}/architecture.md"
    - "${docs_path}/tech-decisions.md"
    - "${docs_path}/api-contracts.md"  # if created
  message: "[lens-work] P3 tech-plan: architecture and technical design"
# Phase branch remains alive — PR handles merge to audience branch

# REQ-8: Create PR for phase merge
invoke: casey.create-pr
params:
  head: ${phase_branch}
  base: ${audience_branch}
  title: "[P3] Technical Planning: ${initiative.name}"
  body: "Phase 3 (Technical Planning) complete for ${initiative.id}.\n\nArtifacts: architecture.md, tech-decisions.md, api-contracts.md"
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

# Update state
state.current_phase = "tech-plan"
state.gate_status.tech_plan = "passed"
state.workflow_status = "pr_pending"
save(state)

# Dual-write to initiative config
initiative.gate_status.tech_plan = "passed"
initiative.current_phase = "tech-plan"
save(initiative)

# Background triggers: workflow_end, phase_transition
# (state-sync, event-log, checklist-update, branch-validate, constitution-check)

output: |
  ✅ Technical Planning phase complete!
  
  Artifacts:
  - Architecture: ${docs_path}/architecture.md
  - Tech decisions: ${docs_path}/tech-decisions.md
  
  Branch pushed: ${phase_branch}
  PR: ${pr_result}
  Status: pr_pending (awaiting merge)
  Remaining on: ${phase_branch}
  
  Next: Run /story-gen to generate implementation stories
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Plan gate not passed | Block, suggest /plan |
| Cascade merge conflict | Error with manual resolution instructions |
| Architecture doc empty | Warn, allow re-run |
| State write failure | Log to background_errors[] |

---

_Phase workflow backported from lens module on 2026-02-17_
