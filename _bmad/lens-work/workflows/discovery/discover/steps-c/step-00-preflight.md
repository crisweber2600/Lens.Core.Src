---
name: 'step-00-preflight'
description: 'Preflight checks and guardrails'
nextStepFile: './step-01-select-target.md'
---

# Step 0: Preflight

## Goal
Validate prerequisites and guardrails before discovery. This workflow analyzes code and generates documentation—requires read access to target and write access to output.

**ALSO: Verify .gitignore protection is in place to prevent accidental commits of lens-work system files.**

## Instructions

### 1. Validate .gitignore Protection
- [ ] Check if `.gitignore` exists in project root
- [ ] Verify it contains lens-work system file patterns:
  - `_bmad/lens-work/_memory/`
  - `_bmad-output/lens-work/`
  - `_bmad-output/personal/`
  - `_bmad-output/implementation-artifacts/` (legacy; safe to keep)
- [ ] If missing: Display warning and instructions to run `git add .gitignore && git commit`

### 2. Validate Target Project Root
```
target_path = resolve_absolute(config.target_projects_path)
```
- **Check existence**: FAIL if missing
- **Check is directory**: FAIL if file
- **Check read access**: Must be able to read code files for analysis
- **Symlink safety**: Resolve and verify contained within workspace

### 3. Validate Lens Metadata
**Required for target selection:**
- `{lens_root}/domain-map.yaml` - list of domains
- `service.yaml` files - list of services and microservices

**Purpose:** Discovery can target any item in lens hierarchy. Load metadata to present selection options.

### 4. Validate Preselected Target (if applicable)
If workflow was invoked with a specific target:
```yaml
preselected_target:
  type: domain|service|microservice
  path: string
```

**Validation:**
- Target path must exist
- If microservice: verify it's a git repo with code
- If domain/service: verify at least one child exists

### 5. Resolve Output Folder
```
docs_path = resolve_absolute(config.docs_output_path)
```
**Security checks:**
- Under `target_projects_path`
- No path traversal
- Write permission required

**Create structure if missing:**
```bash
mkdir -p \"{docs_path}/\"
```

### 6. Git Environment Validation
```bash
git --version
```
- **Required:** Git is used to extract commit history and JIRA references
- **Working tree status:** Informational only (discovery doesn't modify repos)

### 7. JIRA Integration Check (Conditional)
**If `enable_jira_integration == true`:**
- Validate JIRA credentials
- Test connectivity
- If valid: Discovery will enrich analysis with JIRA context
- If invalid: WARN, proceed without JIRA enrichment

**If `enable_jira_integration == false`:**
- Skip JIRA checks
- Note in output

### 8. Load Scout Sidecar State
Read `_memory/scout-sidecar/scout-discoveries.md`:
```yaml
discovered_targets: [list of previously discovered items]
jira_keys_found: [accumulated JIRA keys]
analysis_results: [cached analysis data]
```

Check for previous discovery of same target:
- If exists and recent (<7 days): Offer to refresh or skip
- If exists but stale: Recommend refresh

### 9. Resource Estimation
Based on target type, estimate resources:

| Target Type | Estimated Time | Output Files |
|-------------|----------------|--------------|
| Microservice | 2-5 minutes | 5 |
| Service | 5-15 minutes | 5-25 |
| Domain | 15-60 minutes | 25-100+ |

**Display:**
```
Discovery Target Estimation
───────────────────────────
Target: {name} ({type})
Estimated Time: ~{N} minutes
Output Files: ~{N} documents
Disk Space: ~{N} MB

Previous Discovery: {date|never}

Proceed? [y/N]
```

### 10. Confirm Overwrite Policy
If docs already exist for target:
```
⚠️  Documentation already exists for {target}.
    Last generated: {date}
    
Options:
  [1] Overwrite existing (backup first)
  [2] Merge with existing (keep manual edits)
  [3] Abort

Choice:
```

Capture policy in preflight output.

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Target path doesn't exist | FAIL: "Target not found: {path}" |
| Target has no code files | WARN: "No analyzable code found" |
| JIRA unreachable | WARN, continue without JIRA |
| Output folder not writable | FAIL: "Cannot write to {path}" |
| Previous discovery very recent (<1 hour) | Suggest skip unless forced |
| Target is deprecated in lens | WARN: "Target marked deprecated" |

## Output
```yaml
preflight_status:
  result: pass|fail
  timestamp: ISO8601
  
  environment:
    target_root: string
    lens_root: string
    output_folder: string
    git_available: true
    
  target:
    preselected: boolean
    type: domain|service|microservice|null
    path: string|null
    exists: boolean
    has_code: boolean
    
  jira:
    enabled: boolean
    reachable: boolean|null
    
  previous_discovery:
    exists: boolean
    timestamp: ISO8601|null
    age_days: N|null
    
  overwrite_policy: overwrite|merge|abort
  
  estimation:
    time_minutes: N
    output_files: N
    
  warnings: [list]
  errors: [list]
```
