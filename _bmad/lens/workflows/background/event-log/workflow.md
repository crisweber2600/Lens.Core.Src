---
name: event-log
description: Append entries to event-log.jsonl on state mutations
agent: lens
trigger: auto (workflow_end, phase_transition, initiative_create, error)
category: background
user_facing: false
---

# Event Log (Background)

**Purpose:** Append entries to event-log.jsonl on every state mutation. The event log is the authoritative history and source of truth for state reconstruction.

---

## Event Format

```jsonl
{"ts":"ISO8601","event":"event_type","initiative":"id","user":"git_user","details":{}}
```

## Entry Rules

1. **Append-only** — NEVER edit or delete existing entries
2. **Idempotent** — Same event should not be logged twice
3. **Timestamped** — ISO 8601 with timezone
4. **User attributed** — Include git user name

---

## Trigger Behavior

### On `workflow_end`

```yaml
user = exec("git config user.name")

entry = {
  ts: ISO_TIMESTAMP,
  event: "workflow_end",
  initiative: state.active_initiative.id,
  user: user,
  details: {
    workflow: completed_workflow_name,
    phase: state.active_initiative.phase,
    status: "complete",
    artifacts_produced: list_of_artifacts
  }
}

append_line("_bmad-output/lens/event-log.jsonl", JSON.stringify(entry))
```

### On `phase_transition`

```yaml
entry = {
  ts: ISO_TIMESTAMP,
  event: "phase_transition",
  initiative: state.active_initiative.id,
  user: exec("git config user.name"),
  details: {
    from_phase: previous_phase,
    to_phase: new_phase,
    gate_status: gate_result,
    pr_url: pr_url || null
  }
}

append_line("_bmad-output/lens/event-log.jsonl", JSON.stringify(entry))
```

### On `initiative_create`

```yaml
entry = {
  ts: ISO_TIMESTAMP,
  event: "initiative_created",
  initiative: new_initiative.id,
  user: exec("git config user.name"),
  details: {
    type: new_initiative.type,
    name: new_initiative.name,
    feature_branch_root: new_initiative.feature_branch_root,
    audiences: new_initiative.audiences,
    branches_created: branches_list
  }
}

append_line("_bmad-output/lens/event-log.jsonl", JSON.stringify(entry))
```

### On `error`

```yaml
entry = {
  ts: ISO_TIMESTAMP,
  event: "error",
  initiative: state.active_initiative?.id || "unknown",
  user: exec("git config user.name"),
  details: {
    error_type: error.type,
    message: error.message,
    workflow: current_workflow,
    phase: state.active_initiative?.phase,
    recoverable: error.recoverable
  }
}

append_line("_bmad-output/lens/event-log.jsonl", JSON.stringify(entry))
```

---

## Event Type Reference

| Event | Description |
|-------|-------------|
| `initiative_created` | New initiative initialized |
| `initiative_archived` | Initiative moved to archive |
| `phase_transition` | Phase advanced (with gate result) |
| `workflow_start` | Workflow execution began |
| `workflow_end` | Workflow execution completed |
| `gate_opened` | Phase gate passed validation |
| `gate_blocked` | Phase gate failed validation |
| `state_synced` | /sync reconciled state |
| `state_fixed` | /fix rebuilt state from events |
| `state_overridden` | /override manually changed state |
| `context_switch` | Active initiative changed |
| `onboard_complete` | User onboarding finished |
| `discover_complete` | Repo discovery finished |
| `bootstrap_complete` | Repo bootstrapped |
| `constitution_violation` | Governance rule violated |
| `constitution_passed` | Governance check passed |
| `error` | Error occurred during operation |
