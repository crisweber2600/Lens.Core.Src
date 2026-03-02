# Workflow Specification: domain-map

**Module:** lens-work  
**Skill:** @lens/discovery  
**Status:** Implemented

---

## Purpose

Load, edit, and persist the domain architecture map at `_bmad-output/lens-work/domain-map.yaml`.

---

## Entry Metadata

```yaml
name: domain-map
description: View and edit the domain architecture map
agent: "@lens/discovery"
category: discovery
```

---

## Required Behaviors

- Initialize map when file is missing.
- Support create/view/update/delete operations.
- Save to `_bmad-output/lens-work/domain-map.yaml`.
- Run clean-state check through git-orchestration skill before mutation.
