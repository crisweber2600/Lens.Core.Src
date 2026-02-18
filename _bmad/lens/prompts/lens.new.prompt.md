```prompt
---
description: Create a new initiative (domain, service, or feature) with branch topology
---

Activate @lens agent and execute /new:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /new command to create a new initiative
3. Ask: initiative type (domain/service/feature), name, parent (if service/feature)
4. Configure audiences (default from config or custom)
5. Build featureBranchRoot from initiative hierarchy
6. Create branches: root + configured audience branches → push immediately
7. Initialize state.yaml with new initiative
8. Log initiative_created event

**Branch creation:**
```
{featureBranchRoot}              # root (= base)
{featureBranchRoot}-small        # audience branches
{featureBranchRoot}-medium       # (per configuration)
{featureBranchRoot}-large
```

All branches are pushed immediately on creation.

```
