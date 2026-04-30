---
mode: ask
---

Run preflight gate first:

```bash
uv run --script ./lens.core/_bmad/lens-work/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with `lens.core/_bmad/lens-work/prompts/lens-discover.prompt.md`.
