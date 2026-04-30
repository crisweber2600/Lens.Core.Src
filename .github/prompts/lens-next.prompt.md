---
description: 'Run the next command — resolve and delegate to the current feature's recommended phase'
---

Run preflight gate first:

```bash
uv run ./lens.core/_bmad/lens-work/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with `lens.core/_bmad/lens-work/prompts/lens-next.prompt.md`.
