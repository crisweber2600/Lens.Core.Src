# Workflow Specification: fix-state

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Repair corrupted state using the event log as source of truth.

**Description:** When users run `/fix`, this workflow reads event-log.jsonl, reconstructs the last known good state, and writes a repaired state.yaml.

**Workflow Type:** Utility command (user-facing, idempotent)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Read Event Log | Load event-log.jsonl |
| 2 | Reconstruct | Rebuild state from events |
| 3 | Validate | Check reconstructed state against git branches |
| 4 | Write State | Replace state.yaml with reconstructed version |
| 5 | Log Event | Append state_fixed to event log |
| 6 | Report | Show what was reconstructed |

---

## Skills Invoked
- state-management (read event log, write state), git-orchestration (validate)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
