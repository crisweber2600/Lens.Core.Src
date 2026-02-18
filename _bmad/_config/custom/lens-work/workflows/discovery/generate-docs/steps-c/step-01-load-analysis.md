---
name: 'step-01-load-analysis'
description: 'Load analysis results and context'
nextStepFile: './step-02-generate.md'
---

# Step 1: Load Analysis

## Goal
Load and validate analysis results that will drive documentation generation. Enrich with additional context for comprehensive docs.

## Instructions

### 1. Load Primary Analysis Data
Based on preflight source detection:

**From Scout Sidecar Cache:**
```yaml
# _bmad/lens-work/_memory/scout-sidecar/analysis/{target}.yaml
cache_data:
  target: string
  analyzed_at: ISO8601
  analysis_id: string
  full_results:
    tech_stack: {...}
    api_surface: {...}
    data_models: {...}
    integrations: {...}
    ...
```

**From Analysis Summary:**
```python
def parse_summary_report(path):
    # Read markdown file
    content = read_file(path)
    
    # Extract YAML frontmatter if present
    frontmatter = extract_frontmatter(content)
    
    # Parse structured sections
    sections = parse_markdown_sections(content)
    
    return {
        "metadata": frontmatter,
        "sections": sections,
        "raw_content": content
    }
```

**From Session:**
```python
analysis_results = session.get("analysis_results")
```

### 2. Validate Data Completeness
Check required sections are present:

```yaml
required_sections:
  - name: tech_stack
    present: boolean
    completeness: full|partial|missing
    
  - name: api_surface
    present: boolean
    completeness: full|partial|missing
    required_for: api-surface.md
    
  - name: data_models
    present: boolean
    completeness: full|partial|missing
    required_for: data-model.md
    
  - name: integrations
    present: boolean
    completeness: full|partial|missing
    required_for: integration-map.md
```

**Handle missing sections:**
```yaml
missing_handling:
  - section: api_surface
    action: skip_doc|generate_placeholder|fail
    fallback_message: "API surface not analyzed. Run full analysis."
```

### 3. Load Context Summary (if available)
From discovery workflow's context extraction:

**File:** `_bmad/lens-work/_memory/scout-sidecar/context/{target}.yaml`
```yaml
context_data:
  business_purpose: {...}
  key_themes: [...]
  stakeholders: {...}
  debt_signals: [...]
  jira_context: [...]
```

If available, merge into analysis inputs for richer documentation.

### 4. Load Previous Documentation (for merge mode)
If overwrite_policy.mode == "merge":

```python
def load_existing_docs(target_path):
    docs = {}
    for doc_name in DOC_NAMES:
        path = f"{target_path}/{doc_name}.md"
        if exists(path):
            docs[doc_name] = {
                "content": read_file(path),
                "sections": parse_sections(path),
                "manual_sections": find_manual_sections(path),
                "frontmatter": extract_frontmatter(path)
            }
    return docs
```

**Identify manual content to preserve:**
```yaml
manual_content:
  - doc: api-surface.md
    sections:
      - heading: "## Custom Notes"
        content: "..."
        preserve: true
      - heading: "## Known Issues"
        content: "..."
        preserve: true
```

### 5. Build Documentation Input Structure
Normalize all data into doc-ready format:

```yaml
analysis_inputs:
  target:
    name: string
    path: string
    type: microservice|service|domain
    
  metadata:
    analysis_id: string
    analyzed_at: ISO8601
    confidence: N
    source: cache|report|session
    
  tech_stack:
    language: string
    version: string
    framework: string
    framework_version: string
    runtime: string
    dependencies:
      production: [...]
      development: [...]
    build_system: string
    
  api_surface:
    base_path: string
    total_endpoints: N
    endpoints:
      - method: string
        path: string
        handler: string
        file: string
        line: N
        parameters: [...]
        response_type: string
        auth_required: boolean
    groups:
      - prefix: string
        count: N
        purpose: string
        
  data_models:
    total: N
    entities: [...]
    dtos: [...]
    enums: [...]
    relationships: [...]
    
  integrations:
    http_clients: [...]
    message_queues: [...]
    internal_services: [...]
    
  architecture:
    pattern: string
    patterns_detected: [...]
    
  quality_signals:
    testing: {...}
    linting: {...}
    documentation: {...}
    
  context:  # from discovery context, if available
    business_purpose: string
    key_themes: [...]
    stakeholders: [...]
    debt_signals: [...]
    
  existing_docs:  # for merge mode
    preserved_content: {...}
```

### 6. Enrich with Lens Metadata
If target is lens-defined, load additional context:

```yaml
lens_context:
  domain: string
  service: string
  microservice: string
  status: active|deprecated|planned
  git_repo: string
  branch: string
  related_services: [...]  # from same domain/service
```

### 7. Calculate Documentation Scope
Based on data availability:

```yaml
doc_scope:
  architecture:
    generate: true
    sections:
      - overview: full
      - tech_stack: full
      - architecture_pattern: full
      - dependencies: full
      
  api_surface:
    generate: true
    sections:
      - endpoints: full
      - parameters: partial  # some types missing
      - examples: placeholder
      
  data_model:
    generate: true
    sections:
      - entities: full
      - relationships: partial  # inference limited
      - erd: full
      
  integration_map:
    generate: true
    sections:
      - external: full
      - internal: partial
      - diagram: full
      
  onboarding:
    generate: true
    sections:
      - quick_start: inferred
      - prerequisites: inferred
      - commands: inferred
```

### 8. Store Loaded Data
Cache for Step 2:

**Session:**
```python
session.set("analysis_inputs", analysis_inputs)
session.set("doc_scope", doc_scope)
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Cache file corrupted | Fall back to summary report |
| Summary report unparseable | Fall back to session data |
| No usable data source | FAIL: "Cannot load analysis data" |
| Missing critical sections | WARN, generate partial docs |
| Merge mode but no existing docs | Switch to overwrite mode |
| Context data unavailable | Continue without, less rich docs |
| Lens metadata unavailable | Continue without lens context |

## Output
```yaml
analysis_inputs:
  loaded_at: ISO8601
  source: cache|report|session
  
  target:
    name: string
    path: string
    
  completeness:
    overall: full|partial
    by_section:
      tech_stack: full|partial|missing
      api_surface: full|partial|missing
      data_models: full|partial|missing
      integrations: full|partial|missing
      
  doc_scope:
    generate: [doc names]
    skip: [doc names with reasons]
    
  enrichment:
    context_available: boolean
    lens_metadata_available: boolean
    existing_docs_loaded: boolean
    
  warnings: [list]
```
