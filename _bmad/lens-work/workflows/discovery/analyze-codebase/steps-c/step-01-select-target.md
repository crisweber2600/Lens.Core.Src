---
name: 'step-01-select-target'
description: 'Select repository or microservice'
nextStepFile: './step-02-analyze.md'
---

# Step 1: Select Target

## Goal
Present available analysis targets from lens metadata and capture user selection. Supports both lens-defined targets and ad-hoc path analysis.

## Instructions

### 1. Load Lens-Defined Targets
Build target list from lens metadata:

```yaml
lens_targets:
  - name: "auth-api"
    path: "platform/auth/auth-api/"
    type: microservice
    domain: "Platform"
    service: "Auth"
    tech_stack: ["typescript", "express"]
    status: active
    last_analyzed: ISO8601|null
    
  - name: "user-api"
    ...
```

### 2. Detect Ad-Hoc Targets
Scan for code repositories not in lens:

```yaml
adhoc_targets:
  - path: "experiments/new-feature/"
    detected_language: python
    has_git: false
    reason: "Not in lens metadata"
    
  - path: "tools/scripts/"
    detected_language: bash
    has_git: true
    reason: "Infrastructure code"
```

### 3. Present Selection Interface
```
ANALYSIS TARGET SELECTION
═══════════════════════════════════════════════════════════════════

LENS-DEFINED TARGETS:

  [1] Platform/Auth/auth-api      [typescript]  ✓ analyzed 2d ago
  [2] Platform/Auth/auth-worker   [typescript]  ⚡ stale (14d)
  [3] Platform/Users/user-api     [python]      ○ never analyzed
  [4] Business/Orders/order-api   [java]        ⚡ stale (30d)
  ...

AD-HOC TARGETS (not in lens):

  [A1] experiments/new-feature/   [python]      (not tracked)
  [A2] tools/scripts/             [bash]        (not tracked)

───────────────────────────────────────────────────────────────────
Enter selection (1-N, A1-AN) or custom path:
Multiple: 1,3,4 or 1-4
Filter: 'stale', 'never', 'adhoc':
```

### 4. Handle Custom Path Input
If user enters a path not in list:

```python
def validate_custom_path(path):
    abs_path = resolve_absolute(path, target_projects_path)
    
    if not exists(abs_path):
        return error("Path not found")
    
    if not is_directory(abs_path):
        return error("Must be a directory")
    
    if not has_code_files(abs_path):
        return error("No analyzable code found")
    
    return {
        "path": abs_path,
        "type": "custom",
        "detected_language": detect_language(abs_path),
        "in_lens": False
    }
```

### 5. Support Batch Selection
Allow multiple targets for batch analysis:

```yaml
batch_selection:
  - target: "platform/auth/auth-api"
    priority: 1
  - target: "platform/auth/auth-worker"
    priority: 2
  - target: "platform/users/user-api"
    priority: 3
```

**Batch confirmation:**
```
BATCH ANALYSIS CONFIRMATION
═══════════════════════════════════════════════════════════════════

Selected: {N} targets
Estimated time: ~{total_minutes} minutes

Targets:
  1. platform/auth/auth-api (typescript)
  2. platform/auth/auth-worker (typescript)
  3. platform/users/user-api (python)

Analysis will run sequentially.

Proceed? [y/N/modify]
```

### 6. Detect Analysis Scope
Determine what level of analysis is appropriate:

```yaml
scope_detection:
  - target: "platform/auth/auth-api"
    scope: full
    reason: "Standard microservice"
    
  - target: "tools/scripts"
    scope: light
    reason: "Utility scripts, no API/models expected"
    
  - target: "platform/"
    scope: hierarchical
    reason: "Domain selected - will analyze each microservice"
```

### 7. Build Analysis Queue
Output for Step 2:

```yaml
analysis_target:
  mode: single|batch
  
  queue:
    - path: string
      name: string
      type: microservice|custom
      domain: string|null
      service: string|null
      tech_stack: [list]|null
      scope: full|light
      priority: N
      in_lens: boolean
      
  summary:
    total_targets: N
    estimated_time_minutes: N
    in_lens: N
    adhoc: N
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| No lens targets defined | Show adhoc targets only |
| No targets at all | FAIL: "No analysis targets found" |
| Custom path outside target_root | REJECT: "Path must be under target project root" |
| Target is empty directory | WARN, skip |
| Minified/bundled only | WARN: "Only bundled code found - analysis limited" |
| Invalid selection input | Re-prompt with valid options |

## Output
```yaml
analysis_target:
  mode: single|batch
  
  queue:
    - path: string
      name: string
      type: microservice|custom
      domain: string|null
      service: string|null
      tech_stack: [list]|null
      scope: full|light
      in_lens: boolean
      
  summary:
    total_targets: N
    estimated_time_minutes: N
```
