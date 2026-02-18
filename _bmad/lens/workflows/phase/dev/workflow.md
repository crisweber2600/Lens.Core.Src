---
name: dev
description: Implementation loop — coding, testing, PRs
agent: lens
trigger: /Dev command
category: phase
phase: 6
phase_name: Dev
---

# /Dev — Implementation Phase

**Purpose:** Guide users through the implementation loop — coding, testing, and PR flow.

---

## Prerequisites

- [x] Review gate passed (state.gate_status.review == "passed")
- [x] Implementation stories exist from /Story-Gen

---

## Execution Sequence

### 0. Git Discipline

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

audience = initiative.review_audience_map.p6    # "large"
featureBranchRoot = initiative.feature_branch_root
audience_branch = "${featureBranchRoot}-${audience}"
phase_branch = "${featureBranchRoot}-${audience}-p6"

impl_path = "_bmad-output/implementation-artifacts/"
```

### 1. Validate State & Gate

```yaml
if state.active_initiative.gate_status.review != "passed":
  error: "Review gate not passed. Run /Review first."

skill: constitution.validate-initiative(initiative)
constitutional_context = skill: constitution.resolve-context()

# Load implementation stories
stories = load_if_exists("${impl_path}/implementation-stories.md")
```

### 2. Start Phase — Create/Checkout P6 Branch

```yaml
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 6
    phase_name: "Dev"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}

  skill: git-orchestration.checkout-branch(phase_branch)

skill: state-management.update({workflow_status: "running", current_phase: "p6", current_phase_branch: ${phase_branch}})
skill: state-management.log-event("workflow_start", {phase: "p6", workflow: "dev"})
```

### 3. Present Story Selection

```yaml
if stories != null:
  output: |
    🔭 /Dev — Implementation Phase
    
    Available stories:
    ${stories.formatted_list}
    
    Select story to implement: [number] or [A]ll in sequence
else:
  output: |
    🔭 /Dev — Implementation Phase
    
    No structured stories found. Proceeding with free-form implementation.
    Describe what you want to implement:
```

### 4. Implementation Loop (per story)

```yaml
for each selected_story:
  # Create workflow branch for this story
  workflow_name = sanitize(selected_story.name)
  skill: git-orchestration.start-workflow(workflow_name)

  # Route to BMM dev workflow
  route: bmm.dev-story
  params:
    story: ${selected_story}
    constitutional_context: ${constitutional_context}
    initiative_context:
      name: ${initiative.name}
      type: ${initiative.type}

  # After implementation, auto-commit
  skill: git-orchestration.auto-commit
  params:
    message: "feat(${initiative.id}): ${selected_story.name}"

  # Finish workflow — PR to phase branch
  skill: git-orchestration.finish-workflow
  
  # Update checklist
  skill: checklist.auto-update({phase: "dev", artifacts_produced: [workflow_name]})

  output: |
    ✅ Story complete: ${selected_story.name}
    ├── Code committed
    ├── PR: workflow → phase branch
    └── Continue to next story? [Y/n]
```

### 5. Phase Completion

```yaml
if all_stories_complete or user_signals_done:
  skill: git-orchestration.commit-and-push({branch: ${phase_branch}, message: "finish-phase(p6): Dev — ${initiative.id}"})

  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}
    target: ${audience_branch}
    title: "P6 Dev: ${initiative.name}"
    body: |
      ## Phase 6 Summary
      **Phase:** Dev | **Audience:** ${audience}
      ### Completed Stories
      ${completed_stories_list}

  skill: git-orchestration.delete-local-branch(phase_branch)
  skill: git-orchestration.checkout-branch(audience_branch)

  output: |
    ✅ /Dev complete
    ├── Phase 6 (Dev) finished
    ├── Stories implemented: ${completed_count}
    ├── PR created: ${pr_result.url}
    │   └── ${phase_branch} → ${audience_branch}
    ├── Now on: ${audience_branch}
    └── Next: Merge audience PRs to root for final review
```

### 6. Update State

```yaml
skill: state-management.update({gate_status.dev: "passed", workflow_status: "idle", active_branch: ${audience_branch}})
skill: state-management.log-event("phase_transition", {phase: "p6", status: "complete", pr_url: ${pr_result.url}})
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /Dev: Phase 6 — ${initiative.id}"
  branch: ${audience_branch}
```

### 7. Final Review (if all phases complete)

```yaml
if all_gates_passed(state):
  # Trigger final review: large audience → root
  skill: git-orchestration.open-final-review
  params:
    source: "${featureBranchRoot}-large"
    target: ${featureBranchRoot}
    title: "Final Review: ${initiative.name}"

  output: |
    🎉 All phases complete!
    ├── Final PR: ${featureBranchRoot}-large → ${featureBranchRoot}
    ├── Ready for final merge to initiative root
    └── After merge: Run /archive to complete the lifecycle
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Review gate not passed | Run /Review first |
| No stories found | Allow free-form implementation |
| Test failures | Report and suggest fixes |
| PR creation failed | HARD GATE |

## Post-Conditions

- [ ] All selected stories implemented
- [ ] PR created: `${phase_branch}` → `${audience_branch}`
- [ ] state.yaml updated (dev gate → passed)
- [ ] If all gates passed: final review PR created
