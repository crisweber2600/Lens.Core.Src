# Workflow Specification: discover

**Module:** lens-work
**Status:** Implemented
**Created:** 2026-01-31

---

## Workflow Overview

**Goal:** Perform full brownfield discovery and generate BMAD-ready documentation.

**Description:** Analyze codebase, extract business context, and generate documentation artifacts.

**Workflow Type:** Core

---

## Workflow Structure

### Entry Point

```yaml
---
name: discover
description: Full brownfield discovery and documentation pipeline
web_bundle: true
installed_path: '{project-root}/_bmad/lens-work/workflows/discover'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Select target | Choose domain/service/microservice |
| 2 | Extract context | Parse git history and JIRA references |
| 3 | Analyze codebase | Detect stack, APIs, data, integrations |
| 4 | Generate docs | Create architecture and onboarding docs |
| 5 | Update lens metadata | Write summaries and report |

---

## Workflow Inputs

### Required Inputs

- `target_projects_path`
- `discovery_depth`

### Optional Inputs

- `enable_jira_integration`
- JIRA credentials

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `{docs_output_path}/{domain}/{service}/architecture.md`
- `{docs_output_path}/{domain}/{service}/api-surface.md`
- `{docs_output_path}/{domain}/{service}/data-model.md`
- `{docs_output_path}/{domain}/{service}/integration-map.md`
- `{docs_output_path}/{domain}/{service}/onboarding.md`

---

## Agent Integration

### Primary Agent

Scout

### Other Agents

Bridge (target alignment)
Link (propagation)

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

---

_Spec created on 2026-01-31 via BMAD Module workflow_
