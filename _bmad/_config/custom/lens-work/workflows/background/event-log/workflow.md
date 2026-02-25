---
name: event-log
description: Append to event-log.jsonl on every state mutation
agent: "@lens/state-management"
trigger: "background (auto-triggered)"
category: background
---

# Background Workflow: event-log

**Purpose:** Append structured events to `event-log.jsonl` on every state mutation. Provides an immutable audit trail of all lens-work operations.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `workflow_end` | Log workflow completion event |
| `phase_transition` | Log phase advancement event |
| `initiative_create` | Log initiative creation event |
| `error` | Log error event |

---

## Event Format

Each line in `event-log.jsonl` is a JSON object:

```json
{
  "ts": "2026-02-17T12:00:00Z",
  "event": "phase_transition",
  "initiative": "bmad-lens-auth-x7k2m9",
  "user": "git config user.name",
  "data": {
    "from_phase": "plan",
    "to_phase": "tech-plan",
    "gate_status": "passed"
  }
}
```

---

## Event Types

| Event | When | Data Fields |
|-------|------|-------------|
| `initiative_created` | /new completes | layer, name, id, target_repos |
| `phase_transition` | Phase advances | from_phase, to_phase, gate_status |
| `workflow_start` | Any workflow begins | workflow_name, phase |
| `workflow_end` | Any workflow completes | workflow_name, phase, duration |
| `gate_opened` | Phase gate passes | gate, required_items, passed_items |
| `gate_blocked` | Phase gate fails | gate, missing_items, reason |
| `state_synced` | /sync runs | corrections_made |
| `state_fixed` | /fix runs | issues_fixed |
| `state_overridden` | /override runs | reason, fields_changed |
| `error` | Any error occurs | error_type, message, context |
| `initiative_archived` | /archive runs | initiative_id, archive_path |
| `constitution_violation` | Governance check fails | rule, severity, context |
| `constitution_passed` | Governance check passes | rules_checked |

---

## Execution Steps

```yaml
1. Determine event type from trigger context
2. Build event object:
   a. ts = current ISO 8601 timestamp
   b. event = event type string
   c. initiative = state.active_initiative
   d. user = git config user.name (or "system" for background)
   e. data = trigger-specific data fields
3. Validate event object (all required fields present)
4. Append JSON line to _bmad-output/lens-work/event-log.jsonl
5. IF append fails:
   a. Log to background_errors[] in state.yaml
   b. Retry once
   c. If still fails, continue (don't block workflow)
```

---

## Rules

- **Append-only** — Never modify or delete existing entries
- **Idempotent** — Duplicate events are acceptable (better than missing events)
- **Timestamped** — All events use ISO 8601 format
- **User-attributed** — Events include the user from git config
- **Non-blocking** — Event log failures never block workflow execution

---

## Error Handling

| Error | Action |
|-------|--------|
| event-log.jsonl missing | Create file, then append |
| Write permission denied | Log to background_errors[], continue |
| Invalid event data | Log warning, append with partial data |
| Disk full | Log to background_errors[], continue |

---

_Background workflow backported from lens module on 2026-02-17_
