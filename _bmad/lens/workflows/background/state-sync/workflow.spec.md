# Workflow Specification: state-sync (Background)

**Module:** lens
**Status:** Placeholder
**Created:** 2026-02-17
**Type:** Background (auto-triggered, not user-invoked)

---

## Purpose

Validates state.yaml against git branch reality at workflow boundaries.

## Triggers
- workflow_start (read mode)
- workflow_end (write mode)
- phase_transition (read + write)
- initiative_create (initialize)
- error (mark error)

## Behavior
- On read: Load state.yaml, verify active branch exists
- On write: Update workflow_status, phase, timestamps
- On error: Set workflow_status to "error", append to background_errors

---

_Spec created on 2026-02-17 via BMAD Module workflow_
