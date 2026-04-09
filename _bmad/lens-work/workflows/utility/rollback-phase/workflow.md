---
name: rollback-phase
description: Safely revert the current initiative to a previous milestone phase
agent: "@lens"
trigger: /rollback-phase command
category: utility
phase_name: utility
display_name: Rollback Phase
entryStep: './steps/step-01-preflight.md'
inputs:
  target_phase:
    description: The phase to roll back to (e.g., businessplan, techplan)
    required: false
    default: ""
---

# /rollback-phase — Phase Rollback Workflow

**Goal:** Safely revert the current initiative to a previous milestone phase, resetting `initiative-state.yaml` while preserving all git history and artifacts.

**Your Role:** Act as a safety-first rollback operator. Validate the request is valid, confirm with the user before executing, and ensure no data loss.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1: Preflight + validate current state
- Step 2: Confirm rollback target with user
- Step 3: Execute rollback (update initiative-state.yaml, no branch deletion)

State persists through `current_initiative_root`, `current_phase`, `target_phase`, `rollback_plan`.

---

## SAFETY CONSTRAINTS

- **Never delete branches.** Rollback only modifies `initiative-state.yaml`.
- **Always confirm** the rollback target with the user before executing.
- **Preserve all artifacts.** Prior phase outputs remain in `docs/`.
- **Open PRs block rollback.** If a promotion PR is open, it must be closed first.

---

## INITIALIZATION

### Configuration Loading

Load the lens-work session context already provided by `@lens` and resolve:

- `{user_name}`
- `{communication_language}`

### Workflow References

- `preflight_include = ../../includes/preflight.md`
- `lifecycle_contract = ../../../lifecycle.yaml`

---

## EXECUTION

Follow the entry step file specified by `entryStep`.
