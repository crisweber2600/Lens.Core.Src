```prompt
---
description: Setup TargetProjects from service map with discovery and documentation
---

Activate Scout agent and execute bootstrap:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `bootstrap` command to setup TargetProjects
3. Run full discovery → reconcile → document cycle
4. Report setup status

**Workflow:**
1. Load service map
2. Snapshot current TargetProjects state
3. Run repo-discover (inventory)
4. Run repo-reconcile (clone/fix)
5. Run repo-document (generate docs)
6. Report summary

**Use When:**
- Initial project setup
- Adding new service to domain
- Resetting TargetProjects structure

```
