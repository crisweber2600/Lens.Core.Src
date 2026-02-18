# Workflow Specification: constitution-check (Background)

**Module:** lens
**Status:** Placeholder
**Created:** 2026-02-17
**Type:** Background (auto-triggered, not user-invoked)

---

## Purpose

Runs inline governance validation at every workflow step via the constitution skill.

## Triggers
- workflow_start
- phase_transition

## Behavior
- Load governance rules for current phase/step
- Validate current state against rules
- Advisory mode: log warnings, continue
- Enforced mode: block on critical violations
- Append check results to event log

---

_Spec created on 2026-02-17 via BMAD Module workflow_
