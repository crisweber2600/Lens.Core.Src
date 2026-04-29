---
description: 'Run BusinessPlan phase (PRD, UX design)'
---

Run preflight gate first:

```bash
uv run _bmad/lens-work/skills/bmad-lens-preflight/scripts/light-preflight.py
```

If the preflight script or release prompt is missing, stop and show the missing path.
If preflight exits 0, continue with `_bmad/lens-work/prompts/lens-businessplan.prompt.md`.
If preflight fails, stop and show the error.
