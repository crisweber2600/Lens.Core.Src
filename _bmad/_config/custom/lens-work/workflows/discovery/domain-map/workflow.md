---
name: domain-map
description: View, create, and edit domain architecture map
agent: scout
trigger: "@scout domain-map"
category: discovery
mutates: true
supports: [create, view, edit]
---

# Domain Map Workflow

**Purpose:** View, create, and edit the domain architecture map used by lens-work workflows.

**Agent:** Scout (discovery), with Casey handling git operations.

---

## Prerequisites

```yaml
# Domain map is stored at:
domain_map_path: "_bmad-output/lens-work/domain-map.yaml"

# Optional inputs that enhance discovery:
service_map_path: "_bmad-output/lens-work/service-map.yaml"
repo_inventory_path: "_bmad-output/lens-work/repo-inventory.yaml"
```

---

## Execution Sequence

### Step 0: Verify Clean Git State (Casey)

```bash
# Casey verifies clean working tree in BMAD control repo
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before domain-map operations."
  exit 1
fi

# Sync with remote
git fetch origin
active_branch=$(git branch --show-current)
```

### Step 1: Load or Initialize Domain Map

#### 1a. Read Existing Map

```yaml
if file_exists("_bmad-output/lens-work/domain-map.yaml"):
  domain_map = load("_bmad-output/lens-work/domain-map.yaml")
  mode = "edit"
else:
  mode = "create"
  # Proceed to auto-discovery
```

#### 1b. Auto-Discover Git Remote URLs

**CRITICAL:** For each repository in TargetProjects, detect the remote git URL:

```bash
# For each repository directory under TargetProjects/
for repo_path in $(find TargetProjects/ -maxdepth 4 -type d -name ".git" -exec dirname {} \;); do
  repo_name=$(basename "$repo_path")
  remote=$(git -C "$repo_path" remote get-url origin 2>/dev/null || echo "(local repository - no remote configured)")
  primary_branch=$(git -C "$repo_path" branch --show-current 2>/dev/null || echo "main")
  echo "${repo_name}:${remote}:${primary_branch}"
done
```

#### 1c. Initialize Map Structure

```yaml
# If no domain-map.yaml exists, auto-generate from TargetProjects structure
# Populate git_repo with detected remote URLs
# Set primary_branch from git branch detection

domain_map:
  version: 1
  updated_at: "${ISO_TIMESTAMP}"
  domains:
    - name: ${domain_name}         # kebab-case
      description: ""
      services:
        - name: ${service_name}    # kebab-case
          git_repo: ${detected_remote_url}
          primary_branch: ${detected_branch}
          local_path: "TargetProjects/${org}/${domain}/${repo}"
          microservices: []
```

#### 1d. Present Summary

```
Domain Map Summary (${mode})

Domains: ${domain_map.domains.length}
Services: ${total_services}
Repositories: ${total_repos}

${for domain in domain_map.domains}
  ${domain.name}
  ${for svc in domain.services}
    - ${svc.name}: ${svc.git_repo}
      Branch: ${svc.primary_branch}
      ${if svc.git_repo == "(local repository - no remote configured)"}
      WARNING: No remote configured
      ${endif}
  ${endfor}
${endfor}
```

### Step 2: Edit Map (CRUD Operations)

#### Supported Operations

| Operation | Description |
|-----------|-------------|
| **create** | Add new domains, services, or microservices |
| **view** | Display current map structure and details |
| **edit** | Update names, descriptions, git URLs, branches |

#### 2a. Collect Changes

```yaml
# Prompt user for requested changes
prompt: |
  What would you like to do?

  [A] Add domain/service/microservice
  [E] Edit existing entry
  [R] Remove entry
  [V] View current map
  [D] Done (save and exit)
```

#### 2b. Validate Changes

```yaml
# All names must be kebab-case
for entry in changes:
  if not matches(entry.name, /^[a-z0-9]+(-[a-z0-9]+)*$/):
    error: "Name '${entry.name}' must be kebab-case"

# Verify no duplicate names within same level
# Verify git URLs are reachable (optional)
```

#### 2c. Apply Changes

```yaml
# Apply add/remove/update operations to in-memory map
updated_domain_map = apply_changes(domain_map, changes)
updated_domain_map.updated_at = "${ISO_TIMESTAMP}"
```

### Step 3: Save Map

```yaml
# Ensure output directory exists
ensure_directory("_bmad-output/lens-work/")

# Write domain-map.yaml
save(updated_domain_map, "_bmad-output/lens-work/domain-map.yaml")

output: |
  Domain map saved to: _bmad-output/lens-work/domain-map.yaml

  Changes:
  ${for change in changes}
    - ${change.type}: ${change.target}
  ${endfor}
```

### Step 4: Casey Commits Changes

```bash
# Stage domain map output
git add _bmad-output/lens-work/domain-map.yaml

# Commit only if there are changes
if ! git diff-index --quiet HEAD --; then
  git commit -m "discovery(domain-map): ${mode} domain architecture map

Updated domains: ${updated_domains_count}
Updated services: ${updated_services_count}
Mode: ${mode}"

  git push origin "$active_branch"
else
  echo "No domain map changes to commit."
fi
```

### Step 5: Output Summary

```
Domain Map ${mode == "create" ? "Created" : "Updated"}

File: _bmad-output/lens-work/domain-map.yaml
Domains: ${updated_domain_map.domains.length}
Services: ${total_services}

${if mode == "create"}
Next Steps:
  - Run '@scout discover' to inventory TargetProjects
  - Run '@scout impact-analysis' to analyze cross-boundary impacts
${endif}
```

---

## Domain Map Schema

```yaml
version: 1
updated_at: "2026-02-06T00:00:00Z"
domains:
  - name: payment                   # kebab-case
    description: "Payment processing domain"
    services:
      - name: payment-gateway
        description: "API gateway for payment"
        git_repo: "git@github.com:org/payment-gateway.git"
        primary_branch: main
        local_path: "TargetProjects/org/payment/payment-gateway"
        microservices:
          - name: transaction-processor
            description: "Core transaction engine"
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| domain-map.yaml not found | Auto-discover from TargetProjects |
| Invalid kebab-case name | Reject and prompt for correction |
| Git remote unreachable | Warn but allow save |
| Uncommitted changes | Block until resolved |

---

## Checklist

- [ ] Clean git state verified (Step 0)
- [ ] Domain map loaded or initialized
- [ ] Git remote URLs discovered
- [ ] User edits applied and validated
- [ ] Map saved to `_bmad-output/lens-work/domain-map.yaml`
- [ ] Changes committed by Casey
