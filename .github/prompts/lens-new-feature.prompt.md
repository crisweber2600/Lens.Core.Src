---
description: 'Initialize a new feature with 2-branch topology, feature YAML, and PR'
---

# lens-new-feature (Stub)

> **This is a stub.** Load and execute the full prompt from the release module.
> When appropriate, use `vscode_askQuestions` to get feedback from users if the tool is available.
> All `_bmad/` paths in the full prompt are relative to `lens.core/` — do NOT resolve paths against the user's main project repo.

```
First run the shared lightweight prompt-start sync from the workspace root:

uv run ./lens.core/_bmad/lens-work/scripts/light-preflight.py

If that command exits non-zero, stop and surface the failure.

Read and follow all instructions in: lens.core/_bmad/lens-work/prompts/lens-new-feature.prompt.md
```

