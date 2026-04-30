---
mode: ask
---

Before loading workflow logic, run the preflight gate from the workspace root:

```bash
uv run --script ./lens.core/_bmad/lens-work/skills/bmad-lens-preflight/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with `_bmad/lens-work/prompts/lens-expressplan.prompt.md`.