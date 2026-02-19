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

### 0. Git Discipline — Verify Clean State

```yaml
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load_initiative_config(state.active_initiative)

domain_prefix = initiative.domain_prefix
docs_path = initiative.docs.path
output_path = docs_path
ensure_directory(output_path)
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

### 2. Audience Cascade Merge

```yaml
# Tech-plan uses large audience, plan used medium.
# Merge medium → large to bring P1+P2 artifacts forward.
prev_audience_branch = "${initiative.featureBranchRoot}-medium"
audience_branch = "${initiative.featureBranchRoot}-large"

# Check if cascade merge is needed
result = casey.exec("git merge-base --is-ancestor origin/${prev_audience_branch} origin/${audience_branch}")

if result.exit_code != 0:
  # Need to cascade
  invoke: casey.checkout-branch
  params:
    branch: ${audience_branch}
  
  result = casey.exec("git merge origin/${prev_audience_branch} --no-edit -m '[lens-work] cascade: P1+P2 artifacts from ${prev_audience_branch} → ${audience_branch}'")
  
  if result.exit_code != 0:
    error: |
      ⚠️ Cascade merge conflict: ${prev_audience_branch} → ${audience_branch}
      The prior PR may not have been merged yet. Please:
      1. Merge the prior PR into ${prev_audience_branch}
      2. Resolve any conflicts manually
      3. Run /tech-plan again
    exit: 1
  
  invoke: casey.push-branch
  params:
    branch: ${audience_branch}
```

### 3. Create Phase Branch

```yaml
# Branch: {featureBranchRoot}-large-p3
phase_branch = "${initiative.featureBranchRoot}-large-p3"

invoke: casey.create-and-push-branch
params:
  branch: ${phase_branch}
  from: ${audience_branch}
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
# Commit all tech-plan artifacts
invoke: casey.targeted-commit
params:
  branch: ${phase_branch}
  files:
    - "${docs_path}/architecture.md"
    - "${docs_path}/tech-decisions.md"
    - "${docs_path}/api-contracts.md"  # if created
  message: "[lens-work] P3 tech-plan: architecture and technical design"

# Update state
state.current_phase = "tech-plan"
state.gate_status.tech_plan = "passed"
state.workflow_status = "idle"
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
  
  Next: Run /story-gen to generate implementation stories
  
  PR: ${casey.generate-pr-link(phase_branch, audience_branch)}
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
