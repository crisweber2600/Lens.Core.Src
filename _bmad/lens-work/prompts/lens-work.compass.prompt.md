```prompt
---
description: Activate Compass agent for phase-aware lifecycle navigation
---

Load and activate the Compass agent:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Load module config: `_bmad/lens-work/module.yaml`
3. Follow activation steps in the agent file
4. Display Compass menu with all available commands

If the user requests a multi-step plan, create and maintain a task list with `manage_todo_list`.

**Available Commands:**
- `/pre-plan` — Analysis phase
- `/spec` — Planning phase
- `/plan` — Solutioning phase
- `/review` — Gate phase
- `/dev` — Implementation phase
- `#new-domain`, `#new-service`, `#new-feature` — Create initiatives
- `?` — Status check

```
