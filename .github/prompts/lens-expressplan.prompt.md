---
description: 'Run ExpressPlan phase (QuickPlan and express review)'
---

Before loading workflow logic, run the preflight gate from the workspace root:

```bash
uv run _bmad/lens-work/lens-preflight/scripts/light-preflight.py
```

If that command exits non-zero, stop and surface the failure.

If preflight exits 0, continue with `_bmad/lens-work/prompts/lens-expressplan.prompt.md`.
