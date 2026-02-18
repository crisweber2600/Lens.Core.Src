---
name: resume
description: Resume interrupted workflow from last checkpoint
agent: lens
trigger: /resume command
category: utility
idempotent: true
---

# /resume — Resume Interrupted Workflow

**Purpose:** Find the last interrupted workflow from the event log and resume execution from that point.

---

## Execution Sequence

### 1. Read State

```yaml
state = load("_bmad-output/lens/state.yaml")

if state.workflow_status == "idle":
  output: |
    🔭 No interrupted workflow found.
    ├── Workflow status: idle
    └── Use a phase command (/pre-plan, /plan, etc.) to start a new workflow.
  exit: 0

if state.active_initiative == null:
  error: "No active initiative. Run /new first."
```

### 2. Find Last Workflow Event

```yaml
event_log = load_lines("_bmad-output/lens/event-log.jsonl")

# Find the last workflow_start that has no matching workflow_end
last_start = null
for event in event_log.reverse():
  if event.event == "workflow_start":
    # Check if there's a workflow_end after this
    has_matching_end = event_log.any(e => 
      e.event == "workflow_end" && 
      e.ts > event.ts && 
      e.details.workflow == event.details.workflow
    )
    if not has_matching_end:
      last_start = event
      break

if last_start == null:
  output: |
    🔭 No interrupted workflow found in event log.
    ├── State shows: ${state.workflow_status}
    └── Run /sync to reset workflow status, or use a phase command.
  exit: 0
```

### 3. Show Resume Context

```yaml
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

output: |
  🔭 /resume — Resume Interrupted Workflow
  ═══════════════════════════════════════════════════
  
  Interrupted workflow found:
  ├── Phase: ${last_start.details.phase}
  ├── Workflow: ${last_start.details.workflow}
  ├── Started: ${last_start.ts}
  └── Initiative: ${last_start.initiative}
  
  Resume this workflow? [Y/n]
```

### 4. Resume

```yaml
if user_confirms:
  # Determine the command to re-invoke
  phase_command = phase_to_command(last_start.details.phase)
  # e.g., "p1" → "/pre-plan", "p2" → "/plan", etc.

  output: |
    🔄 Resuming ${last_start.details.workflow}...
    └── Re-invoking ${phase_command}

  # Reset workflow status so the command can proceed
  skill: state-management.update({workflow_status: "running"})
  
  # Re-invoke the phase workflow
  # The workflow will detect existing phase branch and resume
  invoke: lens.${phase_command}

else:
  # User doesn't want to resume — reset status
  skill: state-management.update({workflow_status: "idle"})
  skill: state-management.log-event("workflow_end", {
    workflow: last_start.details.workflow,
    status: "cancelled",
    reason: "User declined resume"
  })
  
  output: |
    Workflow cancelled. Status reset to idle.
    └── Run any phase command to start a new workflow.
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No interrupted workflow | Suggest phase command or /sync |
| Workflow state mismatch | Reset with /sync |
| Phase branch missing | Suggest /fix to recreate |
