# Workflow Specification: override-state

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Manually override state fields (advanced, use with caution).

**Description:** When users run `/override`, this workflow allows direct modification of state.yaml fields. Intended for situations where automated recovery (/sync, /fix) is insufficient.

**Workflow Type:** Utility command (user-facing, advanced)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read State | Load current state.yaml |
| 2 | Show Current | Display current state values |
| 3 | Get Override | Ask user which field(s) to override and new values |
| 4 | Confirm | Show changes before applying |
| 5 | Apply | Write updated state.yaml |
| 6 | Log Event | Append state_overridden to event log |
| 7 | Warn | Remind user that manual overrides bypass validation |

---

## Skills Invoked
- state-management (read/write)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
