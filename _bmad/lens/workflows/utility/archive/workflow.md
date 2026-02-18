---
name: archive
description: Archive completed initiative
agent: lens
trigger: /archive command
category: utility
---

# /archive — Archive Initiative

**Purpose:** Move a completed initiative's state and artifacts to the archive directory and clear the active context.

---

## Execution Sequence

### 1. Validate

```yaml
state = load("_bmad-output/lens/state.yaml")

if state.active_initiative == null:
  error: "No active initiative. Nothing to archive."

initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

output: |
  🔭 /archive — Archive Initiative
  
  Initiative: ${initiative.name} (${initiative.id})
  Type: ${initiative.type}
  Phase: ${initiative.current_phase || "not started"}
  
  ${all_gates_passed(initiative) ? "✅ All phases complete — ready to archive." : "⚠️ Not all phases complete. Archive anyway?"}
  
  Archive this initiative? [Y/n]

if not user_confirms:
  output: "Archive cancelled."
  exit: 0
```

### 2. Create Archive

```yaml
archive_dir = "_bmad-output/lens/archive/${initiative.id}-${ISO_DATE}/"
ensure_directory(archive_dir)

# Copy initiative config
copy_file(
  "_bmad-output/lens/initiatives/${initiative.id}.yaml",
  "${archive_dir}/initiative.yaml"
)

# Copy relevant event log entries
initiative_events = event_log.filter(e => e.initiative == initiative.id)
write_file("${archive_dir}/event-log.jsonl", initiative_events.join("\n"))

# Copy any snapshots
snapshots = list_files("_bmad-output/lens/snapshots/*${initiative.id}*")
for snapshot in snapshots:
  copy_file(snapshot, "${archive_dir}/snapshots/${snapshot.name}")

# Create archive summary
write_file("${archive_dir}/archive-summary.md", format_archive_summary(initiative, initiative_events))
```

### 3. Clear Active State

```yaml
# Remove initiative config from active directory
delete_file("_bmad-output/lens/initiatives/${initiative.id}.yaml")

# Clear active initiative from state
skill: state-management.update
params:
  active_initiative: null
  workflow_status: "idle"
  background_errors: []
```

### 4. Log Event

```yaml
skill: state-management.log-event("initiative_archived", {
  id: ${initiative.id},
  name: ${initiative.name},
  archive_path: ${archive_dir},
  phases_completed: count_passed_gates(initiative)
})
```

### 5. Commit & Confirm

```yaml
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /archive: ${initiative.id} — archived"

output: |
  ✅ Initiative archived
  ├── Name: ${initiative.name}
  ├── ID: ${initiative.id}
  ├── Archive: ${archive_dir}
  ├── Events preserved: ${initiative_events.length}
  ├── Active state cleared
  └── Run /new to create a new initiative or /switch to select another
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No active initiative | Nothing to archive |
| Archive directory exists | Append timestamp to avoid collision |
| Copy failed | Show which files failed, retry |

## Post-Conditions

- [ ] Initiative config moved to archive
- [ ] Event log entries copied to archive
- [ ] Active initiative cleared from state
- [ ] Archive summary generated
