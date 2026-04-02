---
name: 'step-02-execute-pause'
description: 'Update initiative-state.yaml to paused status'
---

# Step 2: Execute Pause

**Goal:** Record the pause in `initiative-state.yaml` and commit.

---

## EXECUTION SEQUENCE

### 1. Update Initiative State

```yaml
state_file = "{current_initiative_root}/initiative-state.yaml"

update_yaml(state_file, "status", "paused")
update_yaml(state_file, "paused_at", now_iso8601())
update_yaml(state_file, "paused_phase", current_phase)
update_yaml(state_file, "paused_milestone", current_milestone)

if inputs.reason != "":
  update_yaml(state_file, "pause_reason", inputs.reason)
```

### 2. Commit

```yaml
invoke_command("git add '{state_file}'")
invoke_command("git commit -m 'pause: {current_initiative_root} at phase {current_phase}'")
```

### 3. Report

```yaml
output: |
  ## ⏸️ Initiative Paused

  | Field | Value |
  |-------|-------|
  | Initiative | ${current_initiative_root} |
  | Phase | ${current_phase} |
  | Milestone | ${current_milestone} |
  | Reason | ${inputs.reason || "(none provided)"} |
  ${open_pr_warning ? "| Warning | " + open_pr_warning + " |" : ""}

  **To resume:** Run `/resume-epic`
```

---

## WORKFLOW COMPLETE
