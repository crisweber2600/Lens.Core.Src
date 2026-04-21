---
model: Claude Sonnet 4.6 (copilot)
description: 'Cross-feature dashboard with dependency graphs'
---

# lens-dashboard (Stub)

> **This is a stub.** Load and execute the full prompt from the release module.
> When appropriate, use `vscode_askQuestions` to get feedback from users if the tool is available.
> All `lens.core/_bmad/` paths in the full prompt are relative to `lens.core/` — do NOT resolve paths against the user's main project repo.

You MUST execute these steps in order:
1. FIRST, run `uv run ./lens.core/_bmad/lens-work/scripts/light-preflight.py` from the workspace root.
2. If that command exits non-zero, stop and surface the failure.
3. ONLY AFTER a successful prompt-start sync, read and follow all instructions in: `lens.core/_bmad/lens-work/prompts/lens-dashboard.prompt.md`

```bash
uv run ./lens.core/_bmad/lens-work/scripts/light-preflight.py
```
