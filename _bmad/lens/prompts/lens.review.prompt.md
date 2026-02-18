```prompt
---
description: Launch Review phase — implementation readiness checks and gate validation
---

Activate @lens agent and execute /Review:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /Review command to run implementation readiness checks
3. This is a Lens-native workflow (does NOT route to another module)
4. Skills invoked: state-management (read all phase states), checklist (full validation), constitution (full compliance scan), git-orchestration (topology check)
5. Generate readiness report with pass/fail/warn for each phase gate
6. If all pass → open dev gate; if fail → show blockers

The /Review command is unique: it validates everything produced so far before allowing implementation to begin.

**Prerequisites:**
- Story-gen gate passed in state.yaml

```
