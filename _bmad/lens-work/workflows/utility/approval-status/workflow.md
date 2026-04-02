---
name: approval-status
description: Show pending promotion PR approval state, review status, and blocking checks
agent: "@lens"
trigger: /approval-status command
category: utility
phase_name: utility
display_name: Approval Status
entryStep: './steps/step-01-preflight.md'
inputs: []
---

# /approval-status — PR Approval Status Workflow

**Goal:** Surface the current approval state of all pending promotion PRs for the active initiative (or all initiatives), including reviewer assignments, check statuses, and blocking conditions.

**Your Role:** Act as a read-only PR status aggregator. Query git provider metadata and render a clear summary of what is blocking merge and what has been approved.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1: Shared preflight + context initialization
- Step 2: Query PR status for all promotion branches
- Step 3: Render approval report

State persists through `current_initiative_root`, `pr_entries`, and `approval_rows`.

---

## INITIALIZATION

### Configuration Loading

Load the lens-work session context already provided by `@lens` and resolve:

- `{user_name}`
- `{communication_language}`

### Workflow References

- `preflight_include = ../../includes/preflight.md`

---

## EXECUTION

Follow the entry step file specified by `entryStep`.
