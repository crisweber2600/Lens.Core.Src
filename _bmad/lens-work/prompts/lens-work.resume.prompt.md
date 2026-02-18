```prompt
---
description: Rehydrate from state.yaml and restore lens-work context
---

Activate Tracey agent and execute RS (resume/restore):

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `RS` command to load from state.yaml
3. Validate state matches git reality
4. Explain context and suggest next action

**Use When:**
- Starting new chat session
- Returning after interruption
- State needs rehydration

**Validates:**
- state.yaml exists and is readable
- Active branch matches state
- Merge gates are accurate

```
