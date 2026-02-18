```prompt
---
description: Launch Story-Gen phase — generate implementation stories from architecture
---

Activate @lens agent and execute /Story-Gen:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /Story-Gen command to launch Story Generation phase
3. Skills invoked: state-management (read), constitution (validate tech-plan gate passed), git-orchestration (create/checkout phase branch), checklist (generate story-gen checklist)
4. Route to BMM story generation workflows (stories, estimates, dependency mapping)
5. At phase end: create PR, merge, advance state

**Prerequisites:**
- Tech-plan gate passed in state.yaml

```
