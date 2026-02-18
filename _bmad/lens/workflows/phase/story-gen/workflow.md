---
name: story-gen
description: Generate implementation stories from architecture
agent: lens
trigger: /Story-Gen command
category: phase
phase: 4
phase_name: Story Generation
---

# /Story-Gen — Story Generation Phase

**Purpose:** Generate implementation stories from architecture artifacts.

---

## Prerequisites

- [x] Tech-plan gate passed
- [x] Architecture document exists from /tech-plan

---

## Execution Sequence

### 0. Git Discipline

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

audience = initiative.review_audience_map.p4    # "large"
featureBranchRoot = initiative.feature_branch_root
audience_branch = "${featureBranchRoot}-${audience}"
phase_branch = "${featureBranchRoot}-${audience}-p4"

docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
impl_path = "_bmad-output/implementation-artifacts/"
ensure_directory(impl_path)
```

### 1. Validate State & Gate

```yaml
if state.active_initiative.gate_status.tech-plan != "passed":
  error: "Tech-plan gate not passed. Run /tech-plan first."

skill: constitution.validate-initiative(initiative)
constitutional_context = skill: constitution.resolve-context()

# Load prior artifacts
architecture = load_if_exists("${docs_path}/architecture.md")
tech_decisions = load_if_exists("${docs_path}/tech-decisions.md")
epics = load_if_exists("${docs_path}/epics.md")
```

### 2. Start Phase — Create P4 Branch

```yaml
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 4
    phase_name: "Story Generation"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}

  skill: git-orchestration.checkout-branch(phase_branch)

skill: state-management.update({workflow_status: "running", current_phase: "p4", current_phase_branch: ${phase_branch}})
skill: state-management.log-event("workflow_start", {phase: "p4", workflow: "story-gen"})
```

### 3. Route to BMM Story Generation

```yaml
skill: git-orchestration.start-workflow("story-generation")

route: bmm.story-generation
params:
  output_path: ${impl_path}
  architecture: ${architecture}
  tech_decisions: ${tech_decisions}
  epics: ${epics}
  constitutional_context: ${constitutional_context}

skill: git-orchestration.finish-workflow
```

### 4. Artifact Validation

```yaml
include: artifact-validator
params:
  phase: "story-gen"
  docs_path: ${impl_path}
  required:
    - implementation-stories.md
  optional:
    - story-estimates.md
    - dependency-map.md
```

### 5. Phase Completion

```yaml
if all_workflows_complete("p4"):
  skill: git-orchestration.commit-and-push({branch: ${phase_branch}, message: "finish-phase(p4): Story-Gen — ${initiative.id}"})

  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}
    target: ${audience_branch}
    title: "P4 Story-Gen: ${initiative.name}"
    body: |
      ## Phase 4 Summary
      **Phase:** Story Generation | **Audience:** ${audience}
      ### Artifacts
      - Implementation stories
      - Story estimates
      - Dependency map

  skill: git-orchestration.delete-local-branch(phase_branch)
  skill: git-orchestration.checkout-branch(audience_branch)

  output: |
    ✅ /Story-Gen complete
    ├── Phase 4 (Story Generation) finished
    ├── PR created: ${pr_result.url}
    ├── Now on: ${audience_branch}
    └── Next: Run /Review for readiness checks
```

### 6. Update State

```yaml
skill: state-management.update({gate_status.story-gen: "passed", workflow_status: "idle", active_branch: ${audience_branch}})
skill: state-management.log-event("phase_transition", {phase: "p4", status: "complete", pr_url: ${pr_result.url}})
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/", "${impl_path}/"]
  message: "[lens] /Story-Gen: Phase 4 — ${initiative.id}"
  branch: ${audience_branch}

skill: checklist.auto-update({phase: "story-gen", artifacts_produced: ["implementation-stories", "story-estimates", "dependency-map"]})
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Tech-plan gate not passed | Run /tech-plan first |
| No architecture doc | Warn but continue |
| PR creation failed | HARD GATE |

## Post-Conditions

- [ ] Implementation stories generated
- [ ] PR created: `${phase_branch}` → `${audience_branch}`
- [ ] state.yaml updated (story-gen gate → passed)
