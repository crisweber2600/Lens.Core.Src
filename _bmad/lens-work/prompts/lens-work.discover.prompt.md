```prompt
---
description: Inventory TargetProjects vs service map (read-only, no mutations)
---

Activate Scout agent and execute discover:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `discover` command to inventory repos
3. Compare expected (service map) vs actual (TargetProjects)
4. Write inventory without making changes

**Output:**
```yaml
repos:
  matched:   # In both service map and TargetProjects
  missing:   # In service map but not TargetProjects
  extra:     # In TargetProjects but not service map
```

**Key Points:**
- Read-only operation (no mutations)
- Writes to `_bmad-output/lens-work/repo-inventory.yaml`
- Must run before repo-document or repo-reconcile

```
