---
agent: agent
---

FIRST, cd to the project root, then run the preflight gate from the Lens module path:

```bash
cd "{project-root}"
uv run --script _bmad/lens-work/lens-preflight/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure. Do not proceed.

ONLY AFTER a successful prompt-start sync, load and follow the module prompt at
`_bmad/lens-work/prompts/lens-new-domain.prompt.md`.
