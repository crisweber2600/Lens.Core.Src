---
name: repo-status
description: Fast health check for repos
agent: "@lens/discovery"
trigger: "@lens repo-status"
category: discovery
mutates: false
---

# Repo Status Workflow

**Purpose:** Fast health check for confidence scoring—no mutations.

---

## Execution Sequence

### 1. Load Inventory or Scan

```yaml
if file_exists("_bmad-output/lens-work/repo-inventory.yaml"):
  inventory = load("_bmad-output/lens-work/repo-inventory.yaml")
  repos = inventory.repos.matched
else:
  # Quick scan without full discovery
  repos = scan_target_projects()
```

### 2. Health Checks Per Repo

```yaml
for repo in repos:
  status = {
    name: repo.name,
    path: repo.path,
    checks: {}
  }
  
  # Check 1: Remote configured
  status.checks.remote = git_remote_exists(repo.path)
  
  # Check 2: Default branch exists
  status.checks.branch = git_branch_exists(repo.path, repo.default_branch)
  
  # Check 3: Working tree clean
  status.checks.clean = git_is_clean(repo.path)
  
  # Check 4: Synced with remote
  fetch_result = git_fetch(repo.path)
  status.checks.synced = {
    behind: git_commits_behind(repo.path),
    ahead: git_commits_ahead(repo.path)
  }
  
  # Check 5: No merge conflicts
  status.checks.conflicts = not git_has_conflicts(repo.path)
  
  # Overall status
  if all_checks_pass(status.checks):
    status.overall = "healthy"
  elif critical_checks_fail(status.checks):
    status.overall = "unhealthy"
  else:
    status.overall = "warning"
  
  results.append(status)
```

### 3. Output Report

```
📊 Repo Status Report

${for repo in results}
${repo.name}: ${status_icon(repo.overall)}
├── Remote: ${check_icon(repo.checks.remote)}
├── Branch: ${check_icon(repo.checks.branch)}
├── Clean: ${check_icon(repo.checks.clean)}
├── Synced: ${sync_status(repo.checks.synced)}
└── Conflicts: ${check_icon(repo.checks.conflicts)}

${endfor}

Summary:
├── ✅ Healthy: ${healthy_count}
├── ⚠️ Warning: ${warning_count}
└── ❌ Unhealthy: ${unhealthy_count}
```

---

## Status Icons

| Status | Icon |
|--------|------|
| healthy | ✅ |
| warning | ⚠️ |
| unhealthy | ❌ |
| check pass | ✅ |
| check fail | ❌ |
| behind remote | ⚠️ (N commits behind) |
| ahead of remote | 📤 (N commits ahead) |

---

## Use Cases

1. **Pre-documentation check** — Ensure repos are healthy before generating docs
2. **Confidence scoring** — Feed into layer detection confidence
3. **Quick diagnostics** — Fast overview without full discovery
