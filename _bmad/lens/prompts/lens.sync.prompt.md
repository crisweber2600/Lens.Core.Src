```prompt
---
description: Reconcile state.yaml with git branch reality
---

Activate @lens agent and execute /sync:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /sync command (idempotent)
3. Read current state.yaml and list actual git branches
4. Compare state expectations against git reality
5. Fix any drift (branches that exist but aren't in state, or vice versa)
6. Log state_synced event
7. Report what was found and fixed

Use this when state seems out of sync after manual git operations.

```
