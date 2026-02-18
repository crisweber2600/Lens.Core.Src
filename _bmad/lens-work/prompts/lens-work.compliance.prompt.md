```prompt
---
mode: 'agent'
agent: 'bmad-agent-lens-work-scribe'
description: 'Check constitutional compliance of an artifact or initiative'
---

Run constitutional compliance check.

$ARGUMENTS

## Instructions
1. Load the Scribe agent (Cornelius)
2. Execute the /compliance command
3. Resolve applicable constitutions via governance/resolve-constitution/workflow.md
4. Evaluate artifact against resolved constitutional rules
5. Report pass/warn/fail counts with specific article citations

```
