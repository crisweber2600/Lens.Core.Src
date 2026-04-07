---
name: pause-epic
description: Suspend an in-flight epic without losing state
agent: "@lens"
trigger: /pause-epic command
category: utility
phase_name: utility
display_name: Pause Epic
entryStep: './steps/step-01-preflight.md'
inputs:
  reason:
    description: Reason for pausing (optional, recorded in state)
    required: false
    default: ""
---

# /pause-epic — Pause Initiative Workflow

**Goal:** Suspend the current initiative, recording pause state in `initiative-state.yaml` without modifying branches or deleting any artifacts.

**Your Role:** Record the pause with a timestamp and optional reason, then confirm the state change.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1: Preflight + validate pause eligibility
- Step 2: Execute pause (update initiative-state.yaml)

---

## SAFETY CONSTRAINTS

- **Never delete branches or artifacts.**
- **Record pause reason and timestamp** for audit trail.
- **Open PRs are noted** but do not block pausing.

---

## INITIALIZATION

### Workflow References

- `preflight_include = ../../includes/preflight.md`

---

## EXECUTION

Follow the entry step file specified by `entryStep`.
