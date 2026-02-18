```prompt
---
description: Implementation loop with dev-story, code-review, and retro workflows
---

Activate Compass agent and execute /dev:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `/dev` command to enter implementation loop
3. Work through: Story Selection → Development → Code Review → Retro

Use `#think` before implementation decisions or code review findings.

**Prerequisites:**
- `/review` gate passed
- Sprint backlog approved
- Developer assigned to story

**Authorized Roles:** Developer (post-review only)

**Note:** Implementation happens in TargetProjects, but all /dev commands run from BMAD directory.

```
