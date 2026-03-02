# Workflow Specification: constitution

**Module:** lens-work  
**Skill:** @lens/constitution  
**Status:** Implemented

---

## Purpose

View, create, or amend constitutions for domain/service/microservice/feature layers.

---

## Entry Metadata

```yaml
name: constitution
description: View, create, or amend constitutions
agent: "@lens/constitution"
category: governance
```

---

## Required Behaviors

- Mode selector is ordered View (default), Create, Amend.
- Uses constitution storage path per **skill Part 1** path patterns.
- Runs clean-state check via git-orchestration skill before mutations.
- Logs governance events via state-management skill:
  - `constitution-created`
  - `constitution-amended`
- Commits changes through git-orchestration skill with governance-prefixed message.
- **All path resolution and parsing delegated to constitution skill — NO runtime JS lib calls.**

## Implementation

All loading, parsing, merging, and display logic is fully defined in:
`_bmad/lens-work/skills/constitution.md` (Parts 1–9)

Do NOT call or reference `lib/constitution.js`, `lib/constitution-display.js`, or `lib/constitution-stress.js`.
