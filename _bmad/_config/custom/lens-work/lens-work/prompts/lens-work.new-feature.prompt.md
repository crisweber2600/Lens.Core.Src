---
model: Claude Sonnet 4.6 (copilot)
description: 'Create new feature-level initiative within a service.'
---

# lens-work.new-feature (Stub)

> **This is a stub.** Load and execute the full prompt from the release module.

```
Read and follow all instructions in: lens.core/_bmad/lens-work/prompts/lens-work.new-initiative.prompt.md
```

Invoke with scope: **feature**

Accepted forms:
- `/new-feature <feature>`
- `/new-feature <service> <feature>` when the domain can be inferred
- `/new-feature <domain> <service> <feature>`

If a service was just created in this chat, reuse it once before falling back to git-branch context. If the single argument matches that new service id, ask for the feature name explicitly.