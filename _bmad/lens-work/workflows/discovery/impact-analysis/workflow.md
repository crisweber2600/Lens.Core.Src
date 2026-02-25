---
name: impact-analysis
description: Analyze cross-boundary impacts of proposed changes
agent: scout
trigger: "@scout impact-analysis"
category: discovery
mutates: false
---

# Impact Analysis Workflow

**Purpose:** Analyze cross-boundary impacts of proposed changes across domains, services, and repositories.

**Agent:** Scout (discovery), with Compass for routing context.

---

## Prerequisites

```yaml
# Primary data sources (required - at least one must exist)
service_map_path: "_bmad-output/lens-work/service-map.yaml"
repo_inventory_path: "_bmad-output/lens-work/repo-inventory.yaml"

# Optional enhancement (enriches analysis but NOT required)
domain_map_path: "_bmad-output/lens-work/domain-map.yaml"

# Multi-repo awareness
target_projects_root: "TargetProjects/"

# Branch naming pattern for initiative context
# Flat, hyphen-separated: {featureBranchRoot}[-{audience}[-p{N}]]
# Example: chat-spark-backend-alignment-50cf37-small-preplan
```

> **Note:** The domain map enhances impact analysis with richer boundary information, but is not required. The workflow operates with service map and/or repo inventory alone.

---

## Execution Sequence

### Step 0: Verify Clean Git State (Casey)

```bash
# Casey verifies clean working tree in BMAD control repo
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before impact-analysis."
  exit 1
fi

# Sync with remote
git fetch origin
active_branch=$(git branch --show-current)
```

### Step 1: Capture Change Scope

#### 1a. Collect Change Description

```yaml
prompt: |
  Describe the proposed change for impact analysis:

  **Change description:** (what is being changed)
  **Affected paths or services:** (optional - specific files, dirs, or service names)
  **Initiative context:** (optional - initiative ID or branch name)
```

#### 1b. Resolve Context

```yaml
# Load available data sources
sources_loaded = []

if file_exists("_bmad-output/lens-work/service-map.yaml"):
  service_map = load("_bmad-output/lens-work/service-map.yaml")
  sources_loaded.append("service-map")

if file_exists("_bmad-output/lens-work/repo-inventory.yaml"):
  repo_inventory = load("_bmad-output/lens-work/repo-inventory.yaml")
  sources_loaded.append("repo-inventory")

if file_exists("_bmad-output/lens-work/domain-map.yaml"):
  domain_map = load("_bmad-output/lens-work/domain-map.yaml")
  sources_loaded.append("domain-map")

if sources_loaded.length == 0:
  error: |
    No data sources found. At least one of these must exist:
    - _bmad-output/lens-work/service-map.yaml
    - _bmad-output/lens-work/repo-inventory.yaml

    Run '@scout discover' or '@scout bootstrap' first.
  exit: 1
```

#### 1c. Extract Affected Paths and Branch Context

```yaml
impact_scope:
  description: "${user_description}"
  affected_paths: ${user_paths or []}
  initiative_id: ${resolved_initiative_id or null}
  branch: ${resolved_branch or null}
  sources: ${sources_loaded}
```

### Step 2: Analyze Cross-Boundary Impacts

#### 2a. Map to Domain/Service Boundaries

```yaml
# For each affected path or service, determine boundary crossings
affected_boundaries = []

for path in impact_scope.affected_paths:
  # Resolve which domain/service owns this path
  owning_service = resolve_service(path, service_map)
  owning_domain = resolve_domain(owning_service, domain_map)  # null if no domain map
  affected_boundaries.append({
    path: path,
    service: owning_service,
    domain: owning_domain
  })
```

#### 2b. Identify Dependencies (Multi-Repo Awareness)

```yaml
# Scan TargetProjects/ for cross-repo dependencies
dependencies:
  upstream: []     # Services that the change depends on
  downstream: []   # Services affected by the change
  shared: []       # Shared contracts, APIs, data models

for boundary in affected_boundaries:
  # Check service map for declared dependencies
  if service_map:
    deps = service_map.get_dependencies(boundary.service)
    for dep in deps:
      if dep.direction == "upstream":
        dependencies.upstream.append(dep)
      elif dep.direction == "downstream":
        dependencies.downstream.append(dep)

  # Check for shared contracts in TargetProjects/
  shared_contracts = scan_shared_contracts(boundary.path, "TargetProjects/")
  dependencies.shared.extend(shared_contracts)
```

#### 2c. Risk Assessment

```yaml
risk_factors = []

# Cross-domain change (highest risk)
if unique_domains(affected_boundaries).length > 1:
  risk_factors.append({
    level: "high",
    reason: "Change spans multiple domains",
    domains: unique_domains(affected_boundaries)
  })

# Cross-service change
if unique_services(affected_boundaries).length > 1:
  risk_factors.append({
    level: "medium",
    reason: "Change spans multiple services",
    services: unique_services(affected_boundaries)
  })

# Shared contract modification
if dependencies.shared.length > 0:
  risk_factors.append({
    level: "high",
    reason: "Modifies shared contracts",
    contracts: dependencies.shared
  })

# Multi-repo impact
affected_repos = unique_repos(affected_boundaries)
if affected_repos.length > 1:
  risk_factors.append({
    level: "medium",
    reason: "Impacts multiple repositories",
    repos: affected_repos
  })

overall_risk = max(risk_factors.map(r => r.level)) or "low"
```

#### 2d. Build Impact Summary

```yaml
impact_summary:
  overall_risk: ${overall_risk}
  affected_domains: ${unique_domains}
  affected_services: ${unique_services}
  affected_repos: ${affected_repos}
  dependencies: ${dependencies}
  risk_factors: ${risk_factors}
  boundary_crossings: ${affected_boundaries.length}
```

### Step 3: Present Impact Report

```
Impact Analysis Report

Change: ${impact_scope.description}
Overall Risk: ${overall_risk}
Data Sources: ${sources_loaded.join(", ")}
${if impact_scope.initiative_id}
Initiative: ${impact_scope.initiative_id}
Branch pattern: {domain}/${impact_scope.initiative_id}/{size}-{phase_number}
${endif}

Affected Boundaries:
${for boundary in affected_boundaries}
  - ${boundary.domain or "(no domain map)"}/${boundary.service}
    Path: ${boundary.path}
${endfor}

Dependencies:
  Upstream: ${dependencies.upstream.length}
  ${for dep in dependencies.upstream}
    - ${dep.service}: ${dep.description}
  ${endfor}

  Downstream: ${dependencies.downstream.length}
  ${for dep in dependencies.downstream}
    - ${dep.service}: ${dep.description}
  ${endfor}

  Shared Contracts: ${dependencies.shared.length}
  ${for contract in dependencies.shared}
    - ${contract.path}: used by ${contract.consumers.join(", ")}
  ${endfor}

Risk Factors:
${for risk in risk_factors}
  [${risk.level}] ${risk.reason}
${endfor}

${if overall_risk == "high"}
RECOMMENDATION: Consider breaking this change into smaller,
domain-scoped initiatives to reduce cross-boundary risk.
${endif}

Repositories Involved: ${affected_repos.length}
${for repo in affected_repos}
  - ${repo.name} (${repo.local_path})
${endfor}
```

### Step 4: Suggest Next Actions

```yaml
next_actions = []

if overall_risk == "high":
  next_actions.append("Consider splitting into domain-scoped initiatives")

if not domain_map:
  next_actions.append("Run '@scout domain-map' to enrich future analyses")

if affected_repos.length > 1:
  next_actions.append("Verify repo-level branch alignment for multi-repo changes")

next_actions.append("Run '@compass /plan' to begin planning with impact context")

output: |
  Next Actions:
  ${for action in next_actions}
    - ${action}
  ${endfor}
```

---

## Data Source Behavior

| Source | Required | Provides |
|--------|----------|----------|
| `service-map.yaml` | At least one | Service-to-repo mapping, declared dependencies |
| `repo-inventory.yaml` | At least one | Discovered repos, health status, remote URLs |
| `domain-map.yaml` | Optional | Domain boundaries, hierarchy, enriched context |

When the domain map is absent, the analysis still runs using service-level boundaries. Domain-level risk factors (cross-domain changes) will not be detected without the domain map.

---

## Multi-Repo Awareness

Impact analysis is multi-repo aware via `TargetProjects/`:

```
TargetProjects/
  {Org}/
    {Domain}/
      {Repo}/         <-- Each repo scanned for cross-boundary dependencies
```

Cross-repo shared contracts are detected by scanning for:
- Shared API definitions (OpenAPI, protobuf, GraphQL schemas)
- Shared data models (database migrations, entity definitions)
- Shared libraries (referenced in package managers)
- Shared configuration (environment variables, feature flags)

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No data sources found | Direct user to run discovery workflows first |
| Service not in map | Warn and mark as "unmapped" in report |
| TargetProjects empty | Report based on service map only |
| Uncommitted changes | Block until resolved |

---

## Checklist

- [ ] Clean git state verified (Step 0)
- [ ] Change scope captured from user
- [ ] Data sources loaded (service map and/or repo inventory)
- [ ] Domain map loaded if available (optional enhancement)
- [ ] Cross-boundary impacts analyzed
- [ ] Multi-repo dependencies scanned
- [ ] Risk assessment computed
- [ ] Impact report presented
- [ ] Next actions suggested
