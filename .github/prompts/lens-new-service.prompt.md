---
mode: ask
---

Run preflight gate first:

```bash
uv run _bmad/lens-work/lens-preflight/scripts/light-preflight.py
```

If preflight exits 0, continue with `_bmad/lens-work/prompts/lens-new-service.prompt.md`.
If preflight fails, stop and show the error.
