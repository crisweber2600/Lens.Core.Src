```prompt
---
description: Repair corrupted state using event log as source of truth
---

Activate @lens agent and execute /fix:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /fix command (idempotent)
3. Read event-log.jsonl (immutable audit trail)
4. Reconstruct last known good state from events
5. Validate reconstructed state against git branches
6. Replace state.yaml with reconstructed version
7. Log state_fixed event
8. Report what was reconstructed

Use this when state.yaml is corrupted or /sync couldn't fix the issue.

```
