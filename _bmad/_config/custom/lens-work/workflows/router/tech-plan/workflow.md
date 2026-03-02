---
name: techplan
description: Architecture and technical design phase
agent: "@lens"
trigger: /techplan command
aliases: [/tech-plan]
category: router
phase_name: techplan
display_name: TechPlan
agent_owner: winston
agent_role: Architect
imports: lifecycle.yaml
---

# /techplan — TechPlan Phase Router

**Purpose:** Guide users through the TechPlan phase — architecture, technical design, API contracts, and technology decisions.

**Lifecycle:** `techplan` phase, audience `small`, owned by Winston (Architect).

---

## Role Authorization

**Authorized:** Architect, Tech Lead (phase owner: Winston/Architect)

---

## Prerequisites

- [x] `/businessplan` complete (businessplan phase merged into small audience branch)
- [x] PRD exists
- [x] state.yaml + initiatives/{id} config exist
- [x] businessplan gate passed (BusinessPlan artifacts committed)

---

## Gate Chain Position

```
(none) → preplan → businessplan → [techplan] → devproposal → sprintplan → dev
```

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Check previous phase status (businessplan must be complete)
# 4. Determine correct phase branch: {initiative_root}-{audience}-{phase_name}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to artifact work
# NOTE: techplan is in the SAME audience (small) as businessplan — no cascade merge needed

# Verify working directory is clean
invoke: git-orchestration.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Load lifecycle contract for phase → audience mapping
lifecycle = load("lifecycle.yaml")

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix
docs_path = initiative.docs.path
output_path = docs_path
ensure_directory(output_path)

# Derive audience from lifecycle contract (techplan → small)
current_phase = "techplan"
audience = lifecycle.phases[current_phase].audience    # "small"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"     # {initiative_root}-small

# REQ-7/REQ-9: Validate previous phase PR merged [S1.5]
# Previous phase: businessplan (same audience — small)
prev_phase = "businessplan"
prev_phase_branch = "${initiative_root}-${audience}-businessplan"

if initiative.phase_status[prev_phase] exists:
  if initiative.phase_status[prev_phase].status == "pr_pending":
    # Check if the audience branch contains the phase commits (merged via PR)
    result = git-orchestration.exec("git merge-base --is-ancestor origin/${prev_phase_branch} origin/${audience_branch}")

    if result.exit_code == 0:
      # PR was merged! Auto-update status
      invoke: state-management.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          phase_status:
            businessplan:
              status: "complete"
              completed_at: "${ISO_TIMESTAMP}"
      output: "✅ Previous phase (businessplan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phase_status[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (businessplan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch

      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Determine phase branch [REQ-9]
# techplan is in small audience — NO cascade merge needed (same audience as businessplan)
phase_branch = "${initiative_root}-${audience}-techplan"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "techplan"
    display_name: "TechPlan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}
  if start_phase.exit_code != 0:
    FAIL("❌ Pre-flight failed: Could not create branch ${phase_branch}")

# Step 6: Checkout phase branch
invoke: git-orchestration.checkout-branch
params:
  branch: ${phase_branch}
invoke: git-orchestration.pull-latest

# Step 7: Confirm to user
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: TechPlan (techplan)
  ├── Audience: small
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify businessplan phase artifacts exist
if not gate_passed("businessplan"):
  error: "BusinessPlan phase not complete. Run /businessplan first or merge pending PRs."
  exit: 1

# Verify businessplan artifacts exist
required_artifacts:
  - "${docs_path}/prd.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    warning: "Required artifact not found: ${artifact}. Proceeding but techplan quality may suffer."
```

### 2. Branch Verification (consolidated into Pre-Flight)

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
  🏗️ TechPlan Phase

  We'll now design the technical architecture based on:
  - Product Brief (from preplan)
  - PRD (from businessplan)
  
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
# Commit all techplan artifacts
invoke: git-orchestration.targeted-commit
params:
  branch: ${phase_branch}
  files:
    - "${docs_path}/architecture.md"
    - "${docs_path}/tech-decisions.md"
    - "${docs_path}/api-contracts.md"  # if created
  message: "[lens-work] techplan: architecture and technical design"
# Phase branch remains alive — PR handles merge to audience branch

# REQ-8: Create PR for phase merge
invoke: git-orchestration.create-pr
params:
  head: ${phase_branch}
  base: ${audience_branch}
  title: "[techplan] TechPlan: ${initiative.name}"
  body: "TechPlan phase complete for ${initiative.id}.\n\nArtifacts: architecture.md, tech-decisions.md, api-contracts.md"
capture: pr_result  # { url, number } or fallback message

# REQ-7/REQ-8: Phase enters pr_pending after PR creation
invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    phase_status:
      techplan:
        status: "pr_pending"
        pr_url: "${pr_result.url}"
        pr_number: ${pr_result.number}
# If manual fallback (no PAT), still set pr_pending with null PR info
if pr_result.fallback:
  invoke: state-management.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phase_status:
        techplan:
          status: "pr_pending"
          pr_url: null
          pr_number: null

# Update state — dual-write
state.current_phase = "techplan"
state.workflow_status = "pr_pending"
save(state)

# Dual-write to initiative config
initiative.current_phase = "techplan"
initiative.phase_status.techplan.status = "pr_pending"
save(initiative)

# Background triggers: workflow_end, phase_transition
# (state-sync, event-log, checklist-update, branch-validate, constitution-check)

output: |
  ✅ TechPlan phase complete!

  Artifacts:
  - Architecture: ${docs_path}/architecture.md
  - Tech decisions: ${docs_path}/tech-decisions.md

  Audience: small
  Branch pushed: ${phase_branch}
  PR: ${pr_result}
  Status: pr_pending (awaiting merge)
  Remaining on: ${phase_branch}

  Next: Once all small-audience phases are merged, run @lens next (or /devproposal).
        If promotion is required, it is auto-triggered.
```

---

## Error Handling

| Error | Action |
|-------|--------|
| BusinessPlan gate not passed | Block, suggest /businessplan |
| Previous phase PR not merged | Warn, allow override |
| Architecture doc empty | Warn, allow re-run |
| State write failure | Log to background_errors[] |

---

_Phase workflow backported from lens module on 2026-02-17_
