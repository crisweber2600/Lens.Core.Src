```prompt
---
description: Correction loop for quick fixes (Quick-Spec → Review → Quick-Dev)
---

Activate Compass agent and execute #fix-story:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `#fix-story` command to start correction loop
3. Run: Quick-Spec → Review → Quick-Dev → Done

Use `#think` before defining the fix scope or acceptance criteria.

**Use When:**
- Bug fix needed during development
- Small correction that doesn't warrant full phase cycle
- Post-review adjustments requested

**Workflow:**
1. Quick-Spec: Define the fix
2. Review: Validate approach
3. Quick-Dev: Implement and close

```
