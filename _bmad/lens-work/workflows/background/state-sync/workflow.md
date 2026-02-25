---
name: state-sync
description: Validate state.yaml against git reality at workflow boundaries (v2 — named phases)
agent: tracey
trigger: "background (auto-triggered)"
category: background
imports: lifecycle.yaml
---

# Background Workflow: state-sync

**Purpose:** Validate `state.yaml` against git reality at every workflow boundary. Ensures state consistency across all operations.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `workflow_start` | Load state, verify active initiative exists, auto-correct branch drift |
| `workflow_end` | Set `workflow_status: idle`, update timestamps |
| `phase_transition` | Validate sequential phase progression (v2: named phases), update phase fields |
| `audience_promotion` | Validate all phases in audience complete, update audience_status |
| `initiative_create` | Validate state was written correctly, ensure lifecycle_version: 2 |
| `error` | Set `workflow_status: error`, append to `background_errors[]` |

---

## Execution Steps

### On workflow_start

```yaml
1. Load state.yaml
2. Verify active_initiative is set and points to a valid initiative config
3. Check current branch matches expected branch from state
4. IF branch drift detected:
   a. Log warning to event-log.jsonl
   b. Auto-correct state.yaml to match git reality
   c. Append to background_errors[] with context
5. Set workflow_status: running
6. Update last_activity timestamp
```

### On workflow_end

```yaml
1. Set workflow_status: idle
2. Update last_activity timestamp
3. Clear any transient workflow fields
4. Validate state consistency (all required fields present)
```

### On phase_transition

```yaml
1. Load lifecycle.yaml to determine valid phase chain for initiative's track
2. Validate phase progression is sequential within track:
   # v2 phase chain (derived from track):
   # full:        preplan → businessplan → techplan → devproposal → sprintplan
   # feature:     businessplan → techplan → devproposal → sprintplan
   # tech-change: techplan → sprintplan
   # hotfix:      techplan
   # spike:       preplan
3. Validate cross-audience transitions include audience promotion gate
   # small phases complete → adversarial-review gate → medium phases
   # medium phases complete → stakeholder-approval gate → large phases
   # large phases complete → constitution-gate → base
4. Update current_phase to new phase (v2: named phase)
5. Update phase_status for the completed phase to "passed"
6. Dual-write: also update phase_status in initiative config file
7. Log phase_transition event to event-log.jsonl
```

### On audience_promotion

```yaml
1. Validate all phases in source audience are complete
2. Validate gate type matches lifecycle.yaml audience entry_gate
3. Update audience_status (e.g., small_to_medium: "passed")
4. Dual-write to initiative config
5. Log audience_promotion event to event-log.jsonl
```

### On initiative_create

```yaml
1. Validate state.yaml was written with all required fields
2. Verify lifecycle_version is 2 (or handle legacy via adapter)
3. Verify active_initiative matches the newly created initiative
4. Validate initiative config file exists and is consistent
5. Verify track is set and valid (full|feature|tech-change|hotfix|spike)
```

### On error

```yaml
1. Set workflow_status: error
2. Append error to background_errors[]:
   - ts: ISO 8601 timestamp
   - error: Error description
   - context: What was happening when error occurred
3. Log error event to event-log.jsonl
4. Do NOT clear active workflow state (for recovery)
```

---

## Dual-Write Contract

When `phase_status`, `current_phase`, or `audience_status` changes, BOTH files are updated:
1. `_bmad-output/lens-work/state.yaml` — the runtime state file
2. The initiative config file (Domain.yaml, Service.yaml, or {id}.yaml)

This ensures:
- `state.yaml` has the active view for quick reads
- Initiative config has the canonical record for each initiative
- Switching initiatives doesn't lose phase progress

---

## Version Requirements

All initiatives must use `lifecycle_version: 2` with named phases.
Legacy initiatives (v1) are no longer supported and must be migrated.

---

## Error Handling

| Error | Action |
|-------|--------|
| state.yaml missing | Create from template with defaults (lifecycle_version: 2) |
| Initiative config missing | Log error, suggest /fix-state |
| Branch drift detected | Auto-correct state, log warning |
| Phase skip attempted | Block transition, log violation |
| Audience promotion without complete phases | Block, log violation |
| Contract version mismatch | Attempt migration, log result |
| Legacy initiative detected | Block operation, require migration to v2 |
