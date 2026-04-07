---
name: 'step-01-preflight'
description: 'Run shared preflight and validate initiative is paused'
nextStepFile: './step-02-resume.md'
preflightInclude: '../../../includes/preflight.md'
---

# Step 1: Preflight And Validation

**Goal:** Verify the control repo is ready and the current initiative is in paused state.

---

## EXECUTION SEQUENCE

### 1. Shared Preflight

```yaml
invoke: include
path: "{preflightInclude}"

initiative_state = invoke: git-state.current-initiative
current_initiative_root = initiative_state.initiative_root
```

### 2. Validate Paused State

```yaml
if current_initiative_root == null:
  output: "⛔ Not on an initiative branch. Switch to the paused initiative with `/switch`."
  STOP

state_file = "{current_initiative_root}/initiative-state.yaml"
if not exists(state_file):
  output: "⛔ No initiative-state.yaml found."
  STOP

current_status = read_yaml(state_file, "status")
if current_status != "paused":
  output: "ℹ️ This initiative is not paused (status: ${current_status}). No action needed."
  STOP

paused_phase = read_yaml(state_file, "paused_phase")
paused_milestone = read_yaml(state_file, "paused_milestone")
paused_at = read_yaml(state_file, "paused_at")
pause_reason = read_yaml(state_file, "pause_reason") || "(none)"
```

---

## OUTPUT CONTRACT

```yaml
output:
  current_initiative_root: string
  paused_phase: string
  paused_milestone: string
  paused_at: string
  pause_reason: string
```

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
