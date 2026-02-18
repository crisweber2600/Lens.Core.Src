# Workflow Specification: lens-sync

**Module:** lens-work
**Status:** Implemented
**Created:** 2026-01-30

---

## Workflow Overview

**Goal:** Reconcile drift between discovered and documented architecture.

**Description:** Compare codebase structure with domain map and propose updates.

**Workflow Type:** Feature (Post-MVP1)

---

## Workflow Structure

### Entry Point

```yaml
---
name: lens-sync
description: Reconcile architectural drift
web_bundle: true
installed_path: '{project-root}/_bmad/lens-work/workflows/lens-sync'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Discover structure | Scan services and microservices |
| 2 | Compare maps | Identify gaps and mismatches |
| 3 | Apply updates | Update domain map with approvals |

---

## Workflow Inputs

### Required Inputs

- None

### Optional Inputs

- `scan_paths`

---

## Workflow Outputs

### Output Format

- [ ] Document-producing
- [x] Non-document

### Output Files

- `_bmad/lens-work/domain-map.yaml`

---

## Agent Integration

### Primary Agent

Compass

### Other Agents

None

---

## Implementation Notes

Implemented in `workflow.md` and `steps-c/`.

---

_Spec created on 2026-01-30 via BMAD Module workflow_
