# Workflow Specification: sync-state

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Reconcile state.yaml with git branch reality.

**Description:** When users run `/sync`, this workflow compares the state file against actual git branches, identifies drift, and repairs the state to match reality.

**Workflow Type:** Utility command (user-facing, idempotent)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read State | Load current state.yaml |
| 2 | Read Git | List actual branches matching initiative patterns |
| 3 | Compare | Identify mismatches between state and git |
| 4 | Repair | Update state to match git reality |
| 5 | Log Event | Append state_synced to event log |
| 6 | Report | Show what was found and fixed |

---

## Skills Invoked
- state-management (read/write), git-orchestration (list branches)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
