---
name: setup-rollback
description: Revert bootstrap to previous snapshot
agent: scout
trigger: "@scout rollback"
category: utility
mutates: true
---

# Setup Rollback Workflow

**Purpose:** Revert TargetProjects to a previous snapshot taken during bootstrap or reconcile.

---

## Prerequisites

```yaml
# Check for snapshot
if not file_exists("_bmad-output/lens-work/snapshots/"):
  error: "No snapshots found. Cannot rollback."
  exit: 1
```

---

## Execution Sequence

### 1. List Available Snapshots

```yaml
snapshots = list_directory("_bmad-output/lens-work/snapshots/")

if snapshots.length == 0:
  error: "No snapshots available for rollback."
  exit: 1

output: |
  📦 Available Snapshots
  ═══════════════════════════════════════════════════
  ${snapshots.map((s, i) => `[${i+1}] ${s.name} — ${s.created_at}`).join('\n')}
  ═══════════════════════════════════════════════════
  
  Select snapshot to restore: [1-${snapshots.length}] or [C]ancel
```

### 2. Confirm Destructive Operation

```yaml
output: |
  ⚠️ WARNING: Destructive Operation
  
  This will:
  1. Delete current TargetProjects state
  2. Restore from snapshot: ${selected_snapshot.name}
  3. Re-run discovery to update inventory
  
  This cannot be undone.
  
  Proceed? [Y]es / [N]o
```

### 3. Execute Rollback

```bash
# Remove current TargetProjects (if configured)
target_path="${config.target_projects_path}"

# Restore from snapshot
snapshot_path="_bmad-output/lens-work/snapshots/${selected_snapshot.name}"

# Copy snapshot contents back
cp -R "${snapshot_path}/"* "${target_path}/"
```

### 4. Update State

```yaml
# Log rollback event
log_event:
  event: rollback
  snapshot: ${selected_snapshot.name}
  reason: ${user_reason}
  timestamp: ${ISO_TIMESTAMP}

# Re-run discovery
invoke: scout.repo-discover
```

### 5. Report Results

```
✅ Rollback Complete
═══════════════════════════════════════════════════

Restored from: ${selected_snapshot.name}
Created at: ${selected_snapshot.created_at}
TargetProjects: ${config.target_projects_path}

Discovery re-run to update inventory.

Next Steps:
├── Run '@scout document' to regenerate docs
└── Run '@scout repo-status' to verify health

═══════════════════════════════════════════════════
```

---

## Safety Notes

- Always creates new snapshot before rollback (backup of current state)
- Rollback is logged to event-log.jsonl
- Cannot rollback if no snapshots exist
- User must confirm destructive operation

---

## Checklist

- [ ] Snapshot selected
- [ ] Confirmation received
- [ ] Current state backed up
- [ ] Snapshot restored
- [ ] Discovery re-run
- [ ] Event logged
