---
name: state-sync
description: Validate and update state.yaml at workflow boundaries
agent: lens
trigger: auto (workflow_start, workflow_end, phase_transition, initiative_create, error)
category: background
user_facing: false
---

# State Sync (Background)

**Purpose:** Validates state.yaml against git reality at workflow boundaries. Auto-triggered — never user-invoked.

---

## Trigger Behavior

### On `workflow_start` (Read Mode)

```yaml
state = load("_bmad-output/lens/state.yaml")

# Verify active initiative exists
if state.active_initiative == null:
  add_background_error("No active initiative during workflow start")
  return

# Verify current branch matches state
current_branch = exec("git branch --show-current")
if current_branch != state.active_initiative.current_phase_branch:
  # State drift — update state to reflect reality
  state.active_initiative.current_phase_branch = current_branch
  write_file("_bmad-output/lens/state.yaml", state)
```

### On `workflow_end` (Write Mode)

```yaml
state = load("_bmad-output/lens/state.yaml")

# Update workflow status
state.workflow_status = "idle"

# Update timestamps
state.last_updated = ISO_TIMESTAMP

write_file("_bmad-output/lens/state.yaml", state)
```

### On `phase_transition` (Read + Write)

```yaml
state = load("_bmad-output/lens/state.yaml")

# Validate the phase transition is legal
current_phase = state.active_initiative.phase
# Phase ordering: p1 → p2 → p3 → p4 → p5 → p6
if new_phase != expected_next_phase(current_phase):
  add_background_error("Phase transition ${current_phase} → ${new_phase} is non-sequential")

# Update phase
state.active_initiative.phase = new_phase
state.active_initiative.current_phase_branch = new_phase_branch

write_file("_bmad-output/lens/state.yaml", state)
```

### On `initiative_create` (Initialize)

```yaml
# Fresh state initialization handled by init-initiative workflow
# This hook validates the state was written correctly

state = load("_bmad-output/lens/state.yaml")
if state.active_initiative == null:
  add_background_error("Initiative creation did not update state")
if state.lens_contract_version != "2.0":
  state.lens_contract_version = "2.0"
  write_file("_bmad-output/lens/state.yaml", state)
```

### On `error`

```yaml
state = load("_bmad-output/lens/state.yaml")

state.workflow_status = "error"
state.background_errors.push({
  ts: ISO_TIMESTAMP,
  error: error_details,
  context: current_workflow
})

write_file("_bmad-output/lens/state.yaml", state)
```

---

## Helper: add_background_error

```yaml
state.background_errors = state.background_errors || []
state.background_errors.push({
  ts: ISO_TIMESTAMP,
  error: message
})
write_file("_bmad-output/lens/state.yaml", state)
```
