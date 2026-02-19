```prompt
---
description: Fetch remote changes, re-validate state, and sync
---

Activate Tracey agent and execute SY (sync):

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `SY` command to sync with remote
3. Casey fetches + prunes refs
4. Tracey re-validates and updates state

**Use When:**
- Collaborating with team
- Remote changes may exist
- State drift suspected

**Actions:**
- `git fetch --prune`
- Re-validate merge gates
- Update state.yaml if needed
- Report any drift detected

```
