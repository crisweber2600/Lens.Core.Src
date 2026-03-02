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

**From Discovery Sidecar Cache:**
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

Read the file at the summary report path. Extract the YAML frontmatter between the opening and closing `---` markers. Parse the markdown sections after the frontmatter into a sections map keyed by heading names. Combine into: `{ metadata: <frontmatter>, sections: <sections map>, raw_content: <full file text> }`.

**From Session:**

Use the `analysis_results` produced earlier in the current session.

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

For each doc name in `[architecture, api-surface, data-model, integration-map, onboarding, migration-map]`:
- Build path: `{target_path}/{doc_name}.md`
- If file exists at that path:
  - Read the full file content
  - Extract YAML frontmatter (text between opening and closing `---` markers)
  - Split into sections based on markdown headings (`## Heading`)
  - Find manual sections: headings that do NOT have a `<!-- generated -->` comment marker
  - Store as: `{ content, sections, manual_sections, frontmatter }` keyed by doc name
- If file does not exist: skip it silently

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

Retain all loaded data (`analysis_inputs`, `doc_scope`) in your working context for Step 2 to use. Do not discard any loaded values between steps.

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
