# Workflow Specification: pre-plan

**Module:** lens
**Status:** Placeholder — To be created via create-workflow workflow
**Created:** 2026-02-17

---

## Workflow Overview

**Goal:** Guide users through brainstorming, discovery, and vision setting for an initiative.

**Description:** The pre-plan phase is the first active lifecycle phase. It routes users into CIS brainstorming workshops and BMM pre-planning workflows, while Lens manages state, branches, and governance.

**Workflow Type:** Phase command (user-facing)

---

## Workflow Structure

### Entry Point

```yaml
---
name: pre-plan
description: Brainstorming, discovery, and vision setting
web_bundle: true
installed_path: '{project-root}/_bmad/lens/workflows/phase/pre-plan'
---
```

### Mode

- [x] Create-only (steps-c/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Validate State | Check active initiative exists, phase is valid for pre-plan |
| 2 | Create Phase Branch | Create -p1 branch via git-orchestration skill |
| 3 | Route to BMM | Invoke CIS brainstorming → BMM pre-planning workflows |
| 4 | Collect Artifacts | Verify brainstorm notes, vision doc created |
| 5 | Update State | Mark pre-plan gate as passed, log event |

---

## Workflow Inputs

### Required Inputs
- Active initiative in state.yaml
- Initiative type (domain/service/feature)

### Optional Inputs
- Discovery depth override
- Brainstorming template preference

---

## Workflow Outputs

### Output Files
- Vision document
- Brainstorm notes
- Updated state.yaml (pre-plan gate → passed)
- Event log entries

---

## Agent Integration

### Primary Agent
@lens — routes through skills

### Skills Invoked
- state-management (read/write)
- git-orchestration (create phase branch)
- constitution (validate at each step)
- checklist (generate pre-plan checklist)

### External Routing
- CIS brainstorming workflows
- BMM pre-planning workflows

---

_Spec created on 2026-02-17 via BMAD Module workflow_
