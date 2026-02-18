# Workflow Specification: bootstrap

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Initialize BMAD structure in a target repository.

**Description:** When users run `/bootstrap`, this workflow creates the BMAD directory structure (_bmad/, _bmad-output/) in a selected target repo and runs initial configuration.

**Workflow Type:** Discovery command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Select Repo | Show discovered repos, let user pick target |
| 2 | Validate | Check repo doesn't already have BMAD structure |
| 3 | Create Structure | Initialize _bmad/ and _bmad-output/ dirs |
| 4 | Configure | Set up basic config for the target repo |
| 5 | Report | Show what was created and next steps |

---

## Skills Invoked
- discovery (bootstrapping)
- state-management (log event)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
