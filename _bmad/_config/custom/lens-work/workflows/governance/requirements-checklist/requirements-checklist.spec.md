# Workflow Specification: requirements-checklist

**Module:** lens-work  
**Agent:** Scribe  
**Status:** Implemented

---

## Purpose

Generate quality checklists for planning artifacts across 5 dimensions (Completeness, Clarity, Consistency, Measurability, Coverage) using constitutional context for governance-aware evaluation.

---

## Entry Metadata

```yaml
name: requirements-checklist
description: Generate quality checklists for planning artifacts with constitutional governance awareness
agent: scribe
category: governance
```

---

## Required Parameters

- `artifact_path` — Path to the artifact to evaluate
- `artifact_type` — One of: product-brief, prd, architecture, epics, stories
- `constitutional_context` — Resolved constitutional context (may be null)

---

## Required Behaviors

- Accept artifact path/type as input or interactively select.
- Generate checklist items across 5 dimensions: Completeness, Clarity, Consistency, Measurability, Coverage.
- Items follow "Are [X] defined/specified for [Y]?" pattern — never "Verify that X works."
- Generate constitutional governance items when `constitutional_context` is available.
- Store checklists at `_bmad-output/lens-work/constitutions/{layer}/{name}/checklists/{domain}.md`.
- Fall back to root domain constitution when no leaf-specific constitution exists.
- Emit `checklist-evaluated` event through Tracey with pass/fail counts.
- Handle null/missing `constitutional_context` gracefully (skip constitutional items).
- Each dimension generates at least 3 context-specific items derived from the artifact content.
- Items are artifact-type-aware (PRD items differ from architecture items differ from story items).
- Checklist storage is idempotent — re-evaluation overwrites previous result.
