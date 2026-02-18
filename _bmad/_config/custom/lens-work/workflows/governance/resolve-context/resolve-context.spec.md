# Workflow Specification: resolve-context

**Module:** lens-work  
**Agent:** Scribe  
**Status:** Implemented (internal)

---

## Purpose

Generate `constitutional_context` values for workflows that need resolved governance state.

---

## Entry Metadata

```yaml
name: resolve-context
description: Internal workflow to resolve constitutional context variables
agent: scribe
category: governance
trigger: internal
```

---

## Output Contract

```yaml
constitutional_context:
  resolved_constitution: object | null
  constitution_chain: array
  constitution_article_count: integer
  constitution_last_amended: string | null
  constitution_depth: integer
```

If no constitutions exist, returns the same shape with `status: no_constitution`.
