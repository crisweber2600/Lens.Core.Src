---
model: Claude Sonnet 4.6 (copilot)
description: 'Create a new initiative (domain, service, or feature)'
---

# lens-work.new-initiative (Stub)

> **This is a backward-compatible alias.** Load the current Lens Next init prompt from the release module and clarify the requested scope before creating anything.

```
Read and follow all instructions in: lens.core/_bmad/lens-work/prompts/lens-init-feature.prompt.md
```

Before creating anything, determine the requested scope first:

- Domain: follow the current `lens-new-domain` flow
- Service: follow the current `lens-new-service` flow
- Feature: follow the current `lens-init-feature` flow and always ask the user to choose the track explicitly before creation

