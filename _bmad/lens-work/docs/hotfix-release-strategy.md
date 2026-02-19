# Hotfix & Release Strategy

## Overview

lens-work's branch topology is designed for structured lifecycle flow, but real-world emergencies require escape hatches. This guide covers how to handle hotfixes, releases, and merge-back operations without breaking initiative state.

> **IMPORTANT:** Replace `{featureBranchRoot}` in all commands with your actual initiative root branch name (e.g., `chat-spark-backend-alignment-50cf37`). For example, `{featureBranchRoot}-small-p1` becomes `chat-spark-backend-alignment-50cf37-small-p1`.

## Emergency Hotfix Flow

When a production issue requires an immediate fix that cannot wait for the normal phase flow:

### 1. Branch from main (not from lens/)

```bash
# Hotfix branches live OUTSIDE the lens/ namespace
git checkout main
git pull origin main
git checkout -b hotfix/{description}
```

> **Critical:** Never branch hotfixes from `lens/` branches. The `lens/` topology is managed by Casey — hotfix branches bypass this entirely.

### 2. Fix, Test, Merge

```bash
# Make the fix
git add -A
git commit -m "hotfix: {description}"
git push -u origin hotfix/{description}
# Create PR → main, get emergency review, merge
```

### 3. Merge Hotfix into Active Initiative Branches

After the hotfix is merged to `main`, propagate it into any active initiative branches:

```bash
# Update the initiative's root branch
git checkout {featureBranchRoot}
git merge main --no-ff -m "merge: hotfix/{description} into initiative root"
git push origin {featureBranchRoot}

# Cascade to audience branches
git checkout {featureBranchRoot}-small
git merge {featureBranchRoot} --no-ff
git push origin {featureBranchRoot}-small

# Cascade to active phase branch
git checkout {featureBranchRoot}-small-p{N}
git merge {featureBranchRoot}-small --no-ff
git push origin {featureBranchRoot}-small-p{N}
```

### 4. Log the Hotfix Event

```bash
echo "{\"ts\":\"$(date -u +%FT%TZ)\",\"event\":\"hotfix-merge\",\"branch\":\"hotfix/{description}\",\"initiative\":\"${initiative_id}\"}" \
  >> _bmad-output/lens-work/event-log.jsonl
```

## Release Tagging

Releases are cut from `main` (or from the initiative's base branch for initiative-scoped releases):

### Standard Release

```bash
git checkout main
git pull origin main
git tag -a v{version} -m "Release v{version}: {summary}"
git push origin v{version}
```

### Initiative Completion Release

When an entire initiative completes (all phases merged through `large` → `base` → `main`):

```bash
# After final merge to main
git checkout main
git pull origin main
git tag -a v{version} -m "Release v{version}: initiative {initiative_id} complete"
git push origin v{version}

# Archive initiative state
@tracey archive {initiative_id}
```

## Conflict Resolution Strategy

When merging hotfixes or cross-branch changes create conflicts:

1. **Always resolve on the _receiving_ branch** — never force-push size or phase branches
2. **Prefer the hotfix for production-critical code** — the fix was already validated in production
3. **Re-run CI after resolution** — ensure the merge didn't break initiative work
4. **Log the conflict resolution** in the event log for audit trail

```bash
# After resolving conflicts
git add -A
git commit -m "merge: resolve conflicts from hotfix/{description}"
git push origin {featureBranchRoot}-small-p{N}
```

## Summary

| Scenario | Branch From | Merge To | Cascade? |
|----------|-------------|----------|----------|
| Hotfix | `main` | `main` → `{featureBranchRoot}` → down | Yes, all active initiatives |
| Release | `main` | Tag only | No |
| Initiative release | `{featureBranchRoot}` → `main` | `main` + tag | Archive initiative |
