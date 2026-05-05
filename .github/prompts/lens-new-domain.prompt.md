---
agent: agent
---

FIRST, run the preflight gate from the workspace root:

```bash
$PYTHON _bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py --caller lens-new-domain
```

If that command exits non-zero, stop and surface the failure. Do not proceed.

ONLY AFTER a successful prompt-start sync, load and follow the module prompt at
`_bmad/lens-work/prompts/lens-new-domain.prompt.md`.
