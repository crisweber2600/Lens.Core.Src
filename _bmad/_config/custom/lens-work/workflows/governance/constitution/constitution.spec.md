# Workflow Specification: constitution

**Module:** lens-work  
**Agent:** Scribe  
**Status:** Implemented

---

## Purpose

View, create, or amend constitutions for domain/service/microservice/feature layers.

---

## Entry Metadata

```yaml
name: constitution
description: View, create, or amend constitutions
agent: scribe
category: governance
```

---

## Required Behaviors

- Mode selector is ordered View (default), Create, Amend.
- Uses constitution storage path `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md`.
- Runs clean-state check via Casey before mutations.
- Logs governance events via Tracey:
  - `constitution-created`
  - `constitution-amended`
- Commits changes through Casey with governance-prefixed message.
