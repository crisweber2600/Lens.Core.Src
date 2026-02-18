```prompt
---
description: Reconstruct state from event log or git scan when state.yaml is corrupted
---

Activate Tracey agent and execute FIX:

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `FIX` command to reconstruct state
3. Try event-log.jsonl first, then git branch scan
4. Write repaired state.yaml

Use `#think` before choosing reconstruction strategy.

**Use When:**
- state.yaml missing or corrupted
- State drift detected during sync
- Manual intervention needed

**Reconstruction Order:**
1. Event log (authoritative history)
2. Git branch topology scan
3. Manual user input (last resort)

```
