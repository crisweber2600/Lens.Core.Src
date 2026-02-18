---
name: tech-plan
description: Architecture and technical design
agent: lens
trigger: /tech-plan command
category: phase
phase: 3
phase_name: Tech Plan
---

# /tech-plan — Tech Plan Phase

**Purpose:** Guide users through architecture and technical design.

---

## Prerequisites

- [x] Plan gate passed (state.gate_status.plan == "passed")
- [x] PRD and epics exist from /plan

---

## Execution Sequence

### 0. Git Discipline

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

audience = initiative.review_audience_map.p3    # "large"
featureBranchRoot = initiative.feature_branch_root
audience_branch = "${featureBranchRoot}-${audience}"
phase_branch = "${featureBranchRoot}-${audience}-p3"

docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
```

### 1. Validate State & Gate

```yaml
if state.active_initiative.gate_status.plan != "passed":
  error: "Plan gate not passed. Run /plan first."

skill: constitution.validate-initiative(initiative)
constitutional_context = skill: constitution.resolve-context()

# Load prior artifacts for context
prd = load_if_exists("${docs_path}/prd.md")
epics = load_if_exists("${docs_path}/epics.md")
```

### 2. Audience Cascade — Sync Prior Phase Content

```yaml
# P3 uses a different audience (large) than P2 (medium).
# Merge the prior audience branch into this one so P1+P2 artifacts are available.
prev_audience = initiative.review_audience_map.p2    # "medium"
if prev_audience != audience:    # medium != large → cascade needed
  prev_audience_branch = "${featureBranchRoot}-${prev_audience}"

  # Checkout this phase's audience branch
  skill: git-orchestration.checkout-branch(audience_branch)

  # Merge prior audience → this audience (brings P1+P2 artifacts forward)
  merge_result = run: git merge ${prev_audience_branch} --no-edit -m "[lens] cascade: ${prev_audience_branch} → ${audience_branch}"

  if merge_result.conflict:
    error: |
      ⚠️ Cascade merge conflict: ${prev_audience_branch} → ${audience_branch}
      The P2 PR may not have been merged yet. Please:
      1. Merge the P2 PR into ${prev_audience_branch}
      2. Resolve any conflicts manually
      3. Run /tech-plan again

  skill: git-orchestration.commit-and-push
  params:
    branch: ${audience_branch}
    message: "[lens] cascade: P1+P2 artifacts from ${prev_audience_branch} → ${audience_branch}"

  output: |
    🔄 Audience cascade: ${prev_audience_branch} → ${audience_branch}
    └── Prior phase artifacts synced to ${audience} audience
```

### 3. Start Phase — Create P3 Branch

```yaml
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 3
    phase_name: "Tech Plan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}

  skill: git-orchestration.checkout-branch(phase_branch)

skill: state-management.update({workflow_status: "running", current_phase: "p3", current_phase_branch: ${phase_branch}})
skill: state-management.log-event("workflow_start", {phase: "p3", workflow: "tech-plan"})
```

### 4. Route to BMM Architecture Workflows

```yaml
skill: git-orchestration.start-workflow("architecture")

route: bmm.architecture
params:
  output_path: ${docs_path}
  prd: ${prd}
  epics: ${epics}
  constitutional_context: ${constitutional_context}
  initiative_context:
    name: ${initiative.name}
    type: ${initiative.type}

skill: git-orchestration.finish-workflow
```

### 5. Artifact Validation

```yaml
include: artifact-validator
params:
  phase: "tech-plan"
  docs_path: ${docs_path}
  required:
    - architecture.md
    - tech-decisions.md
  optional:
    - api-contracts.md
    - data-model.md
```

### 6. Phase Completion

```yaml
if all_workflows_complete("p3"):
  skill: git-orchestration.commit-and-push({branch: ${phase_branch}, message: "finish-phase(p3): Tech Plan — ${initiative.id}"})

  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}
    target: ${audience_branch}
    title: "P3 Tech Plan: ${initiative.name}"
    body: |
      ## Phase 3 Summary
      **Phase:** Tech Plan | **Audience:** ${audience}
      ### Artifacts
      - Architecture document
      - Technical decisions log
      - API contracts

  skill: git-orchestration.delete-local-branch(phase_branch)
  skill: git-orchestration.checkout-branch(audience_branch)

  output: |
    ✅ /tech-plan complete
    ├── Phase 3 (Tech Plan) finished
    ├── PR created: ${pr_result.url}
    ├── Now on: ${audience_branch}
    └── Next: Run /Story-Gen to continue
```

### 7. Update State

```yaml
skill: state-management.update({gate_status.tech-plan: "passed", workflow_status: "idle", active_branch: ${audience_branch}})
skill: state-management.log-event("phase_transition", {phase: "p3", status: "complete", pr_url: ${pr_result.url}})
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/", "${docs_path}/"]
  message: "[lens] /tech-plan: Phase 3 — ${initiative.id}"
  branch: ${audience_branch}

skill: checklist.auto-update({phase: "tech-plan", artifacts_produced: ["architecture", "tech-decisions", "api-contracts"]})
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Plan gate not passed | Run /plan first |
| No PRD/epics | Warn but continue — architecture benefits from context |
| PR creation failed | HARD GATE |

## Post-Conditions

- [ ] PR created: `${phase_branch}` → `${audience_branch}`
- [ ] Architecture artifacts written
- [ ] state.yaml updated (tech-plan gate → passed)
