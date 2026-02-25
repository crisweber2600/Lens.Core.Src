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
- Uses constitution storage path `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md`.
- Runs clean-state check via git-orchestration skill before mutations.
- Logs governance events via state-management skill:
  - `constitution-created`
  - `constitution-amended`
- Commits changes through git-orchestration skill with governance-prefixed message.
