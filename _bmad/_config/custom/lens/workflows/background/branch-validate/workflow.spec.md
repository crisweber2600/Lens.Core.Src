# Workflow Specification: branch-validate (Background)

**Module:** lens
**Status:** Placeholder
**Created:** 2026-02-17
**Type:** Background (auto-triggered, not user-invoked)

---

## Purpose

Verifies branch topology integrity against expected patterns from module.yaml.

## Triggers
- phase_transition
- initiative_create (create topology)

## Behavior
- List actual branches matching featureBranchRoot pattern
- Compare against expected topology (root, audiences, phases)
- Report mismatches to background_errors in state

---

_Spec created on 2026-02-17 via BMAD Module workflow_
