# Workflow Specification: init-initiative

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Create a new initiative (domain, service, or feature) with branch topology and state initialization.

**Description:** When users run `/new`, this workflow asks for initiative type, name, and audience configuration, then creates the branch topology (root + audience branches), initializes state, and logs the creation event.

**Workflow Type:** Initiative command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Gather Initiative Info | Ask: type (domain/service/feature), name, parent |
| 2 | Configure Audiences | Ask which audiences to use (default from config) |
| 3 | Build featureBranchRoot | Compute flat branch name from hierarchy |
| 4 | Create Branches | Create root + audience branches via git-orchestration |
| 5 | Initialize State | Write initiative to state.yaml |
| 6 | Log Event | Append initiative_created to event log |
| 7 | Confirm | Show created branches and next steps |

---

## Skills Invoked
- state-management (initialize), git-orchestration (create branches), constitution (validate)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
