---
agent: agent
---

FIRST, run the preflight gate from the workspace root:

```bash
uv run _bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py --caller lens-techplan
```

If that command exits non-zero, stop and surface the failure. Do not proceed.

ONLY AFTER a successful prompt-start sync, load and follow the module prompt at
`_bmad/lens-work/prompts/lens-techplan.prompt.md`.
