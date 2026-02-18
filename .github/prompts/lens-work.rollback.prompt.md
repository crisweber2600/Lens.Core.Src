```prompt
---
description: Revert bootstrap to previous snapshot
---

Activate Scout agent and execute rollback:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `rollback` command to revert setup
3. Restore from snapshot taken during bootstrap/reconcile
4. Update state to reflect rollback

**Use When:**
- Bootstrap caused issues
- Reconcile introduced problems
- Need to revert to known-good state

**Requirements:**
- Snapshot must exist from previous operation
- Warning prompt before destructive action

**Note:** Rollback deletes current TargetProjects state and restores snapshot.

```
