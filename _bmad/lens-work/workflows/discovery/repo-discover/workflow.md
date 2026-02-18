---
name: repo-discover
description: Inventory TargetProjects vs service map (no mutation)
agent: scout
trigger: "@scout discover"
category: discovery
mutates: false
---

# Repo Discover Workflow

**Purpose:** Inventory TargetProjects vs service map without making any changes.

---

## Execution Sequence

### 0. Ensure Correct Branch

```bash
# Ensure clean working tree in BMAD control repo
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before repo-discover."
  exit 1
fi

# Use active branch from state if available
active_branch=""
if [ -f "_bmad-output/lens-work/state.yaml" ]; then
  active_branch=$(awk -F'"' '/active:/ {print $2}' _bmad-output/lens-work/state.yaml)
fi

if [ -z "$active_branch" ]; then
  active_branch=$(git branch --show-current)
  echo "Warning: No active branch in state. Using current branch: $active_branch"
fi

git fetch origin
git checkout "$active_branch"
git pull origin "$active_branch"
```

### 1. Determine Scope

```yaml
# Based on current layer from state
layer = state.initiative.layer

scope_rules:
  domain: "All repos in domain (prompt: all vs subset)"
  service: "All repos in service"
  repo: "Target repo only"
  feature: "Target repo + declared deps from service map"
```

### 2. Load Service Map

```yaml
# Load service map from standard locations
service_map_paths:
  - "_bmad/lens-work/service-map.yaml"
  - "_lens/domain-map.yaml"
  - "lens/domain-map.yaml"

for path in service_map_paths:
  if file_exists(path):
    service_map = load(path)
    break
```

### 3. Scan TargetProjects

```bash
# Build actual repo list
target_projects_path="${config.target_projects_path}"

actual_repos=()
for dir in $(find "${target_projects_path}" -maxdepth 4 -type d -name ".git" -exec dirname {} \;); do
  repo_name=$(basename "$dir")
  remote=$(git -C "$dir" remote get-url origin 2>/dev/null || echo "no-remote")
  actual_repos+=("${repo_name}:${remote}")
done
```

### 4. Compare Expected vs Actual

```yaml
comparison:
  matched: []    # In both service map and TargetProjects
  missing: []    # In service map but not TargetProjects
  extra: []      # In TargetProjects but not service map

for repo in service_map.repos:
  if repo in actual_repos:
    matched.append(repo)
  else:
    missing.append(repo)

for repo in actual_repos:
  if repo not in service_map.repos:
    extra.append(repo)
```

### 5. Write Inventory

Write to `_bmad-output/lens-work/repo-inventory.yaml`:

```yaml
version: 1
scanned_at: "${ISO_TIMESTAMP}"
layer: ${layer}
scope: ${scope_name}

repos:
  matched:
    - name: api-gateway
      path: TargetProjects/payment-domain/payment-service/api-gateway
      remote: git@github.com:org/api-gateway.git
      default_branch: main
      status: healthy
      
  missing:
    - name: payment-processor
      expected_path: TargetProjects/payment-domain/payment-service/payment-processor
      remote: git@github.com:org/payment-processor.git
      action_required: clone
      
  extra:
    - name: old-gateway
      path: TargetProjects/payment-domain/payment-service/old-gateway
      note: "Not in service map—consider archiving"

summary:
  total_expected: ${service_map.repos.length}
  matched: ${matched.length}
  missing: ${missing.length}
  extra: ${extra.length}
```

### 6. Output Summary

```
🔍 Repo Discovery Complete

Scope: ${scope_name} (${layer} layer)
Scanned: ${actual_repos.length} repos in TargetProjects
Expected: ${service_map.repos.length} repos from service map

Results:
├── ✅ Matched: ${matched.length}
├── ⚠️ Missing: ${missing.length}
└── ❓ Extra: ${extra.length}

${if missing.length > 0}
Missing repos (need clone):
${for repo in missing}
  - ${repo.name}: ${repo.remote}
${endfor}
${endif}

Inventory saved to: _bmad-output/lens-work/repo-inventory.yaml

Next: Run '@scout reconcile' to clone missing repos
```

### 7. Commit Inventory Changes

```bash
# Stage inventory output
git add _bmad-output/lens-work/repo-inventory.yaml

# Commit only if there are changes
if ! git diff-index --quiet HEAD --; then
  git commit -m "discovery(repo-discover): Update repo inventory"
  git push origin "$active_branch"
else
  echo "No inventory changes to commit."
fi
```

---

## No Mutations

This workflow is **read-only**:
- ✅ Reads service map
- ✅ Scans TargetProjects directories
- ✅ Writes inventory file
- ❌ Does NOT clone repos
- ❌ Does NOT modify repos
- ❌ Does NOT delete anything
