---
name: gate-event-template
description: Gate definitions, event logging patterns, and validation rules for lens-work lifecycle gates
type: include
---

# Gate & Event Template Reference

This document defines all gate types, event log formats, and validation rules used by lens-work lifecycle workflows.

---

## Gate Types

| Gate Type | Purpose | Trigger | Automation |
|-----------|---------|---------|------------|
| `phase-gate` | Validates phase completion before next phase starts | Phase transition | Auto (ancestry check) |
| `review-gate` | Large-size review of planning artifacts | PR: small → large | Manual (PR approval) |
| `merge-gate` | Validates workflow merged before next workflow starts | Workflow transition | Auto (ancestry check) |
| `deploy-gate` | Validates implementation ready for deployment | Post-P4 completion | Manual (checklist) |

---

## Gate Statuses

| Status | Meaning | Allows Progression |
|--------|---------|-------------------|
| `open` | Gate exists but not yet evaluated | No |
| `passed` | All validation criteria met | Yes |
| `passed_with_warnings` | Passed but with non-blocking issues | Yes (with advisory) |
| `blocked` | Validation failed, progression halted | No |
| `skipped` | Gate intentionally bypassed (requires override) | Yes (logged) |

### Status Transitions

```
open ──► passed
open ──► passed_with_warnings
open ──► blocked ──► passed (after remediation)
open ──► skipped (override only)
```

---

## Event Log Format (JSONL)

All events are appended to `_bmad-output/lens-work/event-log.jsonl`. Each line is a single JSON object.

### Base Event Schema

```json
{
  "ts": "ISO8601 timestamp",
  "event": "event-type",
  "initiative": "initiative_id",
  "actor": "user or agent name"
}
```

### Gate Events

#### gate-check

Logged when a gate is evaluated.

```json
{
  "ts": "2026-02-05T14:30:00-06:00",
  "event": "gate-check",
  "gate": "phase-p2",
  "gate_type": "phase-gate",
  "status": "passed",
  "initiative": "rate-limit-x7k2m9",
  "actor": "compass",
  "details": {
    "artifacts_checked": 3,
    "artifacts_passed": 3,
    "artifacts_warned": 0,
    "artifacts_failed": 0
  }
}
```

#### gate-blocked

Logged when a gate blocks progression.

```json
{
  "ts": "2026-02-05T14:30:00-06:00",
  "event": "gate-blocked",
  "gate": "phase-p2",
  "gate_type": "phase-gate",
  "status": "blocked",
  "initiative": "rate-limit-x7k2m9",
  "actor": "compass",
  "reason": "Required artifact missing: architecture.md",
  "remediation": "Complete /spec architecture workflow before proceeding to /plan"
}
```

#### gate-override

Logged when a gate is manually skipped.

```json
{
  "ts": "2026-02-05T14:30:00-06:00",
  "event": "gate-override",
  "gate": "review-gate",
  "gate_type": "review-gate",
  "status": "skipped",
  "initiative": "rate-limit-x7k2m9",
  "actor": "user",
  "reason": "Small initiative, large review not required",
  "override_by": "user"
}
```

### Lifecycle Events

#### init-initiative

```json
{"ts":"${ISO_TIMESTAMP}","event":"init-initiative","id":"${initiative_id}","layer":"${layer}","target":"${target_repo}"}
```

#### start-phase

```json
{"ts":"${ISO_TIMESTAMP}","event":"start-phase","phase":"p${phase_number}","phase_name":"${phase_name}","size":"${size}","initiative":"${initiative_id}"}
```

#### finish-phase

```json
{"ts":"${ISO_TIMESTAMP}","event":"finish-phase","phase":"${phase}","pr":"${pr_link}","initiative":"${initiative_id}"}
```

#### start-workflow

```json
{"ts":"${ISO_TIMESTAMP}","event":"start-workflow","workflow":"${workflow_name}","phase":"${phase}","size":"${size}","initiative":"${initiative_id}"}
```

#### finish-workflow

```json
{"ts":"${ISO_TIMESTAMP}","event":"finish-workflow","workflow":"${workflow_name}","pr":"${pr_link}","initiative":"${initiative_id}"}
```

---

## Gate Validation Rules

### Phase Gate (Auto)

Validates that a phase is complete before the next phase can begin.

```yaml
gate: phase-gate
validation:
  - check: ancestry
    command: "git merge-base --is-ancestor origin/${phase_branch} origin/${size_branch}"
    pass_if: exit_code == 0
    fail_message: "Phase ${phase} not merged into size. Complete all workflows and merge PR."

  - check: artifacts
    rule: "All required artifacts for phase exist and are non-empty"
    pass_if: all_artifacts_present == true
    fail_message: "Missing required artifacts for ${phase}. See artifact-validator output."

  - check: state
    rule: "state.yaml shows phase as complete"
    pass_if: current.phase > checked_phase
    fail_message: "State not updated. Run fix-state if needed."
```

### Merge Gate (Auto)

Validates that the previous workflow is merged before the next can start.

```yaml
gate: merge-gate
validation:
  - check: ancestry
    command: "git merge-base --is-ancestor origin/${prev_workflow_branch} origin/${phase_branch}"
    pass_if: exit_code == 0
    fail_message: "Previous workflow ${prev_workflow} not merged. Merge PR first."

  - check: no_active_workflow
    rule: "No other workflow branch active in this phase"
    pass_if: active_workflow_count == 0
    fail_message: "Another workflow is active. Finish it first."
```

### Review Gate (Manual)

Validates large review before final PBR.

```yaml
gate: review-gate
validation:
  - check: pr_approved
    rule: "PR from small → large has at least 1 approval"
    pass_if: pr_approvals >= 1
    fail_message: "Large review PR not approved. Request review."

  - check: no_changes_requested
    rule: "No outstanding change requests on PR"
    pass_if: changes_requested == 0
    fail_message: "Outstanding change requests. Address feedback."

  - check: conversations_resolved
    rule: "All PR conversations resolved"
    pass_if: open_conversations == 0
    warn_message: "Unresolved conversations on PR. Consider addressing before merge."
    severity: warning
```

### Deploy Gate (Manual)

Validates implementation readiness for deployment.

```yaml
gate: deploy-gate
validation:
  - check: all_stories_done
    rule: "All stories in stories.csv have status 'done'"
    pass_if: pending_stories == 0
    fail_message: "Stories not complete. ${pending_count} stories remaining."

  - check: tests_passing
    rule: "CI pipeline green on P4 branch"
    pass_if: ci_status == "green"
    fail_message: "CI pipeline failing. Fix tests before deploy."

  - check: retro_complete
    rule: "Retrospective document exists"
    pass_if: file_exists("p4-retro.md")
    warn_message: "No retrospective document. Consider running retro workflow."
    severity: warning
```

---

## Auto-Gate vs Manual-Gate Patterns

### Auto-Gate Pattern

Used by router workflows (Compass) at phase transitions. No user interaction required.

```yaml
# Router workflow Step 1 pattern
invoke: casey.check-gate
params:
  gate_type: phase-gate
  gate_name: "phase-p${prev_phase}"
  initiative_id: ${initiative_id}

if gate.status == "blocked":
  error: |
    ❌ Gate blocked: ${gate_name}
    └── ${gate.fail_message}
  exit: 1

if gate.status == "passed_with_warnings":
  warning: |
    ⚠️ Gate passed with warnings: ${gate_name}
    └── ${gate.warn_message}
  # Continue execution
```

### Manual-Gate Pattern

Used for review gates where human approval is required.

```yaml
# Present gate status to user
gate_status = evaluate_gate("review-gate")

output: |
  📋 Review Gate: ${gate_name}
  ├── PR Status: ${pr_status}
  ├── Approvals: ${approval_count}
  ├── Changes Requested: ${changes_requested}
  └── Status: ${gate_status}

if gate_status == "blocked":
  output: |
    Action required:
    1. Address PR feedback
    2. Get large review approval
    3. Re-run /review to check gate
```

---

## State Integration

Gates are tracked in `state.yaml` under the `gates` array:

```yaml
gates:
  - name: "phase-p1"
    type: "phase-gate"
    status: "passed"
    checked_at: "2026-02-03T10:00:00Z"
    passed_at: "2026-02-03T10:00:00Z"

  - name: "merge-gate/p2/w/prd"
    type: "merge-gate"
    status: "passed"
    checked_at: "2026-02-04T14:00:00Z"
    passed_at: "2026-02-04T14:00:00Z"
    pr_link: "https://github.com/org/repo/pull/42"

  - name: "review-gate"
    type: "review-gate"
    status: "open"
    checked_at: "2026-02-05T09:00:00Z"
```

---

## Related Includes

- **size-topology.md** — Branch structure that gates protect
- **artifact-validator.md** — Artifact checks invoked by phase gates
- **pr-links.md** — PR URL generation for gate PRs
