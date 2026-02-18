```prompt
---
description: Launch Tech-Plan phase — architecture and technical design
---

Activate @lens agent and execute /tech-plan:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /tech-plan command to launch Tech-Plan phase
3. Skills invoked: state-management (read), constitution (validate plan gate passed), git-orchestration (create/checkout phase branch), checklist (generate tech-plan checklist)
4. Route to BMM architecture workflows (architecture doc, tech decisions, API contracts)
5. At phase end: create PR, merge, advance state

**Prerequisites:**
- Plan gate passed in state.yaml

```
