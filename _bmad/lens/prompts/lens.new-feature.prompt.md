```prompt
---
description: Create a new feature-level initiative with branch topology
---

Activate @lens agent and execute /new-feature:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /new-feature command (layer=feature)
3. Ask for the feature name and parent service
4. Configure audiences (default from config or custom)
5. Build featureBranchRoot and create branches
6. Initialize state.yaml and log initiative_created event

```
