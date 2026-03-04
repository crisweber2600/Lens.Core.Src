````prompt
---
description: 'Bootstrap BMAD structure in target repositories'
---

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

# lens-work.bootstrap (Stub)

> **This is a stub.** Load and execute the full prompt from the bmad.lens.release control repository.

```
Read and follow all instructions in: bmad.lens.release/.github/prompts/lens-work.bootstrap.prompt.md
```

Source: [lens-work.bootstrap.prompt.md](https://github.com/crisweber2600/bmad.lens.release/blob/release/2.0.0/.github/prompts/lens-work.bootstrap.prompt.md)
````
