```prompt
---
description: Bypass merge validation with logged reason (requires justification)
---

Activate Tracey agent and execute OVERRIDE:

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `OVERRIDE` command to bypass merge gate
3. Require reason (min 10 chars)
4. Log to event-log.jsonl

Use `#think` before approving override—this bypasses safety checks.

**Use When:**
- Merge gate blocked incorrectly
- Emergency bypass needed
- Known issue with validation

**Requirements:**
- Reason must be ≥ 10 characters
- Logged with timestamp to event log
- Visible in status reports

**Warning:** Overrides bypass merge discipline. Use sparingly.

```
