```prompt
---
description: Launch Story Generation phase (Stories/Estimates/Dependencies)
---

Activate Compass agent and execute /story-gen:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `/story-gen` command to launch Story Generation phase
3. Router dispatches to `workflows/router/story-gen/workflow.md`

**Phase position:** pre-plan → plan → tech-plan → **[story-gen]** → review → dev

**Prerequisites:**
- `/tech-plan` complete (P3 gate passed)
- Architecture document exists

**Produces:**
- Implementation stories with acceptance criteria (`implementation-stories.md`)
- Story estimates — T-shirt sizing or story points (`story-estimates.md`)
- Dependency map between stories (`dependency-map.md`)

**Next:** `/review` for implementation readiness check

Use `#think` before breaking architecture into stories.
```
