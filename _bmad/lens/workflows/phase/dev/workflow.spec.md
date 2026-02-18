# Workflow Specification: dev

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Guide users through the implementation loop — coding, testing, PRs.

**Description:** The dev phase routes into BMM development workflows. Lens manages workflow branches, enforces git discipline (targeted commits, clean working directory), and tracks implementation progress via checklists.

**Workflow Type:** Phase command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check review gate passed |
| 2 | Create/Checkout Workflow Branch | Workflow branch via git-orchestration |
| 3 | Route to BMM | Invoke BMM dev-story workflow |
| 4 | Track Progress | Update checklist as code/tests complete |
| 5 | PR Flow | Create PR, manage merge flow |
| 6 | Update State | Mark dev progress, log event |

---

## Skills Invoked
- state-management, git-orchestration, constitution, checklist

## External Routing
- BMM development workflows (dev-story, code-review)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
