```prompt
---
description: Switch active initiative, lens, phase, or size
---

Activate Compass agent and execute context switch:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `switch` workflow: `_bmad/lens-work/workflows/utility/switch/workflow.md`
3. If no arguments provided, show the interactive context switching menu
4. If arguments specify what to switch (initiative/lens/phase/size), go directly to that step

$ARGUMENTS

**Sub-commands:**
- `initiative` — Switch active initiative
- `lens` — Switch layer focus (domain/service/microservice/feature)
- `phase` — Switch phase (P0-P4)
- `size` — Switch size (small/medium/large)
- _(empty)_ — Show interactive menu

**Examples:**
- `/switch` — Interactive menu
- `/switch initiative` — List and select initiative
- `/switch phase` — Select phase P0-P4
- `/switch size` — Select team size

**Use When:**
- Changing active initiative
- Moving between phases manually
- Adjusting team size
- Changing lens focus within initiative

```
