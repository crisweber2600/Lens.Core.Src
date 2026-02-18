---
name: repo-reconcile
description: Clone/fix/checkout repos with snapshot + rollback support
agent: scout
trigger: "@scout reconcile"
category: discovery
mutates: true
snapshots: true
---

# Repo Reconcile Workflow

**Purpose:** Clone missing repos, fix unhealthy repos, with snapshot and rollback support.

---

## Execution Sequence

### 1. Load Inventory

```yaml
inventory = load("_bmad-output/lens-work/repo-inventory.yaml")

if inventory == null:
  output: "No inventory found. Run '@scout discover' first."
  exit: 1

missing_repos = inventory.repos.missing
```

### 2. Create Snapshot (Before Mutations)

```yaml
snapshot_id = generate_id()
snapshot_path = "_bmad-output/lens-work/snapshots/${snapshot_id}/"

# Snapshot current TargetProjects state
snapshot:
  id: ${snapshot_id}
  created_at: ${ISO_TIMESTAMP}
  repos_captured: []
  
for repo in inventory.repos.matched:
  # Record current state (not full copy—just metadata)
  snapshot.repos_captured.append({
    name: repo.name,
    path: repo.path,
    head_commit: repo.head_commit,
    branch: repo.current_branch,
    dirty: repo.has_uncommitted_changes
  })

save(snapshot, "${snapshot_path}/snapshot.yaml")

output: |
  📸 Snapshot created: ${snapshot_id}
  └── Rollback available: @scout rollback ${snapshot_id}
```

### 3. Clone Missing Repos

```yaml
for repo in missing_repos:
  output: "📥 Cloning ${repo.name}..."
  
  # Ensure parent directory exists
  parent_path = dirname(repo.expected_path)
  ensure_directory(parent_path)
  
  # Clone
  result = git_clone(repo.remote, repo.expected_path)
  
  if result.success:
    # Checkout default branch
    git_checkout(repo.expected_path, repo.default_branch)
    
    cloned_repos.append(repo)
    output: "  ✅ Cloned to ${repo.expected_path}"
  else:
    failed_repos.append({repo: repo, error: result.error})
    output: "  ❌ Failed: ${result.error}"
```

### 4. Fix Unhealthy Repos

```yaml
for repo in inventory.repos.matched:
  if repo.status == "unhealthy":
    output: "🔧 Fixing ${repo.name}..."
    
    # Diagnose
    issues = diagnose_repo(repo.path)
    
    for issue in issues:
      if issue.type == "detached_head":
        git_checkout(repo.path, repo.default_branch)
      elif issue.type == "behind_remote":
        git_pull(repo.path)
      elif issue.type == "merge_conflict":
        output: "  ⚠️ Merge conflict—manual resolution required"
        manual_fixes.append(repo)
        continue
      elif issue.type == "no_remote":
        git_remote_add(repo.path, "origin", repo.remote)
    
    fixed_repos.append(repo)
```

### 5. Update Inventory

```yaml
# Re-run discovery to update inventory
invoke: scout.repo-discover

output: "📋 Inventory updated"
```

### 6. Output Summary

```
🔧 Repo Reconcile Complete

Snapshot: ${snapshot_id}

Actions:
├── Cloned: ${cloned_repos.length} repos
├── Fixed: ${fixed_repos.length} repos
├── Failed: ${failed_repos.length} repos
└── Manual: ${manual_fixes.length} repos need attention

${if failed_repos.length > 0}
Failed clones:
${for repo in failed_repos}
  ❌ ${repo.name}: ${repo.error}
${endfor}
${endif}

${if manual_fixes.length > 0}
Manual fixes needed:
${for repo in manual_fixes}
  ⚠️ ${repo.name}: merge conflict
${endfor}
${endif}

Rollback: @scout rollback ${snapshot_id}
```

---

## Rollback Support

If something goes wrong:

```bash
@scout rollback ${snapshot_id}
```

Rollback process:
1. Load snapshot metadata
2. For newly cloned repos: remove directory
3. For fixed repos: restore to snapshot state (if possible)
4. Report what was restored
