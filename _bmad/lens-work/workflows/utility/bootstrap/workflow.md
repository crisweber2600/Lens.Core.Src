---
name: bootstrap
description: Setup TargetProjects from service map
agent: scout
trigger: "@scout bootstrap"
category: utility
---

# Bootstrap Workflow

**Purpose:** Set up TargetProjects by running discovery, reconcile, and documentation.

**⚠️ CRITICAL:** For domain-level initiatives with multiple target repos, bootstrap MUST prompt for domain/service structure BEFORE cloning. Never create flat TargetProjects layouts for domain initiatives.

---

## Execution Sequence

### 0. Ensure Correct Branch

```bash
# Ensure clean working tree in BMAD control repo
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before bootstrap."
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

### 1. Check Active Initiative Context

```yaml
# Load active initiative from state
state_file = "_bmad-output/lens-work/state.yaml"

if file_exists(state_file):
  state = load(state_file)
  initiative = state.initiative
  layer = initiative.layer
  target_repos = initiative.target_repos or []
else:
  layer = null
  target_repos = []

# If domain-level with multiple repos, ask for domain/service structure
if layer == "domain" AND target_repos.length > 1:
  output: |
    📦 Domain Initiative Detected: '${initiative.name}'
    
    Target repos (${target_repos.length}):
    ${for repo in target_repos}
      - ${repo}
    ${endfor}
    
    Specify the domain/service path for each repo.
    Format: DOMAIN/SERVICE (e.g., COLLABORATION/FRONTEND)
    
    This ensures repos are organized as:
    TargetProjects/COLLABORATION/FRONTEND/bmad-chat
    TargetProjects/ORCHESTRATION/BACKEND/bmadServer
  
  repo_assignments = {}
  for repo in target_repos:
    output: f"Domain/Service path for '{repo}'? "
    domain_service_path = read_input()
    repo_assignments[repo] = domain_service_path
  
  # Persist assignments in state
  state.initiative.repo_domain_assignments = repo_assignments
  save(state, state_file)
  
  output: |
    ✅ Domain structure configured:
    ${for repo, path in repo_assignments}
      - ${repo} → TargetProjects/${path}/${repo}
    ${endfor}
else:
  # Single repo or feature—use service map structure
  repo_assignments = state.initiative.repo_domain_assignments or {}
```

### 2. Check Prerequisites

```yaml
# Check for service map
service_map_paths = [
  "_bmad/lens-work/service-map.yaml",
  "_lens/domain-map.yaml",
  "lens/domain-map.yaml"
]

service_map = null
service_map_path = null
for path in service_map_paths:
  if file_exists(path):
    service_map = load(path)
    service_map_path = path
    break

# Normalize existing service map to domain/service structure
if service_map != null AND layer == "domain" AND repo_assignments.length > 0:
  output: "🔧 Updating service map with domain/service hierarchy..."

  for repo in service_map.repos:
    if repo.name in repo_assignments:
      domain_service = repo_assignments[repo.name]
      repo.local_path = "TargetProjects/${domain_service}/${repo.name}"

  save(service_map, service_map_path)
  output: "✅ Service map updated with domain/service paths"

if service_map == null:
  # For domain initiatives, create service map WITH domain/service paths
  if layer == "domain":
    output: "📝 Creating service map from domain initiative structure..."
    service_map = {
      target_projects_path: "TargetProjects",
      repos: []
    }
    
    # Build repos array using captured domain/service assignments
    for repo_name in target_repos:
      if repo_name in repo_assignments:
        domain_service = repo_assignments[repo_name]
        local_path = "TargetProjects/${domain_service}/${repo_name}"
      else:
        # Fallback (shouldn't happen if step 0 ran)
        local_path = "TargetProjects/${repo_name}"
      
      repo_entry = {
        name: repo_name,
        local_path: local_path
        # remote_url and default_branch filled during discovery
      }
      service_map.repos.append(repo_entry)
    
    service_map_path = "_bmad/lens-work/service-map.yaml"
    save(service_map, service_map_path)
    output: "✅ Service map created with domain/service hierarchy"
  else:
    # Non-domain initiatives require existing service map
    output: |
      ⚠️ No service map found.
      
      Bootstrap requires a service map at one of:
      - _bmad/lens-work/service-map.yaml
      - _lens/domain-map.yaml
      - lens/domain-map.yaml
      
      Create a service map first, then run bootstrap again.
    exit: 1
```

### 3. Run Discovery

```yaml
invoke: scout.repo-discover

inventory = load("_bmad-output/lens-work/repo-inventory.yaml")
```

### 4. Confirm Actions

```yaml
output: |
  📋 Bootstrap Plan
  
  Service map: ${service_map_path}
  TargetProjects: ${config.target_projects_path}
  
  Actions:
  ├── Clone: ${inventory.repos.missing.length} repos
  ├── Document: ${inventory.repos.matched.length + inventory.repos.missing.length} repos
  └── Skip: ${inventory.repos.extra.length} extra repos (not in service map)
  
  Estimated time: ${estimate_time(inventory)} minutes
  
  Proceed? [Y]es / [N]o
```

### 5. Run Reconcile

```yaml
if confirmed:
  invoke: scout.repo-reconcile
```

### 6. Run Documentation

```yaml
invoke: scout.repo-document
params:
  mode: "full"
```

### 7. Generate Report

```yaml
report = {
  timestamp: now(),
  service_map: service_map_path,
  target_projects: config.target_projects_path,
  repos_cloned: cloned_count,
  repos_documented: documented_count,
  errors: errors,
  duration: duration
}

save_markdown(report, "_bmad-output/lens-work/bootstrap-report.md")
```

### 8. Commit Bootstrap Changes

```bash
# Stage bootstrap outputs
git add _bmad/lens-work/service-map.yaml \
  _bmad-output/lens-work/repo-inventory.yaml \
  _bmad-output/lens-work/bootstrap-report.md \
  _bmad-output/lens-work/event-log.jsonl \
  _bmad-output/lens-work/state.yaml \
  Docs

# Commit only if there are changes
if ! git diff-index --quiet HEAD --; then
  git commit -m "utility(bootstrap): Initialize TargetProjects structure"
  git push origin "$active_branch"
else
  echo "No bootstrap changes to commit."
fi
```

### 9. Output Summary

```
✅ Bootstrap Complete

Duration: ${report.duration}

Results:
├── Cloned: ${report.repos_cloned} repos
├── Documented: ${report.repos_documented} repos
${if report.errors.length > 0}
├── Errors: ${report.errors.length}
${endif}
└── Report: _bmad-output/lens-work/bootstrap-report.md

Canonical docs at: Docs/

Ready to start an initiative:
└── Run #new-feature "your-feature-name"
```
