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

### 2. Create Phase Branch

```yaml
# Story-gen stays on large audience (same as tech-plan)
audience_branch = "${initiative.featureBranchRoot}-large"
phase_branch = "${initiative.featureBranchRoot}-large-p4"

invoke: casey.create-and-push-branch
params:
  branch: ${phase_branch}
  from: ${audience_branch}
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
# Commit all story-gen artifacts
invoke: casey.targeted-commit
params:
  branch: ${phase_branch}
  files:
    - "${docs_path}/implementation-stories.md"
    - "${docs_path}/story-estimates.md"
    - "${docs_path}/dependency-map.md"
  message: "[lens-work] P4 story-gen: implementation stories and estimates"

# Update state
state.current_phase = "story-gen"
state.gate_status.story_gen = "passed"
state.workflow_status = "idle"
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
  
  Next: Run /review for implementation readiness check
  
  PR: ${casey.generate-pr-link(phase_branch, audience_branch)}
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
