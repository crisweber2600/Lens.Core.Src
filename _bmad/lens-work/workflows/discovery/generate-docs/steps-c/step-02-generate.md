---
name: 'step-02-generate'
description: 'Generate documentation artifacts from analysis results'
nextStepFile: './step-03-report.md'
templateDir: 'templates/docs/'
qualityStandards: 'templates/docs/doc-quality-standards.md'
---

# Step 2: Generate Docs

## Goal
Create **six** production-quality documentation artifacts from `analysis_inputs`. Every document MUST match the depth, detail, and quality of the reference exemplar in `docs/lens-sync/OldNorthStar/`.

## CRITICAL: Quality Requirements

**Before generating ANY document:**

1. **Load quality standards** from `{project-root}/_bmad/lens-work/templates/docs/doc-quality-standards.md`
2. **Load the template** for each document from `{project-root}/_bmad/lens-work/templates/docs/{doc-type}.template.md`
3. **Read actual source files** — you MUST use `read_file` and `grep_search` to extract real code, real entity definitions, real endpoint paths, real configuration
4. **Never output placeholder variables** — no `{service_name}`, no `{for x in y}`, no invented data

### Minimum Line Counts

| Document | Minimum Lines |
|----------|--------------|
| architecture.md | 200 |
| api-surface.md | 150 |
| data-model.md | 200 |
| integration-map.md | 150 |
| onboarding.md | 200 |
| migration-map.md | 150 |

If a document falls below its minimum, re-read source files and expand before accepting.

### Required Content Types (every document)

- **Real code examples** extracted from the actual codebase
- **ASCII art diagrams** using `┌─┐│└─┘▶◀▼▲` characters (not just Mermaid)
- **Detailed tables** with actual data from the analysis
- **Cross-references** to all 6 sibling documents
- **Standard BMAD header and footer** per quality standards

## Instructions

### 1. Initialize Generation Context
```yaml
generation_context:
  target: from analysis_inputs.target
  doc_scope: from analysis_inputs.doc_scope
  output_dir: "{docs_output_path}/{domain}/{service}/"
  template_dir: "{project-root}/_bmad/lens-work/templates/docs/"
  
  style_config:
    heading_style: atx
    list_style: dashes
    code_fence_style: triple-backtick
    max_line_width: 120
    
  generation_timestamp: ISO8601
  
  # All 6 documents are REQUIRED
  required_docs:
    - architecture.md
    - api-surface.md
    - data-model.md
    - integration-map.md
    - onboarding.md
    - migration-map.md
```

### 2. Generate architecture.md
**Load template:** `templates/docs/architecture.template.md`

**Key requirements:**
- ASCII art multi-tier architecture diagram (Client → API → Business → Data)
- Solution composition table with actual project names and line counts
- Backend + Frontend technology tables with real versions from dependency files
- Authentication architecture with ASCII flow diagram and actual config code
- Data architecture summary with entity counts
- API architecture with controller inventory
- Technical debt assessment with severity indicators (🔴🟡🟢)
- Deployment architecture diagram
- Modernization recommendations

**MUST read:** `.sln`, `.csproj`, `package.json`, startup/config files, auth config

### 3. Generate api-surface.md
**Load template:** `templates/docs/api-surface.template.md`

**Do NOT skip** even if analysis_inputs.api_surface is sparse — read controller files directly.

**Key requirements:**
- List EVERY controller/route handler found in the codebase
- Group by business domain (Assessment, Student, Admin, etc.)
- Per-domain table: Controller | Endpoints | Description
- Per-domain endpoint listing: `METHOD /path`
- API patterns section with actual code examples
- Query parameters table from actual controller signatures
- Response format examples (success + error JSON)
- Error handling code from actual global exception handler
- Authentication flow ASCII diagram
- CORS configuration code
- Migration considerations: legacy → modern route mapping

**MUST read:** All controller files, WebApiConfig or route setup, auth middleware

### 4. Generate data-model.md
**Load template:** `templates/docs/data-model.template.md`

**Do NOT skip** even if analysis_inputs.data_models is sparse — read entity files directly.

**Key requirements:**
- Database statistics table (entities, migrations, engine, ORM, context)
- ASCII art entity domain categorization diagram
- **Full class definitions** for 6-8 key entities (all properties, navigation, annotations)
- ASCII ER relationship diagram + Mermaid ER diagram
- Data access layer pattern with actual service code example
- Key data services table
- Migration history timeline
- Data validation patterns with actual code
- Performance considerations with current vs recommended code
- Entity mapping for migration (legacy → modern)

**MUST read:** Entity/model files, DbContext, migration folder, data service files

### 5. Generate integration-map.md
**Load template:** `templates/docs/integration-map.template.md`

**Key requirements:**
- ASCII art integration landscape diagram
- Per-integration detail sections with config code
- Authentication integration with actual token flow
- Storage integration (database, blob, file)
- Email/messaging integration
- External API integrations
- Data flow diagrams (at least 2, ASCII art)
- Configuration dependencies from actual config files
- Connection string names (redacted values)
- Migration checklist (High/Medium/Low priority)
- Security considerations table

**MUST read:** Config files (web.config, appsettings.json, .env), connection strings, service clients

### 6. Generate onboarding.md
**Load template:** `templates/docs/onboarding.template.md`

**Key requirements:**
- Prerequisites table with actual required tool versions
- Setup commands from actual project (package.json scripts, README)
- Full solution/project directory tree (verified with list_dir)
- Request flow ASCII diagram
- Layer responsibilities table
- Key concepts (3-5) with actual code examples from the project
- Frontend development guide with real code example
- Backend development guide with real code example
- Database development guide
- Common tasks step-by-step
- Common issues + solutions table
- Testing instructions
- Deployment checklist

**MUST read:** README.md, package.json, directory structure, sample controller/component files

### 7. Generate migration-map.md ← NEW (was missing)
**Load template:** `templates/docs/migration-map.template.md`

**Key requirements:**
- Technology migration matrix (8+ components: runtime, framework, ORM, frontend, auth, etc.)
- Architecture transformation ASCII diagram (legacy vs modern)
- Backend component mapping table
- Frontend component mapping table
- API endpoint migration table (legacy route → modern route)
- Response format comparison (legacy vs modern JSON)
- Data model migration (entity transforms, type modernization)
- Frontend component → React mapping
- Authentication migration flow diagram
- Phased migration plan (4 phases with effort estimates)
- Risk assessment (technical + business)
- Strangler fig strategy with progress visualization
- Success metrics table
- Feature toggle code example

**MUST read:** All technology files to determine current stack, then recommend modern equivalents

**For greenfield/modern projects:** Focus on architecture decisions, growth path, and recommended patterns instead of legacy migration.

### 8. Apply Overwrite Policy
```yaml
overwrite_modes:
  overwrite: Replace file entirely
  merge: Preserve manual sections, update generated
  preserve: Only create if file doesn't exist
```

### 9. Post-Generation Quality Check

Before proceeding to step-03, verify:

```yaml
quality_check:
  for_each_document:
    - line_count >= minimum_required
    - contains_ascii_diagrams: true
    - contains_code_examples: true
    - contains_bmad_header: true
    - contains_related_docs_footer: true
    - no_placeholder_variables: true
    - tables_have_real_data: true
    
  all_six_generated:
    - architecture.md: exists
    - api-surface.md: exists
    - data-model.md: exists
    - integration-map.md: exists
    - onboarding.md: exists
    - migration-map.md: exists
```

If any check fails, go back and fix the document before proceeding.

**Merge logic:**
```python
def merge_preserving_manual_sections(existing, generated):
    manual_sections = find_sections_without_generated_marker(existing)
    merged = generated
    for section in manual_sections:
        merged = append_section(merged, section)
    return merged
```

### 8. Track Results
```yaml
generation_results:
  target: string
  generated_at: ISO8601
  
  docs_generated:
    - doc: architecture.md
      path: string
      status: success
      
  docs_skipped:
    - doc: data-model.md
      reason: "No data models detected"
      
  warnings: [list]
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Output dir not writable | FAIL with clear error |
| Partial data for doc | Generate with placeholders + warning |
| Mermaid diagram too complex | Simplify to top-level |
| Merge conflict | Keep both versions with markers |
| Very large API surface | Paginate or summarize |

## Output
```yaml
doc_outputs:
  target: string
  generated_at: ISO8601
  
  summary:
    docs_generated: N
    docs_skipped: N
    warnings_count: N
    
  files:
    - doc: string
      path: string
      status: success|skipped|error
      
  warnings: [list]
```
