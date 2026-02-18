```prompt
---
description: Archive completed initiative and clean up state
---

Activate Tracey agent and execute ARCHIVE:

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute `ARCHIVE` command to complete initiative
3. Move state to archive, clean active state
4. Log completion to event log

**Prerequisites:**
- All phases complete
- Final PBR merged to base
- Implementation merged to target repo

**Actions:**
- Archive state.yaml to `_bmad-output/lens-work/archive/{id}/`
- Archive event-log.jsonl
- Clear active state
- Print completion summary

```
