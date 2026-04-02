---
name: resume-epic
description: Resume a paused initiative with re-sensing and state validation
agent: "@lens"
trigger: /resume-epic command
category: utility
phase_name: utility
display_name: Resume Epic
entryStep: './steps/step-01-preflight.md'
inputs: []
---

# /resume-epic — Resume Initiative Workflow

**Goal:** Resume a paused initiative, clearing the pause state and optionally re-running cross-initiative sensing to detect conflicts that arose during the pause.

**Your Role:** Validate the initiative is paused, clear pause metadata, and run a quick sensing pass to detect new overlaps.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1: Preflight + validate paused state
- Step 2: Clear pause + re-sense
- Step 3: Report and recommend next action

---

## INITIALIZATION

### Workflow References

- `preflight_include = ../../includes/preflight.md`

---

## EXECUTION

Follow the entry step file specified by `entryStep`.
