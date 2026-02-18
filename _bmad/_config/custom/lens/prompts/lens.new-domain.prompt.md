```prompt
---
description: Create a new domain-level initiative with branch topology
---

Activate @lens agent and execute /new-domain:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /new-domain command (layer=domain)
3. Ask for the domain name
4. Configure audiences (default from config or custom)
5. Build featureBranchRoot and create branches
6. Initialize state.yaml and log initiative_created event

```
