# Workflow Specification: archive

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Archive a completed initiative.

**Description:** When users run `/archive`, this workflow moves the initiative's state and artifacts to the archive directory, clears the active_initiative, and logs the archival event.

**Workflow Type:** Utility command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate | Confirm initiative exists and user wants to archive |
| 2 | Move Artifacts | Copy initiative files to archive directory |
| 3 | Clear State | Remove initiative from active state |
| 4 | Log Event | Append initiative_archived to event log |
| 5 | Confirm | Show archived location and next steps |

---

## Skills Invoked
- state-management (clear active initiative, log event)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
