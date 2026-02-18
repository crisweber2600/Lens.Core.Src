# Workflow Specification: plan

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Guide users through product requirements, epics, and feature definition.

**Description:** The plan phase routes users into BMM product planning workflows. Lens manages phase transitions, branch operations, and gate validation.

**Workflow Type:** Phase command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check pre-plan gate passed, phase is valid |
| 2 | Create/Checkout Phase Branch | Phase branch via git-orchestration |
| 3 | Route to BMM | Invoke BMM planning workflows (PRD, epics, stories) |
| 4 | Collect Artifacts | Verify PRD, epics, acceptance criteria created |
| 5 | Update State | Mark plan gate, log event |

---

## Skills Invoked
- state-management, git-orchestration, constitution, checklist

## External Routing
- BMM product planning workflows

---

_Spec created on 2026-02-17 via BMAD Module workflow_
