# Workflow Specification: resume

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Resume an interrupted workflow from its last checkpoint.

**Description:** When users run `/resume`, this workflow reads the last workflow event from event-log.jsonl, determines where it was interrupted, and resumes execution from that point.

**Workflow Type:** Utility command (user-facing, idempotent)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read State | Check workflow_status for error/running |
| 2 | Find Last Event | Read last workflow_start event from event log |
| 3 | Determine Resume Point | Identify the workflow and step to resume from |
| 4 | Resume | Re-invoke the interrupted workflow from the checkpoint |

---

## Skills Invoked
- state-management (read event log, update workflow_status)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
