---
name: 'step-01-load-map'
description: 'Load or initialize the domain map'
nextStepFile: './step-02-edit-map.md'
---

# Step 1: Load Map

## Goal
Load the current domain map or initialize a minimal structure.

## Instructions

### 1. Read Existing Map
- Read `_bmad-output/lens-work/domain-map.yaml` if present.
- If missing, proceed to auto-discovery.

### 2. Auto-Discover Git Remote URLs

**CRITICAL:** For each repository in TargetProjects, detect the remote git URL:

```bash
# For each repository directory
cd {repo_path}
git remote get-url origin 2>/dev/null || echo "(local repository - no remote)"
```

**Store remote URLs for each discovered repository:**
- Run `git remote get-url origin` in each repository directory
- If remote exists, use the URL in `git_repo` field
- If no remote, mark as `(local repository - no remote configured)`

### 3. Initialize Map Structure
- If no domain-map.yaml exists, auto-generate based on TargetProjects structure
- Populate `git_repo` with detected remote URLs
- Set `primary_branch` by running `git branch --show-current` or checking default

### 4. Present Summary
- Show current domains/services with their git remote URLs
- Highlight any repositories without remotes configured

## Output
- `domain_map` with populated `git_repo` URLs
