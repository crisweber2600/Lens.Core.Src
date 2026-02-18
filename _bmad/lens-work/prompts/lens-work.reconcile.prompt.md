```prompt
---
description: Clone missing repos and fix checkout issues with snapshot support
---

Activate Scout agent and execute reconcile:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `reconcile` command to fix repo state
3. Clone missing repos, fix checkouts, snapshot before mutations
4. Update inventory after changes

**Prerequisites:**
- `discover` must run first (needs repo-inventory.yaml)

**Actions:**
1. Snapshot current TargetProjects state
2. Clone missing repos from service map
3. Fix checkout issues (detached HEAD, wrong branch)
4. Re-run discovery to update inventory

**Safety:**
- Always snapshots before mutations
- Rollback available via `rollback` command
- Never deletes repos

```
