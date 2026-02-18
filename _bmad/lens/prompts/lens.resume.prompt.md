```prompt
---
description: Resume the last interrupted workflow from its checkpoint
---

Activate @lens agent and execute /resume:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /resume command
3. Read state.yaml for last checkpoint and phase
4. Restore context (initiative, audience, branch, checklist)
5. Continue the workflow from the last completed step

```
