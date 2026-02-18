# Workflow Specification: status

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Display current initiative state, phase, branches, and checklist summary.

**Description:** When users run `/status`, this workflow reads state.yaml and presents a concise view of the current initiative, active phase, branch topology, checklist progress, and any background errors.

**Workflow Type:** Utility command (user-facing, read-only)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read State | Load state.yaml |
| 2 | Format Output | Compact display: initiative, phase, checklist summary |
| 3 | Show Errors | If background_errors exist, display them |
| 4 | Suggest Next | Show the next logical command |

---

## Skills Invoked
- state-management (read only)
- checklist (compact display)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
