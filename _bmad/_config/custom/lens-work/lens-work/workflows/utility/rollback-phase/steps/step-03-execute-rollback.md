---
name: 'step-03-execute-rollback'
description: 'Execute the phase rollback by updating initiative-state.yaml'
---

# Step 3: Execute Rollback

**Goal:** Update `initiative-state.yaml` to reflect the rolled-back phase.

---

## EXECUTION SEQUENCE

### 1. Update Initiative State

```yaml
state_file = "{current_initiative_root}/initiative-state.yaml"

# Update phase field
update_yaml(state_file, "phase", target_phase)

# Reset action to indicate re-entry
update_yaml(state_file, "action", "Start next phase")

# Add rollback entry to history (if history section exists)
append_yaml(state_file, "history", {
  event: "rollback",
  from_phase: current_phase,
  to_phase: target_phase,
  timestamp: now_iso8601()
})
```

### 2. Commit The Change

```yaml
invoke_command("git add '{state_file}'")
invoke_command("git commit -m 'rollback: {current_initiative_root} from {current_phase} to {target_phase}'")
```

### 3. Report Completion

```yaml
output: |
  ## ✅ Phase Rollback Complete

  | Field | Value |
  |-------|-------|
  | Initiative | ${current_initiative_root} |
  | Previous Phase | ${current_phase} |
  | Current Phase | ${target_phase} |

  **Next step:** Run `/${target_phase}` to continue from this phase, or `/status` to review.
```

---

## WORKFLOW COMPLETE
