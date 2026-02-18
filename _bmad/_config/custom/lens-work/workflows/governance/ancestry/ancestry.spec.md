# Workflow Specification: ancestry

**Module:** lens-work  
**Agent:** Scribe  
**Status:** Implemented

---

## Purpose

Display constitutional inheritance lineage and governance metadata for the active scope.

---

## Entry Metadata

```yaml
name: ancestry
description: Display constitution inheritance chain with governance metadata
agent: scribe
category: governance
```

---

## Required Behaviors

- Walk hierarchy Domain -> Service -> Microservice -> Feature.
- Show article counts and ratification/amendment metadata by layer.
- Handle empty ancestry chains gracefully (informative message, no hard failure).
