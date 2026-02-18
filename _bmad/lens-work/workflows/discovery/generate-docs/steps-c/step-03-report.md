---
name: 'step-03-report'
description: 'Write docs to output folder and generate completion report'
outputFiles:
  - '{docs_output_path}/{domain}/{service}/architecture.md'
  - '{docs_output_path}/{domain}/{service}/api-surface.md'
  - '{docs_output_path}/{domain}/{service}/data-model.md'
  - '{docs_output_path}/{domain}/{service}/integration-map.md'
  - '{docs_output_path}/{domain}/{service}/onboarding.md'
  - '{docs_output_path}/{domain}/{service}/migration-map.md'
---

# Step 3: Write Outputs

## Goal
Persist **six** documentation outputs to the docs folder, validate written files, and generate a completion report with metrics and recommendations.

## Instructions

### 1. Resolve Output Paths
```yaml
output_resolution:
  base_path: lens_config.sync.docs_output_path
  target_path: "{base_path}/{domain}/{service}/"
  
  files:
    - source: doc_outputs.architecture
      dest: "{target_path}/architecture.md"
      
    - source: doc_outputs.api_surface
      dest: "{target_path}/api-surface.md"
      
    - source: doc_outputs.data_model
      dest: "{target_path}/data-model.md"
      
    - source: doc_outputs.integration_map
      dest: "{target_path}/integration-map.md"
      
    - source: doc_outputs.onboarding
      dest: "{target_path}/onboarding.md"
      
    - source: doc_outputs.migration_map
      dest: "{target_path}/migration-map.md"
```

### 2. Create Output Directory
```python
def ensure_output_directory(target_path):
    if not exists(target_path):
        makedirs(target_path)
        log(f"Created output directory: {target_path}")
    
    # Check write permissions
    if not is_writable(target_path):
        raise PermissionError(f"Cannot write to {target_path}")
```

### 3. Write Documentation Files
For each generated doc:

```python
def write_doc_file(source_content, dest_path, overwrite_policy):
    if source_content is None:
        return {"status": "skipped", "reason": "no content"}
    
    if exists(dest_path) and overwrite_policy == "preserve":
        return {"status": "skipped", "reason": "file exists, preserve mode"}
    
    if exists(dest_path) and overwrite_policy == "merge":
        existing = read_file(dest_path)
        content = merge_content(existing, source_content)
    else:
        content = source_content
    
    write_file(dest_path, content)
    
    return {
        "status": "success",
        "path": dest_path,
        "size_bytes": len(content),
        "checksum": md5(content)
    }
```

### 4. Validate Written Files
```yaml
validation_checks:
  - check: file_exists
    action: Confirm each file was written
    
  - check: file_readable
    action: Read back and verify content
    
  - check: markdown_valid
    action: Basic markdown structure check
    
  - check: frontmatter_valid
    action: YAML frontmatter parseable
    
  - check: links_valid
    action: Internal cross-references resolve
```

**Validation implementation:**
```python
def validate_written_docs(written_files):
    results = []
    for file_info in written_files:
        validation = {
            "file": file_info["path"],
            "checks": []
        }
        
        # Check file exists
        if exists(file_info["path"]):
            validation["checks"].append({"exists": True})
        else:
            validation["checks"].append({"exists": False, "error": "File not found after write"})
            continue
        
        # Check content matches
        content = read_file(file_info["path"])
        if md5(content) == file_info["checksum"]:
            validation["checks"].append({"integrity": True})
        else:
            validation["checks"].append({"integrity": False, "error": "Checksum mismatch"})
        
        # Check markdown structure
        if has_valid_frontmatter(content):
            validation["checks"].append({"frontmatter": True})
        else:
            validation["checks"].append({"frontmatter": False, "warning": "Invalid or missing frontmatter"})
        
        results.append(validation)
    
    return results
```

### 5. Generate Completion Report
```yaml
completion_report:
  workflow: generate-docs
  target: {target.name}
  completed_at: ISO8601
  duration_ms: N
  
  summary:
    total_docs_planned: N
    docs_written: N
    docs_skipped: N
    docs_failed: N
    total_bytes_written: N
    
  files_written:
    - name: architecture.md
      path: {full_path}
      size_bytes: N
      status: success
      sections_generated: N
      
    - name: api-surface.md
      path: {full_path}
      size_bytes: N
      status: success
      endpoints_documented: N
      
    - name: data-model.md
      path: {full_path}
      size_bytes: N
      status: success
      entities_documented: N
      
    - name: integration-map.md
      path: {full_path}
      size_bytes: N
      status: success
      integrations_documented: N
      
    - name: onboarding.md
      path: {full_path}
      size_bytes: N
      status: success
      
  files_skipped:
    - name: {doc_name}
      reason: {why skipped}
      
  validation_results:
    all_valid: boolean
    issues: [list of validation issues]
    
  coverage_metrics:
    api_coverage: N%  # endpoints documented / total endpoints
    entity_coverage: N%  # entities documented / total entities
    integration_coverage: N%  # integrations documented / total integrations
    
  quality_indicators:
    has_diagrams: boolean
    has_code_examples: boolean
    has_cross_references: boolean
    estimated_reading_time_minutes: N
    
  recommendations:
    - "Consider adding custom examples to api-surface.md"
    - "Data model ER diagram may need manual refinement"
    - "Review generated onboarding steps for accuracy"
    
  next_steps:
    - action: "Review generated documentation"
      priority: high
    - action: "Add manual sections where needed"
      priority: medium
    - action: "Update lens metadata if docs location changed"
      priority: low
```

### 6. Update Sidecar State (if applicable)
If running within Bridge workflow context:

```yaml
# _bmad/lens-work/_memory/bridge-sidecar/bridge-state.md update
docs_generation:
  last_run: ISO8601
  target: {target.name}
  status: success|partial|failed
  docs_generated: [list]
  output_location: {target_path}
```

### 7. Log to Scout Discoveries (if applicable)
```yaml
# _bmad/lens-work/_memory/scout-sidecar/scout-discoveries.md append
- discovery_type: docs_generated
  timestamp: ISO8601
  target: {target.name}
  docs: [list of generated docs]
  location: {target_path}
  coverage:
    api: N%
    entities: N%
    integrations: N%
```

### 8. Output Summary for User
```markdown
## Documentation Generation Complete

**Target:** {target.name}
**Output Location:** {target_path}

### Files Generated
| Document | Status | Size | Coverage |
|----------|--------|------|----------|
| architecture.md | ✅ | 4.2KB | — |
| api-surface.md | ✅ | 12.1KB | 100% endpoints |
| data-model.md | ✅ | 8.3KB | 95% entities |
| integration-map.md | ✅ | 3.1KB | 100% integrations |
| onboarding.md | ✅ | 2.8KB | — |

### Recommendations
1. {recommendation_1}
2. {recommendation_2}

### Next Steps
- Review generated docs for accuracy
- Add custom examples and notes
- Commit to version control
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Output dir creation fails | FAIL with permission details |
| Partial write (some files fail) | Continue, report failures |
| Disk full | FAIL, clean up partial writes |
| File lock conflict | Retry 3x, then fail |
| Invalid characters in filename | Sanitize target name |
| Very large doc (>1MB) | Warn, consider splitting |
| Validation finds issues | Continue but include in report |

## Output
```yaml
write_results:
  target: string
  output_path: string
  completed_at: ISO8601
  
  summary:
    docs_written: N
    docs_skipped: N
    docs_failed: N
    total_bytes: N
    
  files:
    - doc: string
      path: string
      status: success|skipped|failed
      size_bytes: N
      
  validation:
    passed: boolean
    issues: [list]
    
  report_path: string  # if report file generated
  
  recommendations: [list]
  next_steps: [list]
```
