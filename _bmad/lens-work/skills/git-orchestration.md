# Skill: git-orchestration

**Module:** lens-work
**Skill of:** `@lens` agent
**Type:** Internal delegation skill

---

## Purpose

Manages all git branch operations for the lens-work lifecycle. Handles branch creation, targeted commits, pushes, and topology validation. Formalizes the git-orchestration skill's API contract.

## Responsibilities

1. **Repository cloning** — Clone repos and auto-checkout to last-committed branch
2. **Branch creation** — Create initiative root, audience, and phase branches
3. **Branch validation** — Verify topology matches expected patterns
4. **Targeted commits** — Commit only relevant files per workflow
5. **Push management** — Push branches at workflow boundaries
6. **PR preparation** — Set up pull request metadata

## Branch Patterns (v2 — Lifecycle Contract)

```yaml
domain: "{domain_prefix}"
service: "{domain_prefix}-{service_prefix}"
root: "{initiative_root}"
audience: "{initiative_root}-{audience}"
phase: "{initiative_root}-{audience}-{phase_name}"
workflow: "{initiative_root}-{audience}-{phase_name}-{workflow}"

# Branch patterns use named phases only (v2.0.0)
```

> Named phases: preplan, businessplan, techplan, devproposal, sprintplan
> Audiences: small (IC creation), medium (lead review), large (stakeholder), base (initiative root)

## Trigger Conditions

- Repository cloning — clone with auto-checkout to last-committed branch (repos, governance, control)
- Initiative creation (`/new-*`) — create root + audience branches (track-aware)
- Phase start — create named phase branch from audience
- Workflow start — create workflow branch from phase
- Workflow end — commit, push
- Phase end — PR into audience branch, delete phase branch
- Audience promotion — PR from one audience to next (with gate validation)

## Clone Pattern (Hard Enforcement)

**Rule:** Every repository clone MUST be immediately followed by a branch checkout that switches to the default/last-committed branch.

**Standard Pattern:**
```bash
git clone {remote_url} {local_path}
cd {local_path}
git checkout $(git symbolic-ref refs/remotes/origin/HEAD | cut -d'/' -f4)
```

**Rationale:**
- After `git clone`, the working directory is in detached HEAD state (pointing to the commit but not a branch)
- Without checking out a branch, the repo is not in a trackable state and git operations may fail
- The last-committed branch is the remote default branch (determined via `symbolic-ref`) and represents the current development state
- Users expect to be on the main/current development branch immediately after cloning

**Fallback (if symbolic-ref fails):**
```bash
# Try expected_branch from config (e.g., "main")
git checkout {expected_branch} || git checkout -b {expected_branch} origin/{expected_branch}

# If that fails, checkout first available branch
git checkout $(git branch -r | grep -v HEAD | head -1 | cut -d'/' -f2)
```

**Post-Clone Verification:**
```bash
# Verify we're on a branch (not in detached HEAD state)
if git -C {local_path} symbolic-ref HEAD > /dev/null 2>&1; then
  BRANCH=$(git -C {local_path} symbolic-ref --short HEAD)
  echo "✅ Checked out to branch: $BRANCH"
else
  echo "❌ Still in detached HEAD state after clone. Check remote HEAD references."
  exit 1
fi
```

**Validation:** Any workflow file containing `git clone` must have a matching `git checkout` or branch verification in the same step or bash block.

## Git Discipline Rules

1. Clean working directory before any branch operation
2. Targeted commits (only files relevant to current workflow)
3. **Auto-push: EVERY commit MUST be immediately followed by `git push`** (bmadconfig.yaml: git_discipline.auto_push)
4. Push branches at workflow end, not mid-workflow (use auto-push after each commit instead)
5. Never force-push without explicit user confirmation
6. Use `{default_git_remote}` from config for all remote operations

### Auto-Push Convention (Hard Enforcement)

**Rule:** Every `git commit` command in any workflow step MUST be immediately followed by a `git push` command.

**Pattern:**
```bash
git commit -m "workflow(action): description"
git push origin "${branch_name}"
```

**Rationale:** Lens-work coordinates distributed teams. Local-only commits break collaboration, prevent PR creation, and violate gate check assumptions.

**Exceptions:** Only transient branches used within a single step and immediately discarded (must be documented inline).

**Validation:** Any workflow file containing `git commit` must have a matching `git push` in the same step or bash block.

## Error Handling

| Error | Recovery |
|-------|----------|
| Clone fails (auth, network) | Check credentials, SSH keys, network connectivity; suggest manual clone with `git clone` |
| Detached HEAD after clone | Run `git checkout` to the default branch (derived from symbolic-ref or expected_branch) |
| symbolic-ref lookup fails | Fall back to expected_branch from config (usually "main") |
| Branch checkout fails | Fall back to first available remote branch; if no branches exist, report corrupted remote |
| Branch exists | Check if it's the expected branch, use it or error |
| Dirty working directory | Prompt user to commit or stash |
| Push rejected | Suggest pull + merge or /sync |
| Branch topology drift | Report mismatch, suggest /fix |

## State Fields Touched

- `state.current_phase` (v2: named phase — preplan|businessplan|techplan|devproposal|sprintplan)
- `state.phase_status` (v2: named phase keys)
- `state.audience_status` (v2: promotion tracking — small_to_medium|medium_to_large|large_to_base)
- `initiative.initiative_root` (v2: replaces featureBranchRoot)
- `initiative.active_phases` (v2: derived from track)
- `initiative.audiences` (v2: derived from track)

---

_Skill spec backported from lens module on 2026-02-17_
