# Workflow Specification: tech-plan

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Guide users through architecture and technical design.

**Description:** The tech-plan phase routes into BMM architecture workflows. Lens manages branch topology, validates that plan gate has passed, and enforces governance.

**Workflow Type:** Phase command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check plan gate passed |
| 2 | Create/Checkout Phase Branch | Phase branch via git-orchestration |
| 3 | Route to BMM | Invoke BMM architecture workflows |
| 4 | Collect Artifacts | Verify architecture doc, tech decisions, API contracts |
| 5 | Update State | Mark tech-plan gate, log event |

---

## Skills Invoked
- state-management, git-orchestration, constitution, checklist

## External Routing
- BMM architecture workflows

---

_Spec created on 2026-02-17 via BMAD Module workflow_
