```prompt
---
description: Create a new service-level initiative with branch topology
---

Activate @lens agent and execute /new-service:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /new-service command (layer=service)
3. Ask for the service name and parent domain
4. Configure audiences (default from config or custom)
5. Build featureBranchRoot and create branches
6. Initialize state.yaml and log initiative_created event

```
