# Skill: state-management

**Module:** lens
**Owner:** @lens agent
**Type:** Internal delegation skill

---

## Purpose

Manages the two-file state system (state.yaml + event-log.jsonl). Handles all reads, writes, and validations of initiative state. Replaces the Tracey agent from lens-work.

## Responsibilities

1. **State reads** — Load current initiative state at workflow start
2. **State writes** — Update state at workflow end  
3. **Dual-write sync** — When `gate_status` or `current_phase` changes, update BOTH state.yaml AND the initiative config (`initiatives/{id}.yaml`) to keep them in sync
4. **Event logging** — Append to event-log.jsonl on every state mutation
5. **Status display** — Format and present state for /status and /lens commands
6. **State validation** — Verify state consistency with git reality
7. **Error tracking** — Maintain background_errors array in state

## State Schema (state.yaml)

```yaml
lens_contract_version: "2.0"
active_initiative:
  id: "{initiative_id}"
  type: "{domain|service|feature}"
  current_phase: "{current_phase}"
  feature_branch_root: "{featureBranchRoot}"
  audiences:
    - small
    - medium
    - large
  current_audience: "{audience}"
  current_phase_branch: "{branch_name}"
  gate_status:
    pre-plan: "{passed|in-progress|not-started}"
    plan: "{status}"
    tech-plan: "{status}"
    story-gen: "{status}"
    review: "{status}"
    dev: "{status}"
  checklist: {}
background_errors: []
workflow_status: "{idle|running|error}"
```

## Event Log Schema (event-log.jsonl)

```jsonl
{"ts":"ISO8601","event":"event_type","initiative":"id","user":"name","details":{}}
```

## Event Types

| Event | When |
|-------|------|
| `initiative_created` | /new completes |
| `phase_transition` | Phase advances |
| `workflow_start` | Any workflow begins |
| `workflow_end` | Any workflow completes |
| `gate_opened` | Phase gate passes |
| `gate_blocked` | Phase gate fails |
| `state_synced` | /sync runs |
| `state_fixed` | /fix runs |
| `state_overridden` | /override runs |
| `error` | Any error occurs |
| `initiative_archived` | /archive runs |

## Trigger Conditions

- Every workflow start (read state)
- Every workflow end (write state + append event)
- /status command (read + format)
- /sync command (validate + repair)
- /fix command (rebuild from event log)
- /override command (manual write)

## Error Handling

| Error | Recovery |
|-------|----------|
| State file missing | Initialize from template |
| State corrupted | Rebuild from event-log.jsonl |
| Event log missing | Initialize empty, warn user |
| Version mismatch | Run migration |

---

_Skill spec created on 2026-02-17 via BMAD Module workflow_
