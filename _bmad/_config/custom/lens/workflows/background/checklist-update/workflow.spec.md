# Workflow Specification: checklist-update (Background)

**Module:** lens
**Status:** Placeholder
**Created:** 2026-02-17
**Type:** Background (auto-triggered, not user-invoked)

---

## Purpose

Updates progressive checklist state in state.yaml after workflow operations.

## Triggers
- workflow_end
- phase_transition

## Behavior
- Check which artifacts were produced by the completed workflow
- Auto-mark corresponding checklist items as done
- Update checklist summary counts
- Generate new checklist items when entering a new phase

---

_Spec created on 2026-02-17 via BMAD Module workflow_
