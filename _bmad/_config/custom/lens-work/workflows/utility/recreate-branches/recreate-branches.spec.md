# Workflow Specification: recreate-branches

**Module:** lens-work  
**Agent:** Casey  
**Status:** Implemented

---

## Purpose

Recreate missing initiative branches from persisted state for recovery scenarios.

---

## Entry Metadata

```yaml
name: recreate-branches
description: Recreate missing initiative branches from persisted state
agent: casey
category: utility
```

---

## Required Behaviors

- Read initiative topology from `_bmad-output/lens-work/initiatives/{id}.yaml`.
- Detect missing branches in local and remote refs.
- Recreate branches using canonical pattern:
  - `{featureBranchRoot}-{audience}-p{phase_number}`
- Never use legacy archive branch patterns.
- Log recovery operations via Tracey.
