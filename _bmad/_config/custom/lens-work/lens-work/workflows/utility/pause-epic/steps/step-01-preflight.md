---
name: 'step-01-preflight'
description: 'Run shared preflight and validate pause eligibility'
nextStepFile: './step-02-execute-pause.md'
preflightInclude: '../../../includes/preflight.md'
---

# Step 1: Preflight And Validation

**Goal:** Verify the control repo is ready and the current initiative can be paused.

---

## EXECUTION SEQUENCE

### 1. Shared Preflight

```yaml
invoke: include
path: "{preflightInclude}"

initiative_state = invoke: git-state.current-initiative
current_initiative_root = initiative_state.initiative_root
```

### 2. Validate Initiative

```yaml
if current_initiative_root == null:
  output: "⛔ Not on an initiative branch. Switch to an initiative first with `/switch`."
  STOP

state_file = "{current_initiative_root}/initiative-state.yaml"
if not exists(state_file):
  output: "⛔ No initiative-state.yaml found."
  STOP

current_status = read_yaml(state_file, "status")
if current_status == "paused":
  output: "ℹ️ This initiative is already paused. Use `/resume-epic` to resume."
  STOP

if current_status == "closed":
  output: "⛔ This initiative is closed. Cannot pause a closed initiative."
  STOP

current_phase = read_yaml(state_file, "phase")
current_milestone = read_yaml(state_file, "milestone")
```

### 3. Check Open PRs (Advisory)

```yaml
pr_info = invoke: git-orchestration.query-pr-status
  head: "{current_initiative_root}-{current_milestone}"

open_pr_warning = ""
if pr_info != null and pr_info.state == "open":
  open_pr_warning = "⚠️ PR #${pr_info.number} is open. It will remain open while paused."
```

---

## OUTPUT CONTRACT

```yaml
output:
  current_initiative_root: string
  current_phase: string
  current_milestone: string
  open_pr_warning: string
```

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
