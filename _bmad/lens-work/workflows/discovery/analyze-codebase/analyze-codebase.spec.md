# Workflow Specification: analyze-codebase

**Module:** lens-work
**Status:** Implemented
**Created:** 2026-01-31

---

## Workflow Overview

**Goal:** Deep technical analysis of an existing codebase without full discovery.

**Description:** Inspect stack, APIs, data models, and integrations to produce a focused analysis summary.

**Workflow Type:** Core

---

## Workflow Structure

### Entry Point

```yaml
---
name: analyze-codebase
description: Deep technical analysis without full discovery
web_bundle: true
installed_path: '{project-root}/_bmad/lens-work/workflows/analyze-codebase'
---
```

### Mode

- [x] Create-only (steps-c/)
- [ ] Tri-modal (steps-c/, steps-e/, steps-v/)

---

## Planned Steps

| Step | Name | Goal |
|------|------|------|
| 1 | Select target | Choose repo or microservice |
| 2 | Inspect stack | Detect languages, frameworks, runtime |
| 3 | Map surfaces | Identify APIs, data, integrations |
| 4 | Summarize findings | Produce analysis summary |

---

## Workflow Inputs

### Required Inputs

- `target_projects_path`
- `discovery_depth`

### Optional Inputs

- `enable_jira_integration`

---

## Workflow Outputs

### Output Format

- [x] Document-producing
- [ ] Non-document

### Output Files

- `{docs_output_path}/{domain}/{service}/analysis-summary.md`

---

## Agent Integration

### Primary Agent

Scout

### Other Agents

Bridge (target alignment)

---

## Implementation Notes

**Use the create-workflow workflow to build this workflow.**

---

_Spec created on 2026-01-31 via BMAD Module workflow_
