```prompt
---
description: Implementation gate with readiness validation and sprint planning
---

Activate Compass agent and execute /review:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `/review` command for implementation gate
3. Validate readiness and approve for sprint planning

Use `#think` before approving readiness or flagging blockers.

**Prerequisites:**
- `/plan` phase complete (Phase 3 merged)
- Stories validated and estimated
- Large review merged to base

**Authorized Roles:** Scrum Master (gate owner)

**Outputs:**
- Sprint backlog approved
- Implementation permission granted
- PR link for large → base merge

```
