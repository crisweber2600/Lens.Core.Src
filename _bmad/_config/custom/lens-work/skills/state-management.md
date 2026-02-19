# Skill: state-management

**Module:** lens-work
**Owner:** Tracey agent (delegated via Compass)
**Type:** Internal delegation skill

---

## Purpose

Manages the two-file state system (state.yaml + event-log.jsonl). Handles all reads, writes, and validations of initiative state. Formalizes the Tracey agent's API contract.

## Responsibilities

1. **State reads** — Load current initiative state at workflow start
2. **State writes** — Update state at workflow end
3. **Dual-write sync** — When `gate_status` or `phase` changes, update BOTH state.yaml AND the initiative config (`initiatives/{id}.yaml` or `initiatives/{id}/Domain.yaml` etc.) to keep them in sync
4. **Event logging** — Append to event-log.jsonl on every state mutation
5. **Status display** — Format and present state for /status and /lens commands
6. **State validation** — Verify state consistency with git reality
7. **Error tracking** — Maintain background_errors array in state

## State Schema (state.yaml)

```yaml
lens_contract_version: "1.0"
active_initiative:
  id: "{initiative_id}"
  type: "{domain|service|feature|microservice}"
  phase: "{current_phase}"
  feature_branch_root: "{featureBranchRoot}"
  audiences:
    - small
    - medium
    - large
  current_audience: "{audience}"
  current_phase_branch: "{branch_name}"
  gate_status:
    pre-plan: "{passed|in-progress|not-started}"
    spec: "{status}"
    plan: "{status}"
    review: "{status}"
    dev: "{status}"
    # NEW gates (backported from lens):
    tech-plan: "{status}"
    story-gen: "{status}"
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
| `initiative_created` | /new-* completes |
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
| `constitution_violation` | Governance check fails |
| `constitution_passed` | Governance check passes |

## Dual-Write Contract

When `gate_status` or `phase` changes in state.yaml:
1. Write to `_bmad-output/lens-work/state.yaml`
2. Also write to the initiative config file:
   - Domain: `initiatives/{id}/Domain.yaml`
   - Service: `initiatives/{id}/Service.yaml`
   - Feature/Microservice: `initiatives/{id}.yaml`
3. When switching initiatives (`/switch`), load gate_status from the initiative config into state.yaml

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

_Skill spec backported from lens module on 2026-02-17_
