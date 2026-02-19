---
name: state-sync
description: Validate state.yaml against git reality at workflow boundaries
agent: tracey
trigger: "background (auto-triggered)"
category: background
---

# Background Workflow: state-sync

**Purpose:** Validate `state.yaml` against git reality at every workflow boundary. Ensures state consistency across all operations.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `workflow_start` | Load state, verify active initiative exists, auto-correct branch drift |
| `workflow_end` | Set `workflow_status: idle`, update timestamps |
| `phase_transition` | Validate sequential phase progression, update phase fields |
| `initiative_create` | Validate state was written correctly, ensure contract version |
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
1. Validate phase progression is sequential (no skipping)
   Gate chain: (none) → pre-plan → plan → tech-plan → story-gen → review → dev
   Old mapping: P1=pre-plan, P2=plan/spec, P3=tech-plan/story-gen, P4=review/dev
2. Update current_phase to new phase
3. Update gate_status for the completed phase to "passed"
4. Dual-write: also update gate_status in initiative config file
5. Log phase_transition event to event-log.jsonl
```

### On initiative_create

```yaml
1. Validate state.yaml was written with all required fields
2. Verify lens_contract_version is present
3. Verify active_initiative matches the newly created initiative
4. Validate initiative config file exists and is consistent
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

When `gate_status` or `current_phase` changes, BOTH files are updated:
1. `_bmad-output/lens-work/state.yaml` — the runtime state file
2. The initiative config file (Domain.yaml, Service.yaml, or {id}.yaml)

This ensures:
- `state.yaml` has the active view for quick reads
- Initiative config has the canonical record for each initiative
- Switching initiatives doesn't lose phase progress

---

## Error Handling

| Error | Action |
|-------|--------|
| state.yaml missing | Create from template with defaults |
| Initiative config missing | Log error, suggest /fix-state |
| Branch drift detected | Auto-correct state, log warning |
| Phase skip attempted | Block transition, log violation |
| Contract version mismatch | Attempt migration, log result |

---

_Background workflow backported from lens module on 2026-02-17_
