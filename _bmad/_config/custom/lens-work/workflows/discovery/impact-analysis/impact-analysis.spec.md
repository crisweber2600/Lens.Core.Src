# Workflow Specification: impact-analysis

**Module:** lens-work  
**Agent:** Scout  
**Status:** Implemented

---

## Purpose

Assess cross-boundary change impact across domains, services, and repositories.

---

## Entry Metadata

```yaml
name: impact-analysis
description: Analyze cross-boundary impacts for proposed changes
agent: scout
category: discovery
```

---

## Required Behaviors

- Capture scope (paths, commits, modules, or initiative context).
- Use service and inventory data:
  - `_bmad/lens-work/service-map.yaml`
  - `_bmad-output/lens-work/repo-inventory.yaml`
- Produce direct and indirect impact findings with risk indicators.
