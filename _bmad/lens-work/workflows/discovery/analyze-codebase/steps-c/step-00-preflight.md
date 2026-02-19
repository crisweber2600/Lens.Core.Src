---
name: 'step-00-preflight'
description: 'Preflight checks and guardrails'
nextStepFile: './step-01-select-target.md'
---

# Step 0: Preflight

## Goal
Validate prerequisites and guardrails before standalone codebase analysis. This is a focused variant of discover workflow—analysis only, no doc generation.

## Instructions

### 1. Validate Target Project Root
```
target_path = resolve_absolute(config.target_projects_path)
```
- **Check existence**: FAIL if missing
- **Check is directory**: FAIL if file
- **Check read access**: Must be able to traverse and read code
- **Symlink safety**: Resolve and verify within workspace

### 2. Validate Lens Metadata
**Required for target selection:**
- `{lens_root}/domain-map.yaml`
- Associated `service.yaml` files

Load to build target selection menu.

### 3. Validate Preselected Target (if applicable)
If invoked with specific target:
```yaml
preselected:
  path: string
  type: domain|service|microservice
```

**Validation:**
- Path must exist
- Must contain analyzable code files
- Must be readable

### 4. Resolve Output Folder
```
docs_path = resolve_absolute(config.docs_output_path)
```
Analysis writes a summary report—verify write access.

**Create if missing:**
```bash
mkdir -p "{docs_path}/lens-sync/"
```

### 5. Git Environment Check
```bash
git --version
```
- Git is informational for analysis (commit history context)
- Not strictly required—can analyze without git context

### 6. JIRA Integration Check (Conditional)
**If `enable_jira_integration == true`:**
- Test JIRA connectivity
- If available: Will enrich analysis with business context
- If unavailable: WARN, proceed without JIRA

### 7. Check for Previous Analysis
Look for existing analysis:
```
{docs_output_path}/{domain}/{service}/analysis-summary.md
_bmad/lens-work/_memory/scout-sidecar/analysis/{target}.yaml
```

If found:
```
Previous analysis found for {target}
  Last analyzed: {date}
  Age: {N} days

Options:
  [1] Refresh analysis (overwrite)
  [2] View existing (skip analysis)
  [3] Compare (run new, diff with old)
```

### 8. Resource Estimation
Based on target size:

```yaml
estimation:
  target_files: N
  estimated_lines: N
  estimated_time: "~N minutes"
  complexity: low|medium|high
```

Display:
```
Analysis Estimation
───────────────────
Target: {name}
Files: ~{N}
Lines: ~{N}
Time: ~{N} minutes

Proceed? [y/N]
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Target not found | FAIL: "Analysis target not found: {path}" |
| No code files in target | FAIL: "No analyzable code found in {path}" |
| Output folder not writable | FAIL: "Cannot write analysis output" |
| Very large codebase (>500k LOC) | WARN: "Large codebase. Analysis may take >30 minutes." |
| JIRA unavailable | WARN, continue without |

## Output
```yaml
preflight_status:
  result: pass|fail
  timestamp: ISO8601
  
  environment:
    target_root: string
    lens_root: string
    output_folder: string
    git_available: boolean
    
  target:
    preselected: boolean
    path: string|null
    type: string|null
    exists: boolean
    
  jira:
    enabled: boolean
    reachable: boolean|null
    
  previous_analysis:
    exists: boolean
    timestamp: ISO8601|null
    
  estimation:
    files: N
    lines: N
    time_minutes: N
    
  warnings: [list]
  errors: [list]
```
