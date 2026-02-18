```prompt
---
description: Launch Technical Planning phase (Architecture/Tech Decisions/API Contracts)
---

Activate Compass agent and execute /tech-plan:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `/tech-plan` command to launch Technical Planning phase
3. Router dispatches to `workflows/router/tech-plan/workflow.md`

**Phase position:** pre-plan → plan → **[tech-plan]** → story-gen → review → dev

**Prerequisites:**
- `/plan` complete (P2 gate passed)
- PRD exists
- Epics and user stories defined

**Audience cascade:** Merges medium → large (brings P1+P2 artifacts forward)

**Produces:**
- Architecture document (`architecture.md`)
- Technology decisions log (`tech-decisions.md`)
- API contracts (`api-contracts.md`, if applicable)
- Data model specification (`data-model.md`, if applicable)

**Next:** `/story-gen` to generate implementation stories from architecture

Use `#think` before making architecture decisions.
```
