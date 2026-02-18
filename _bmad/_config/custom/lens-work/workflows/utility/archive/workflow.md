---
name: archive
description: Archive completed initiative, clean state
agent: tracey
trigger: "@tracey ARCHIVE"
category: utility
---

# Archive Workflow

**Purpose:** Archive a completed initiative and clean up active state.

---

## Execution Sequence

### 1. Validate Completion

```yaml
state = load("_bmad-output/lens-work/state.yaml")

if state.initiative == null:
  output: "No active initiative to archive."
  exit: 0

# Check all gates
incomplete_gates = filter(state.gates, g => g.status not in ["completed", "overridden"])

if incomplete_gates.length > 0:
  output: |
    ⚠️ Initiative not complete
    
    Incomplete gates:
    ${for gate in incomplete_gates}
    ├── ${gate.name}: ${gate.status}
    ${endfor}
    
    Complete all gates or use OVERRIDE before archiving.
  exit: 1
```

### 2. Create Archive

```yaml
archive_id = state.initiative.id
archive_path = "_bmad-output/lens-work/archive/${archive_id}/"

ensure_directory(archive_path)

# Copy state
copy(
  "_bmad-output/lens-work/state.yaml",
  "${archive_path}/state.yaml"
)

# Extract relevant events
events = load_all("_bmad-output/lens-work/event-log.jsonl")
initiative_events = filter(events, e => e.id == archive_id)
save_jsonl(initiative_events, "${archive_path}/event-log.jsonl")
```

### 3. Generate Summary

```yaml
summary = {
  initiative_id: archive_id,
  name: state.initiative.name,
  layer: state.initiative.layer,
  target_repo: state.initiative.target_repo,
  created_at: state.initiative.created_at,
  archived_at: now(),
  duration: calculate_duration(state.initiative.created_at, now()),
  phases_completed: count_completed_phases(state),
  total_workflows: state.gates.length,
  overrides: filter(state.gates, g => g.status == "overridden")
}

save_markdown(summary, "${archive_path}/summary.md")
```

### 4. Clean Active State

```yaml
# Clear active initiative
new_state = {
  version: 1,
  active_initiative: null
}

save(new_state, "_bmad-output/lens-work/state.yaml")

# Log archive event
append_event({
  ts: now(),
  event: "archive",
  id: archive_id,
  archive_path: archive_path
})
```

### 5. Output Summary

```
📦 Initiative Archived

Initiative: ${summary.initiative_id}
Name: ${summary.name}
Duration: ${summary.duration}

Phases completed: ${summary.phases_completed}
Total workflows: ${summary.total_workflows}
${if summary.overrides.length > 0}
⚠️ Overrides: ${summary.overrides.length}
${endif}

Archive location: ${archive_path}
├── state.yaml
├── event-log.jsonl
└── summary.md

Active state cleared. Ready for next initiative.
```
