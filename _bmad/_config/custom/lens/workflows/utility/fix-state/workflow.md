---
name: fix-state
description: Repair corrupted state from event log
agent: lens
trigger: /fix command
category: utility
idempotent: true
---

# /fix — State Repair

**Purpose:** Rebuild state.yaml from event-log.jsonl when state is corrupted or inconsistent.

---

## Execution Sequence

### 1. Read Event Log

```yaml
event_log = load_lines("_bmad-output/lens/event-log.jsonl")

if event_log.length == 0:
  error: "Event log is empty. Cannot reconstruct state. Run /new to start fresh."

output: |
  🔧 /fix — State Repair
  ├── Events found: ${event_log.length}
  └── Reconstructing state from event history...
```

### 2. Reconstruct State

```yaml
# Replay events chronologically to rebuild state
reconstructed = {
  lens_contract_version: "2.0",
  active_initiative: null,
  workflow_status: "idle",
  background_errors: []
}

for event in event_log:
  switch event.event:
    case "initiative_created":
      reconstructed.active_initiative = {
        id: event.initiative,
        type: event.details.type,
        phase: null,
        feature_branch_root: event.details.feature_branch_root,
        audiences: event.details.audiences,
        gate_status: default_gate_status()
      }

    case "phase_transition":
      reconstructed.active_initiative.phase = event.details.phase
      reconstructed.active_initiative.gate_status[event.details.phase_name] = event.details.status

    case "context_switch":
      reconstructed.active_initiative.id = event.details.to

    case "initiative_archived":
      if event.initiative == reconstructed.active_initiative.id:
        reconstructed.active_initiative = null

    case "state_overridden":
      # Apply override data
      merge(reconstructed, event.details.overrides)

    case "error":
      reconstructed.background_errors.push(event.details)
```

### 3. Validate Against Git

```yaml
# Cross-reference reconstructed state with actual branches
if reconstructed.active_initiative != null:
  actual_branches = skill: git-orchestration.list-matching-branches(
    reconstructed.active_initiative.feature_branch_root
  )
  
  # Verify reconstructed branch references actually exist
  if reconstructed.active_initiative.current_phase_branch:
    if reconstructed.active_initiative.current_phase_branch not in actual_branches:
      reconstructed.active_initiative.current_phase_branch = null
      warning: "Phase branch from events doesn't exist in git. Cleared."
```

### 4. Write Repaired State

```yaml
# Backup current state
current_state = load_if_exists("_bmad-output/lens/state.yaml")
if current_state != null:
  write_file("_bmad-output/lens/snapshots/state-backup-${ISO_TIMESTAMP}.yaml", current_state)

# Write reconstructed state
write_file("_bmad-output/lens/state.yaml", reconstructed)
```

### 5. Log Event

```yaml
skill: state-management.log-event("state_fixed", {
  events_replayed: event_log.length,
  result: "success",
  backup: "snapshots/state-backup-${ISO_TIMESTAMP}.yaml"
})
```

### 6. Report

```yaml
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /fix: state rebuilt from ${event_log.length} events"

output: |
  🔧 State Repair Complete
  ═══════════════════════════════════════════════════
  
  Events replayed: ${event_log.length}
  Active initiative: ${reconstructed.active_initiative?.id || "none"}
  Current phase: ${reconstructed.active_initiative?.phase || "none"}
  Backup saved: snapshots/state-backup-${ISO_TIMESTAMP}.yaml
  
  Run /status to verify the repaired state.
  ═══════════════════════════════════════════════════
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Empty event log | Must start fresh with /new |
| Corrupt event log entry | Skip entry, warn, continue |
| Reconstructed state invalid | Show what was recoverable, suggest /override |
