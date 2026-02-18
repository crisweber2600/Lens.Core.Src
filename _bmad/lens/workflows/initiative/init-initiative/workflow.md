---
name: init-initiative
description: Create new initiative with branch topology and state
agent: lens
trigger: /new command
category: initiative
---

# /new — Initialize Initiative

**Purpose:** Create a new initiative (domain, service, or feature) with branch topology, state initialization, and event logging.

---

## Execution Sequence

### 0. Git Discipline

```yaml
skill: git-orchestration.verify-clean-state

state = load_if_exists("_bmad-output/lens/state.yaml")
```

### 1. Gather Initiative Info

```yaml
output: |
  🔭 /new — Create Initiative
  
  What type of initiative?
  
  **[D]** Domain — organizational grouping (single branch)
  **[S]** Service — service within a domain (single branch)
  **[F]** Feature — feature/microservice with full lifecycle (full topology)

# User selects type
initiative_type = user_input    # domain | service | feature

# Gather common fields
ask: initiative_name            # "My Feature"
ask: initiative_id              # auto-generated from name: "my-feature"
ask: description                # brief description
```

### 2. Type-Specific Configuration

#### Domain:
```yaml
if initiative_type == "domain":
  ask: domain_prefix            # e.g., "payment"
  
  featureBranchRoot = null      # domains don't have feature branches
  branch_name = domain_prefix   # single branch
```

#### Service:
```yaml
if initiative_type == "service":
  # List existing domains
  domains = list_directories("_bmad-output/lens/initiatives/*/Domain.yaml")
  ask: parent_domain            # select from existing domains
  ask: service_prefix           # e.g., "gateway"

  domain_prefix = parent_domain.domain_prefix
  featureBranchRoot = null
  branch_name = "${domain_prefix}-${service_prefix}"
```

#### Feature:
```yaml
if initiative_type == "feature":
  # List existing services
  services = list_service_configs()
  ask: parent_service           # select from existing services (or domain if no service)
  ask: feature_id               # e.g., "auth-flow"

  domain_prefix = parent_service.domain_prefix
  service_prefix = parent_service.service_prefix
  featureBranchRoot = "${domain_prefix}-${service_prefix}-${feature_id}"
```

### 3. Audience Configuration (Feature only)

```yaml
if initiative_type == "feature":
  # Show default audiences from config
  default_audiences = config.default_audiences    # "small,medium,large"
  
  output: |
    Audience configuration determines PR review groups per phase.
    Default: ${default_audiences}
    
    Accept defaults? [Y/n/custom]

  if user_input == "custom":
    ask: audiences              # comma-separated list
  else:
    audiences = default_audiences.split(",")

  # Build review audience map
  review_audience_map = {
    p1: audiences[0],           # first = smallest
    p2: audiences.length > 1 ? audiences[1] : audiences[0],
    p3: audiences[audiences.length - 1],    # last = largest
    p4: audiences[audiences.length - 1],
    p5: audiences[audiences.length - 1],
    p6: audiences[audiences.length - 1]
  }
```

### 4. Create Branch Topology

```yaml
skill: git-orchestration.init-topology
params:
  type: ${initiative_type}
  branch_name: ${branch_name || featureBranchRoot}

if initiative_type == "domain":
  # Single branch
  skill: git-orchestration.create-and-push(domain_prefix)
  output: |
    🌿 Created domain branch: ${domain_prefix}

elif initiative_type == "service":
  # Single branch
  skill: git-orchestration.create-and-push(branch_name)
  output: |
    🌿 Created service branch: ${branch_name}

elif initiative_type == "feature":
  # Root + audience branches (4 total with defaults)
  branches_created = []
  
  skill: git-orchestration.create-and-push(featureBranchRoot)
  branches_created.append(featureBranchRoot)

  for audience in audiences:
    audience_branch = "${featureBranchRoot}-${audience}"
    skill: git-orchestration.create-and-push(audience_branch)
    branches_created.append(audience_branch)

  output: |
    🌿 Created branch topology:
    ${featureBranchRoot}
    ${audiences.map(a => "├── ${featureBranchRoot}-${a}").join("\n")}
    
    Total: ${branches_created.length} branches (all pushed to remote)
```

### 5. Initialize State

```yaml
# Create initiative config
initiative_config = {
  id: ${initiative_id},
  name: ${initiative_name},
  type: ${initiative_type},
  description: ${description},
  domain_prefix: ${domain_prefix},
  service_prefix: ${service_prefix || null},
  feature_branch_root: ${featureBranchRoot || null},
  audiences: ${audiences || null},
  review_audience_map: ${review_audience_map || null},
  docs_path: "docs/${domain_prefix}/${service_prefix || ''}/${initiative_id}/",
  current_phase: null,
  created_at: "${ISO_TIMESTAMP}",
  gate_status: {
    pre-plan: "not-started",
    plan: "not-started",
    tech-plan: "not-started",
    story-gen: "not-started",
    review: "not-started",
    dev: "not-started"
  }
}

# Write initiative config
write_file("_bmad-output/lens/initiatives/${initiative_id}.yaml", initiative_config)

# Update state.yaml
skill: state-management.update
params:
  active_initiative: {
    id: ${initiative_id},
    type: ${initiative_type},
    phase: null,
    feature_branch_root: ${featureBranchRoot},
    audiences: ${audiences},
    current_audience: null,
    current_phase_branch: null,
    gate_status: initiative_config.gate_status,
    checklist: {}
  }
  workflow_status: "idle"
```

### 6. Log Event

```yaml
skill: state-management.log-event("initiative_created", {
  id: ${initiative_id},
  type: ${initiative_type},
  name: ${initiative_name},
  branches: ${branches_created || [branch_name]}
})
```

### 7. Commit & Confirm

```yaml
skill: git-orchestration.commit-and-push
params:
  paths:
    - "_bmad-output/lens/state.yaml"
    - "_bmad-output/lens/initiatives/${initiative_id}.yaml"
    - "_bmad-output/lens/event-log.jsonl"
  message: "[lens] /new: ${initiative_type} initiative — ${initiative_id}"
  branch: ${branch_name || featureBranchRoot}

output: |
  ✅ Initiative created
  ├── Name: ${initiative_name}
  ├── Type: ${initiative_type}
  ├── ID: ${initiative_id}
  ├── Branch root: ${branch_name || featureBranchRoot}
  └── Next: Run /pre-plan to begin the lifecycle
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Branch already exists | Ask: use existing or pick different name |
| No parent domain (service) | Run /new-domain first |
| No parent service (feature) | Run /new-service first |
| Push failed | Check remote connectivity |
| State write failed | Retry, then show manual instructions |

## Post-Conditions

- [ ] Initiative config written to initiatives/
- [ ] Branch topology created and pushed
- [ ] state.yaml updated with active_initiative
- [ ] event-log.jsonl entry appended
- [ ] All branches pushed to remote
