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

## Target Project Branch Management

Target project repos (code repos, not lens-work control repo) follow the GitFlow branching
model defined in `lifecycle.yaml → target_projects`. This section formalizes the automation
for epic branches, story branches, task auto-commits, and story-completion PRs.

### Branch Naming Contract

```yaml
# Epic branch:  feature/{epic-key}
# Story branch: feature/{epic-key}-{story-key}
#
# Examples:
#   Epic:   feature/epic-1
#   Story:  feature/epic-1-1-1-user-authentication
#
# {epic-key}  — from sprint-status.yaml (e.g., "epic-1", "epic-2")
# {story-key} — from sprint-status.yaml (e.g., "1-1-user-authentication")
```

### Epic Branch Creation (Trigger: dev-story-start or sprint-plan-start)

**Rule:** Before creating a story branch, the parent epic branch MUST exist.

```bash
# Resolve epic-key from story-key (e.g., story "1-2-user-auth" → epic "epic-1")
epic_num=$(echo "${story_key}" | cut -d'-' -f1)
epic_key="epic-${epic_num}"
epic_branch="feature/${epic_key}"

# Create epic branch from integration branch if it doesn't exist
cd "${target_repo_path}"
git fetch origin
if ! git rev-parse --verify "origin/${epic_branch}" > /dev/null 2>&1; then
  # Epic branch does not exist — create from develop (integration branch)
  integration_branch="develop"
  # Fallback: if develop doesn't exist, use main
  if ! git rev-parse --verify "origin/${integration_branch}" > /dev/null 2>&1; then
    integration_branch="main"
  fi
  git checkout "${integration_branch}"
  git pull origin "${integration_branch}"
  git checkout -b "${epic_branch}"
  git push origin "${epic_branch}"
  echo "✅ Created epic branch: ${epic_branch} from ${integration_branch}"
else
  echo "✅ Epic branch exists: ${epic_branch}"
fi
```

### Story Branch Creation (Trigger: dev-story-start)

**Rule:** Story branches are created from their parent epic branch.

```bash
story_branch="feature/${epic_key}-${story_key}"

cd "${target_repo_path}"
git fetch origin

if ! git rev-parse --verify "origin/${story_branch}" > /dev/null 2>&1; then
  # Story branch does not exist — create from epic branch
  git checkout "${epic_branch}"
  git pull origin "${epic_branch}"
  git checkout -b "${story_branch}"
  git push origin "${story_branch}"
  echo "✅ Created story branch: ${story_branch} from ${epic_branch}"
else
  # Story branch already exists — checkout and pull latest
  git checkout "${story_branch}"
  git pull origin "${story_branch}"
  echo "✅ Resumed story branch: ${story_branch}"
fi
```

### Task Auto-Commit (Trigger: task-completion in dev-story Step 8)

**Rule:** Every completed task MUST be committed and pushed immediately.

```bash
# After each task is marked [x] in the story file:
cd "${target_repo_path}"
git add -A
git commit -m "feat(${story_key}): ${task_description}

Story: ${story_key}
Task: ${task_number}/${total_tasks}
Epic: ${epic_key}"
git push origin "${story_branch}"
echo "✅ Task ${task_number}/${total_tasks} committed and pushed to ${story_branch}"
```

**Commit message convention:**
- Prefix: `feat(` + story-key + `): ` + task summary
- Body: Story key, task number, epic key
- Auto-push: ALWAYS (per git_discipline.auto_push convention)

### Story Completion PR (Trigger: story-completion in dev-story Step 9)

**Rule:** When ALL tasks in a story are complete, auto-create a PR from story branch to epic branch.

```bash
# Create PR from story branch to epic branch
cd "${target_repo_path}"

# Ensure all changes are committed and pushed
git add -A
if ! git diff --cached --quiet; then
  git commit -m "feat(${story_key}): story complete — all tasks done"
  git push origin "${story_branch}"
fi

# Create PR via gh CLI (GitHub) or az repos (Azure DevOps)
# GitHub:
gh pr create \
  --base "${epic_branch}" \
  --head "${story_branch}" \
  --title "feat(${epic_key}): ${story_title} [${story_key}]" \
  --body "## Story Complete: ${story_key}

### ${story_title}

All tasks completed. Ready for code review.

**Epic:** ${epic_key}
**Story Branch:** ${story_branch}
**Target Branch:** ${epic_branch}

### Acceptance Criteria
${acceptance_criteria_summary}

### Tasks Completed
${completed_tasks_list}

### Files Changed
${file_list}" \
  2>/dev/null

pr_url=$(gh pr view "${story_branch}" --json url -q '.url' 2>/dev/null)
echo "✅ PR created: ${story_branch} → ${epic_branch}"
echo "   URL: ${pr_url}"
```

**PR Naming Convention:**
- Title: `feat({epic-key}): {story-title} [{story-key}]`
- Body: Story summary, acceptance criteria, completed tasks, files changed

### Epic Completion PR (Trigger: all stories in epic complete)

When all stories in an epic are complete and merged to the epic branch:

```bash
# Create PR from epic branch to integration branch
epic_branch="feature/${epic_key}"
integration_branch="develop"  # or main if develop doesn't exist

gh pr create \
  --base "${integration_branch}" \
  --head "${epic_branch}" \
  --title "feat(${epic_key}): Epic complete — ${epic_title}" \
  --body "## Epic Complete: ${epic_key}

### ${epic_title}

All stories completed and merged.

### Stories Included
${completed_stories_list}" \
  2>/dev/null

echo "✅ Epic PR created: ${epic_branch} → ${integration_branch}"
```

## State Fields Touched

- `state.current_phase` (v2: named phase — preplan|businessplan|techplan|devproposal|sprintplan)
- `state.phase_status` (v2: named phase keys)
- `state.audience_status` (v2: promotion tracking — small_to_medium|medium_to_large|large_to_base)
- `initiative.initiative_root` (v2: replaces featureBranchRoot)
- `initiative.active_phases` (v2: derived from track)
- `initiative.audiences` (v2: derived from track)

---

_Skill spec backported from lens module on 2026-02-17_
