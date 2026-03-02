# Workflow Specification: compliance-check

**Module:** lens-work  
**Skill:** @lens/constitution  
**Status:** Implemented

---

## Purpose

Evaluate artifacts against resolved constitutional rules and produce PASS/WARN/FAIL per article.

---

## Entry Metadata

```yaml
name: compliance-check
description: Evaluate artifact compliance against constitutional governance rules
agent: "@lens/constitution"
category: governance
```

---

## Required Behaviors

- Accept artifact path/type as input.
- Resolve accumulated rules through `resolve-constitution`.
- Handle empty governance state gracefully with "No rules defined".
- Emit `compliance-evaluated` via state-management skill with pass/warn/fail counts.
- Require `initiative_id` for compliance events.
