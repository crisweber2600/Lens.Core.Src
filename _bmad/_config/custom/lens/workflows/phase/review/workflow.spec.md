# Workflow Specification: review

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Run implementation readiness checks and gate validation.

**Description:** The review phase is unique — it doesn't route to another module. Instead, it runs Lens's own readiness checks: checklist validation, constitution compliance, artifact completeness, and branch topology verification. This is the gate between planning and implementation.

**Workflow Type:** Phase command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check story-gen gate passed |
| 2 | Load Checklist | Display full expanded checklist for all phases |
| 3 | Artifact Check | Verify all required artifacts exist |
| 4 | Constitution Check | Run full governance compliance scan |
| 5 | Branch Topology Check | Verify all expected branches exist and are clean |
| 6 | Readiness Report | Generate readiness report with pass/fail/warn |
| 7 | Gate Decision | If all pass → open dev gate; if fail → show blockers |
| 8 | Update State | Mark review gate, log event |

---

## Key Differentiator

Unlike other phase commands that route to external module workflows, `/Review` is a **Lens-native workflow**. It runs the checklist skill, constitution skill, and git-orchestration skill together to produce a comprehensive readiness assessment.

---

## Skills Invoked
- state-management (read all phase states)
- checklist (full validation)
- constitution (full compliance scan)
- git-orchestration (topology check)

## External Routing
- TEA quality gate workflows (optional)

---

_Spec created on 2026-02-17 via BMAD Module workflow_
