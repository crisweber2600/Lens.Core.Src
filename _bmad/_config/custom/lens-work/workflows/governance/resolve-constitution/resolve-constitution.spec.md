# Workflow Specification: resolve-constitution

**Module:** lens-work  
**Agent:** Scribe  
**Status:** Implemented

---

## Purpose

Resolve constitutional inheritance parent-first and return accumulated rules for current context.

---

## Entry Metadata

```yaml
name: resolve-constitution
description: Resolve accumulated constitutional rules from inheritance hierarchy
agent: scribe
category: governance
```

---

## Required Behaviors

- Resolve order: Domain -> Service -> Microservice -> Feature.
- Skip missing layers gracefully.
- Detect contradictions and surface conflict details.
- Emit `constitution-resolved` via Tracey with layers walked and article totals.
