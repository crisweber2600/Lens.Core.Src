---
mode: ask
---

Run preflight gate first:

```bash
uv run _bmad/lens-work/skills/bmad-lens-preflight/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with _bmad/lens-work/prompts/lens-preplan.prompt.md.