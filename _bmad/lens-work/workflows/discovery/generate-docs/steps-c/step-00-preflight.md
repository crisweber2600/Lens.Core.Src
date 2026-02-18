---
name: 'step-00-preflight'
description: 'Preflight checks and guardrails'
nextStepFile: './step-01-load-analysis.md'
---

# Step 0: Preflight

## Goal
Validate prerequisites and guardrails before documentation generation. This workflow transforms analysis results into structured BMAD-ready documentation.

## Instructions

### 1. Validate Target Project Root
```
target_path = resolve_absolute(config.target_projects_path)
```
- **Check existence**: FAIL if missing
- **Check is directory**: FAIL if file
- **Read access**: Required to load analysis results

### 2. Validate Analysis Inputs Exist
**Required inputs:**
Documentation generation requires prior analysis. Check for:

```yaml
required_inputs:
  # Option 1: Scout sidecar analysis cache
  - path: "_bmad/lens-work/_memory/scout-sidecar/analysis/{target}.yaml"
    type: cached_analysis
    
  # Option 2: Analysis summary report
  - path: "{docs_output_path}/{domain}/{service}/analysis-summary.md"
    type: summary_report
    
  # Option 3: Live analysis_results in session
  - type: session_data
    key: analysis_results
```

**Validation:**
```python
def validate_analysis_input():
    # Check cache first
    cache_path = f"_bmad/lens-work/_memory/scout-sidecar/analysis/{target}.yaml"
    if exists(cache_path):
        return load_yaml(cache_path)
    
    # Check summary report
    report_path = f"{docs_output}/{domain}/{service}/analysis-summary.md"
    if exists(report_path):
        return parse_markdown_frontmatter(report_path)
    
    # Check session
    if session.has("analysis_results"):
        return session.get("analysis_results")
    
    # No input found
    return error("No analysis data found. Run analyze-codebase first.")
```

**Input freshness check:**
- If analysis is older than 7 days: WARN "Analysis may be stale"
- If analysis is older than 30 days: Recommend re-running analysis

### 3. Resolve Output Folder
```
docs_path = resolve_absolute(config.docs_output_path)
```
**Validation:**
- Under `target_projects_path`
- No path traversal
- Write permission required

**Create structure:**
```bash
mkdir -p "{docs_path}/{domain}/{service}/"
```

### 4. Check for Existing Documentation
Scan for existing docs that would be overwritten:

```yaml
existing_docs:
  - path: "{docs_path}/{domain}/{service}/architecture.md"
    exists: true
    modified: ISO8601
    has_manual_edits: boolean  # check for human markers
    
  - path: "{docs_path}/{domain}/{service}/api-surface.md"
    exists: true
    modified: ISO8601
    ...
```

**Detect manual edits:**
Look for markers indicating human modifications:
- Comments: `<!-- Manual edit -->`, `<!-- Do not regenerate -->`
- Sections: `## Custom Section`, `## Manual Notes`
- Metadata: `manual_edits: true` in frontmatter

### 5. Determine Overwrite Policy
If existing docs found:

```
EXISTING DOCUMENTATION DETECTED
═══════════════════════════════════════════════════════════════════

The following docs already exist for {target}:

  📄 architecture.md      (modified 3 days ago)
  📄 api-surface.md       (modified 3 days ago) ⚠️ HAS MANUAL EDITS
  📄 data-model.md        (modified 3 days ago)
  📄 integration-map.md   (modified 3 days ago)
  📄 onboarding.md        (modified 3 days ago)

Options:
  [1] Overwrite all (backup existing)
  [2] Merge (preserve manual edits, update generated sections)
  [3] Skip files with manual edits
  [4] Abort

Choice:
```

Store policy:
```yaml
overwrite_policy:
  mode: overwrite|merge|skip_manual|abort
  backup: boolean
  files_affected: [list]
```

### 6. Validate Git Environment
```bash
git --version
```
- **Working tree status:** Informational (docs generation doesn't require clean tree)
- **Track doc changes:** Note if docs are tracked in git

### 7. JIRA Integration Check
**If `enable_jira_integration == true`:**
- Not strictly required for doc generation
- If available: Can include JIRA links in docs
- If unavailable: Generate docs without JIRA links

### 8. Template Validation
Verify doc templates are available:

```yaml
templates:
  - name: architecture
    path: "{module_root}/templates/architecture.md.tmpl"
    status: found|missing
    
  - name: api-surface
    path: "{module_root}/templates/api-surface.md.tmpl"
    status: found|missing
    ...
```

If templates missing: Use default inline templates.

### 9. Resource Estimation
```yaml
estimation:
  documents_to_generate: N
  estimated_size: "~N KB"
  estimated_time: "~N seconds"
  
  breakdown:
    - doc: architecture.md
      estimated_size: "~10 KB"
    - doc: api-surface.md
      estimated_size: "~{endpoints * 0.5} KB"
    ...
```

Display:
```
DOC GENERATION PREFLIGHT
═══════════════════════════════════════════════════════════════════

Analysis Source: {source_path}
Analysis Age: {N} days
Target: {target}

Documents to Generate:
  📝 architecture.md
  📝 api-surface.md ({N} endpoints)
  📝 data-model.md ({N} models)
  📝 integration-map.md ({N} integrations)
  📝 onboarding.md

Estimated Output: ~{N} KB total

Proceed? [y/N]
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| No analysis found | FAIL: "Run analyze-codebase first" |
| Analysis very old (>90 days) | WARN strongly, allow override |
| Output folder not writable | FAIL: "Cannot write to {path}" |
| Manual edits would be lost | Require explicit confirmation |
| Templates missing | Use default templates, warn |
| Analysis incomplete | WARN, generate partial docs |

## Output
```yaml
preflight_status:
  result: pass|fail
  timestamp: ISO8601
  
  analysis_input:
    source: cache|report|session
    path: string
    age_days: N
    complete: boolean
    
  output:
    folder: string
    existing_docs: N
    has_manual_edits: boolean
    
  overwrite_policy:
    mode: string
    backup: boolean
    
  estimation:
    documents: N
    size_kb: N
    
  warnings: [list]
  errors: [list]
```
