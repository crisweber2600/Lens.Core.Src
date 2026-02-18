---
name: 'step-01-select-target'
description: 'Select discovery target'
nextStepFile: './step-02-extract-context.md'
---

# Step 1: Select Target

## Goal
Present available discovery targets from lens metadata and capture user selection. Enable both single-target and batch discovery modes.

## Instructions

### 1. Load Available Targets
Build target tree from lens metadata:

```yaml
available_targets:
  domains:
    - name: "Platform"
      path: "platform/"
      discovery_status: discovered|stale|never
      last_discovered: ISO8601|null
      services_count: N
      microservices_count: N
      
  services:
    - domain: "Platform"
      name: "Auth"
      path: "platform/auth/"
      discovery_status: discovered|stale|never
      last_discovered: ISO8601|null
      microservices_count: N
      
  microservices:
    - domain: "Platform"
      service: "Auth"
      name: "auth-api"
      path: "platform/auth/auth-api/"
      discovery_status: discovered|stale|never
      last_discovered: ISO8601|null
      tech_stack: ["typescript", "express"]
      status: active|deprecated|planned
```

### 2. Present Selection Interface
Display hierarchical view:

```
AVAILABLE DISCOVERY TARGETS
═══════════════════════════════════════════════════════════════════

DOMAINS (discover all services within):
  [D1] Platform (3 services, 8 microservices)
       Last discovered: 2026-01-15 ⚡ STALE
  [D2] Business (2 services, 5 microservices)
       Last discovered: never

SERVICES (discover all microservices within):
  [S1] Platform/Auth (3 microservices)
       Last discovered: 2026-01-28
  [S2] Platform/Users (2 microservices)
       Last discovered: never
  [S3] Business/Orders (3 microservices)
       Last discovered: 2026-01-20 ⚡ STALE

MICROSERVICES (discover single service):
  [M1] Platform/Auth/auth-api      [typescript,express]  ✓ recent
  [M2] Platform/Auth/auth-worker   [typescript]          ⚡ stale
  [M3] Platform/Users/user-api     [python,fastapi]      ○ never
  [M4] Business/Orders/order-api   [java,spring]         ⚡ stale
  ...

───────────────────────────────────────────────────────────────────
Legend: ✓ discovered recently  ⚡ stale (>7 days)  ○ never discovered

Enter selection (e.g., D1, S2, M3) or 'all' for full discovery:
Multiple selections: M1,M3,M4 or M1-M4
Filter by status: 'stale' or 'never':
```

### 3. Handle Selection Modes

**Single target:**
```yaml
selection:
  mode: single
  target:
    type: microservice
    path: "platform/auth/auth-api/"
```

**Multiple explicit:**
```yaml
selection:
  mode: multiple
  targets:
    - type: microservice
      path: "platform/auth/auth-api/"
    - type: microservice  
      path: "platform/users/user-api/"
```

**Hierarchical (domain/service):**
```yaml
selection:
  mode: hierarchical
  target:
    type: domain
    path: "platform/"
  # Expands to all microservices under domain
  expanded_targets: [list of microservice paths]
```

**Filter-based:**
```yaml
selection:
  mode: filter
  filter: stale|never
  expanded_targets: [list of matching paths]
```

### 4. Expand and Validate Selection
For hierarchical/filter selections, expand to concrete targets:

```python
def expand_selection(selection):
    targets = []
    
    if selection.type == "domain":
        for service in domain.services:
            for ms in service.microservices:
                targets.append(ms.path)
                
    elif selection.type == "service":
        for ms in service.microservices:
            targets.append(ms.path)
            
    elif selection.filter == "stale":
        targets = [t for t in all_targets if t.age_days > 7]
        
    elif selection.filter == "never":
        targets = [t for t in all_targets if t.last_discovered is None]
    
    return targets
```

**Validate each expanded target:**
- Path exists
- Contains analyzable code
- Is accessible (read permission)

### 5. Confirm Batch Discovery
If multiple targets selected:

```
BATCH DISCOVERY CONFIRMATION
═══════════════════════════════════════════════════════════════════

Targets selected: {N} microservices
Estimated time: ~{N} minutes total
Output files: ~{N} documents

Targets:
  1. platform/auth/auth-api
  2. platform/auth/auth-worker
  3. platform/users/user-api
  ...

Discovery order: Sequential (dependencies first if detected)

Proceed with batch discovery? [y/N/modify]
```

### 6. Detect Discovery Dependencies
Some targets may depend on others for full context:

```yaml
dependency_detection:
  - target: "platform/auth/auth-api"
    depends_on: []
    
  - target: "platform/auth/auth-worker"
    depends_on: ["platform/auth/auth-api"]  # shares models
    
  - target: "business/orders/order-api"
    depends_on: ["platform/auth/auth-api"]  # calls auth API
```

**If dependencies detected:**
```
Dependencies detected:
  platform/auth/auth-worker depends on auth-api

Recommended discovery order:
  1. platform/auth/auth-api (base)
  2. platform/auth/auth-worker (depends on #1)

Use recommended order? [Y/n]
```

### 7. Build Discovery Queue
Output for remaining steps:

```yaml
discovery_target:
  mode: single|batch
  
  queue:
    - path: string
      type: microservice
      name: string
      domain: string
      service: string
      tech_stack: [list]
      priority: N  # based on dependencies
      estimated_time_minutes: N
      
  total_targets: N
  estimated_total_time: N
  
  batch_config:
    stop_on_failure: false
    parallel: false  # sequential for context building
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| No targets in lens | FAIL: "No discovery targets defined in lens" |
| All targets recently discovered | WARN: "All targets discovered recently. Force refresh?" |
| Selected target path missing | WARN, remove from queue, continue with others |
| Empty domain/service selected | WARN: "No microservices under {name}" |
| Selection exceeds 20 targets | WARN: "Large batch. Consider smaller selection." |
| Invalid selection input | Re-prompt with valid options |

## Output
```yaml
discovery_target:
  selection_mode: single|batch
  
  queue:
    - path: string
      type: string
      name: string
      domain: string
      service: string
      tech_stack: [list]
      priority: N
      
  summary:
    total_targets: N
    by_status:
      recent: N
      stale: N
      never: N
    estimated_time_minutes: N
    
  dependencies_ordered: boolean
```
