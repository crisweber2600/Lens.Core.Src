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
| `audience-promotion-gate` | Validates audience promotion readiness | Audience boundary crossing | Manual (PR approval + review) |
| `adversarial-review-gate` | Party-mode cross-agent review | small → medium promotion | Manual (party-mode) |
| `stakeholder-approval-gate` | Stakeholder sign-off on planning | medium → large promotion | Manual (approval) |
| `constitution-gate` | Constitutional compliance for base merge | large → base promotion | Auto (Scribe) |
| `merge-gate` | Validates workflow merged before next workflow starts | Workflow transition | Auto (ancestry check) |
| `deploy-gate` | Validates implementation ready for deployment | Post-sprintplan completion | Manual (checklist) |

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
  "gate": "phase-businessplan",
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
  "gate": "phase-businessplan",
  "gate_type": "phase-gate",
  "status": "blocked",
  "initiative": "rate-limit-x7k2m9",
  "actor": "compass",
  "reason": "Required artifact missing: techplan-architecture.md",
  "remediation": "Complete /businessplan workflows before proceeding to /techplan"
}
```

#### gate-override

Logged when a gate is manually skipped.

```json
{
  "ts": "2026-02-05T14:30:00-06:00",
  "event": "gate-override",
  "gate": "audience-promotion-gate",
  "gate_type": "audience-promotion-gate",
  "status": "skipped",
  "initiative": "rate-limit-x7k2m9",
  "actor": "user",
  "reason": "Small initiative, audience promotion review not required",
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
{"ts":"${ISO_TIMESTAMP}","event":"start-phase","phase":"${phase_name}","audience":"${audience}","initiative":"${initiative_id}"}
```

#### finish-phase

```json
{"ts":"${ISO_TIMESTAMP}","event":"finish-phase","phase":"${phase}","pr":"${pr_link}","initiative":"${initiative_id}"}
```

#### start-workflow

```json
{"ts":"${ISO_TIMESTAMP}","event":"start-workflow","workflow":"${workflow_name}","phase":"${phase_name}","audience":"${audience}","initiative":"${initiative_id}"}
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
    command: "git merge-base --is-ancestor origin/${phase_branch} origin/${audience_branch}"
    pass_if: exit_code == 0
    fail_message: "Phase ${phase_name} not merged into audience branch. Complete all workflows and merge PR."

  - check: artifacts
    rule: "All required artifacts for phase exist and are non-empty"
    pass_if: all_artifacts_present == true
    fail_message: "Missing required artifacts for ${phase}. See artifact-validator output."

  - check: state
    rule: "state.yaml shows phase as complete"
    pass_if: phase_status[checked_phase] == "complete"
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

### Audience Promotion Gate (Manual)

Validates audience promotion readiness at each boundary.

```yaml
gate: audience-promotion-gate
validation:
  # small → medium: adversarial review (party mode)
  - check: adversarial_review
    rule: "Party-mode cross-agent review completed"
    pass_if: party_mode_review == "completed"
    fail_message: "Adversarial review not completed. Run /promote to initiate."
    applies_to: "small-to-medium"

  # medium → large: stakeholder approval
  - check: stakeholder_approval
    rule: "PR from medium → large has stakeholder approval"
    pass_if: pr_approvals >= 1
    fail_message: "Stakeholder approval not received. Request review."
    applies_to: "medium-to-large"

  # large → base: constitution gate (Scribe)
  - check: constitution_compliance
    rule: "Constitutional compliance check passed"
    pass_if: compliance_status == "COMPLIANT"
    fail_message: "Constitutional compliance failed. Run /compliance to review."
    applies_to: "large-to-base"

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
    pass_if: file_exists("dev-retro.md")
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
  gate_name: "phase-${prev_phase_name}"
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
    2. Get audience promotion approval
    3. Re-run /promote to check gate
```

---

## State Integration

Gates are tracked in `state.yaml` under the `gates` array:

```yaml
gates:
  - name: "phase-preplan"
    type: "phase-gate"
    status: "passed"
    checked_at: "2026-02-03T10:00:00Z"
    passed_at: "2026-02-03T10:00:00Z"

  - name: "merge-gate/businessplan/w/prd"
    type: "merge-gate"
    status: "passed"
    checked_at: "2026-02-04T14:00:00Z"
    passed_at: "2026-02-04T14:00:00Z"
    pr_link: "https://github.com/org/repo/pull/42"

  - name: "audience-promotion/small-to-medium"
    type: "audience-promotion-gate"
    status: "open"
    checked_at: "2026-02-05T09:00:00Z"
```

---

## Related Includes

- **size-topology.md** — Branch structure that gates protect
- **artifact-validator.md** — Artifact checks invoked by phase gates
- **pr-links.md** — PR URL generation for gate PRs
