---
mode: ask
---

Run preflight gate first:

```bash
uv run _bmad/lens-work/lens-preflight/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with _bmad/lens-work/prompts/lens-upgrade.prompt.md.
