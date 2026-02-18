# Workflow Specification: story-gen

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Generate implementation stories from architecture.

**Description:** The story-gen phase routes into BMM story generation workflows. Lens validates that tech-plan gate has passed, manages branches, and tracks generated stories via checklist.

**Workflow Type:** Phase command (user-facing)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check tech-plan gate passed |
| 2 | Create/Checkout Phase Branch | Phase branch via git-orchestration |
| 3 | Route to BMM | Invoke BMM story generation workflows |
| 4 | Collect Artifacts | Verify stories generated, estimates added |
| 5 | Update State | Mark story-gen gate, log event |

---

## Skills Invoked
- state-management, git-orchestration, constitution, checklist

## External Routing
- BMM story generation workflows

---

_Spec created on 2026-02-17 via BMAD Module workflow_
