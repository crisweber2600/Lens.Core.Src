# Workflow Specification: resolve-constitution

**Module:** lens-work  
**Skill:** @lens/constitution  
**Status:** Implemented

---

## Purpose

Resolve constitutional inheritance parent-first and return accumulated rules for current context.

---

## Entry Metadata

```yaml
name: resolve-constitution
description: Resolve accumulated constitutional rules from inheritance hierarchy
agent: "@lens/constitution"
category: governance
```

---

## Required Behaviors

- Resolve order: `[org, domain, service, repo]` per constitution skill Part 3 (Hierarchy Loading).
- Skip missing layers gracefully (skill Part 9 Edge Cases).
- Detect contradictions and surface conflict details.
- Emit `constitution-resolved` via state-management skill with layers walked and article totals.
- **All path resolution, parsing, and merging delegated to constitution skill — NO runtime JS lib calls.**

## Implementation

All loading, parsing, merging, and display logic is fully defined in:
`_bmad/lens-work/skills/constitution.md` (Parts 1–9)

Do NOT call or reference `lib/constitution.js`, `lib/constitution-display.js`, or `lib/constitution-stress.js`.
