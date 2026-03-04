```prompt
---
description: Fetch from remote, re-validate all gates, and update state to reflect current reality (@lens/state-management)
---

Activate @lens agent and execute /sync (state-management skill):

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/sync` command
3. Load `_bmad/lens-work/workflows/utility/sync/workflow.md`
4. Delegate all git operations to git-orchestration

**Execution sequence:**

**[1] Git Fetch**
```bash
git fetch origin --prune
```

**[2] Re-validate Gates**
- Load `_bmad-output/lens-work/state.yaml`
- For each gate with `status: completed`: verify the source branch is still an ancestor of the target branch
- Record any discrepancies (e.g., branch was reset externally)

**[3] Check for External Changes**
- For each tracked branch in state: compare local HEAD vs remote HEAD
- Classify as: `in sync` / `pull needed` / `push needed` / `diverged`

**[4] Update State**
- If discrepancies or external changes found: update state.yaml to reflect reality
- Never silently hide discrepancies — always surface them

**[5] Output Report**
```
🔄 Sync Complete

Remote:  {remote_url}
Fetched: {fetch_timestamp}

{if all in sync}
✅ State is in sync with remote

{else}
⚠️ Discrepancies found:

Gates:
├── {gate}: expected {expected}, found {actual}
└── ...

Branches:
├── {branch}: {action}
└── ...

State updated to reflect current reality.
{endif}
```

**When to run `/sync`:**
- Before starting any phase workflow
- After a teammate merges a PR you haven't pulled yet
- When state.yaml seems out of date with the actual branch state
- Before running `/promote` or `/status`

**Relationship to `/fix-state`:**
- `/sync` — non-destructive: fetches remote and re-validates gates
- `/fix-state` — reconstructive: rebuilds state.yaml from `event-log.jsonl` when state is corrupted
```
