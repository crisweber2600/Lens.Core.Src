# Workflow Specification: switch-context

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Switch the active initiative context.

**Description:** When users run `/switch`, this workflow shows available initiatives, lets the user select one, updates state.yaml to reflect the new active initiative, and checks out the appropriate branch.

**Workflow Type:** Initiative command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | List Initiatives | Show all known initiatives from state/initiatives dir |
| 2 | Select Initiative | User picks target initiative |
| 3 | Load Initiative State | Read initiative config and current phase |
| 4 | Switch Branch | Checkout the initiative's current branch |
| 5 | Update State | Set active_initiative in state.yaml |
| 6 | Log Event | Append context_switch to event log |
| 7 | Confirm | Show new context and current phase |

---

## Skills Invoked
- state-management (read/write), git-orchestration (checkout)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
