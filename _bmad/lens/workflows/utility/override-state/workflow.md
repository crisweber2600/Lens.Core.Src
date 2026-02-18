---
name: override-state
description: Manual state override (advanced)
agent: lens
trigger: /override command
category: utility
advanced: true
---

# /override — Manual State Override

**Purpose:** Directly modify state.yaml fields when automated recovery is insufficient.

**⚠️ Advanced:** This bypasses validation. Use only when /sync and /fix cannot resolve the issue.

---

## Execution Sequence

### 1. Read Current State

```yaml
state = load("_bmad-output/lens/state.yaml")

output: |
  ⚠️ /override — Manual State Override
  
  Current state:
  ═══════════════════════════════════════════════════
  Initiative: ${state.active_initiative?.id || "none"}
  Type: ${state.active_initiative?.type || "none"}
  Phase: ${state.active_initiative?.current_phase || "none"}
  Workflow status: ${state.workflow_status}
  Errors: ${state.background_errors?.length || 0}
  ═══════════════════════════════════════════════════
```

### 2. Get Override Target

```yaml
output: |
  What would you like to override?
  
  **[1]** Active initiative ID
  **[2]** Current phase
  **[3]** Gate status (mark a gate as passed/not-started)
  **[4]** Workflow status (idle/running/error)
  **[5]** Clear background errors
  **[6]** Custom field (specify path and value)

selection = user_input
```

### 3. Get New Value & Reason

```yaml
ask: new_value               # The new value for the selected field
ask: reason                  # Minimum 10 characters — why is this override needed?

if reason.length < 10:
  error: "Override reason must be at least 10 characters. This is for audit trail."
```

### 4. Confirm

```yaml
output: |
  ⚠️ Confirm override:
  
  Field: ${selected_field}
  Old value: ${old_value}
  New value: ${new_value}
  Reason: ${reason}
  
  This bypasses validation. Continue? [Y/n]

if user_confirms != true:
  output: "Override cancelled."
  exit: 0
```

### 5. Apply Override

```yaml
# Backup current state
write_file("_bmad-output/lens/snapshots/state-pre-override-${ISO_TIMESTAMP}.yaml", state)

# Apply the override
skill: state-management.override
params:
  field: ${selected_field}
  value: ${new_value}
```

### 6. Log Event

```yaml
skill: state-management.log-event("state_overridden", {
  field: ${selected_field},
  old_value: ${old_value},
  new_value: ${new_value},
  reason: ${reason},
  backup: "snapshots/state-pre-override-${ISO_TIMESTAMP}.yaml"
})
```

### 7. Commit & Warn

```yaml
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /override: ${selected_field} — ${reason}"

output: |
  ⚠️ Override applied
  ├── Field: ${selected_field}
  ├── New value: ${new_value}
  ├── Backup: snapshots/state-pre-override-${ISO_TIMESTAMP}.yaml
  ├── Logged to event log with reason
  └── Run /status to verify
  
  ⚠️ Manual overrides bypass validation. Run /sync to check consistency.
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Reason too short | Enforce minimum 10 chars |
| Invalid field path | Show available fields |
| State write failed | Restore from backup |
