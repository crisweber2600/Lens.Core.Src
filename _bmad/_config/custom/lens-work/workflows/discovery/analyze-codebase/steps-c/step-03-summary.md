---
name: 'step-03-summary'
description: 'Write analysis summary report'
outputFile: '{docs_output_path}/{domain}/{service}/analysis-summary.md'
---

# Step 3: Summary Report

## Goal
Generate a concise, actionable analysis summary report. This is the primary output artifact for standalone analysis.

## Instructions

### 1. Prepare Output Location
```bash
output_path = "{docs_output_path}/{domain}/{service}/"
mkdir -p "{output_path}"

# Handle existing files
if exists("{output_path}/analysis-summary.md"):
    # Backup previous
    mv "{output_path}/analysis-summary.md" \
       "{output_path}/analysis-summary.{timestamp}.md.bak"
```

### 2. Generate Summary Report
**File:** `{output_path}/analysis-summary.md`

```markdown
# {Service Name} Analysis Summary

**Generated:** {ISO8601}  
**Target:** `{path}`  
**Analysis Duration:** {N} seconds  
**Confidence Score:** {score}%

---

## Quick Overview

| Metric | Value |
|--------|-------|
| Primary Language | {language} |
| Framework | {framework} |
| Lines of Code | {loc} |
| API Endpoints | {endpoints} |
| Data Models | {models} |
| External Integrations | {integrations} |

## Technology Stack

### Runtime
- **Language:** {language} {version}
- **Runtime:** {runtime} {version}
- **Framework:** {framework} {version}

### Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
{for dep in top_dependencies limit 10}
| `{dep.name}` | {dep.version} | {dep.purpose} |
{endfor}

{if dependencies.count > 10}
*{remaining} more dependencies...*
{endif}

### Build & Development
- **Package Manager:** {package_manager}
- **Build Tool:** {build_tool}
- **Test Framework:** {test_framework}
- **Linter:** {linter}

---

## Architecture Overview

### Pattern
**{primary_pattern}** (confidence: {confidence})

{pattern_description}

### Structure
```
{target}/
├── {main_source_dir}/
│   ├── {api_dir}/          # {api_dir_description}
│   ├── {business_dir}/     # {business_dir_description}
│   └── {data_dir}/         # {data_dir_description}
├── {test_dir}/             # {test_description}
└── {config_dir}/           # {config_description}
```

### Layer Separation
| Layer | Present | Directory |
|-------|---------|-----------|
| API/Controllers | {yes/no} | `{path}` |
| Business Logic | {yes/no} | `{path}` |
| Data Access | {yes/no} | `{path}` |
| Infrastructure | {yes/no} | `{path}` |

---

## API Surface

**Total Endpoints:** {total_endpoints}

### By Method
| Method | Count |
|--------|-------|
| GET | {get_count} |
| POST | {post_count} |
| PUT | {put_count} |
| DELETE | {delete_count} |
| PATCH | {patch_count} |

### Route Groups
| Prefix | Endpoints | Purpose |
|--------|-----------|---------|
{for group in route_groups}
| `{group.prefix}` | {group.count} | {group.purpose} |
{endfor}

### Sample Endpoints
{for endpoint in sample_endpoints limit 5}
- `{endpoint.method} {endpoint.path}` → `{endpoint.handler}`
{endfor}

{if endpoints.count > 5}
*{remaining} more endpoints... Run full discovery for complete API docs.*
{endif}

---

## Data Models

**Total Models:** {model_count}

### Entities
{for entity in entities}
- **{entity.name}** ({entity.field_count} fields) - `{entity.file}`
{endfor}

### Key Relationships
```mermaid
erDiagram
{for rel in top_relationships limit 10}
    {rel.source} {rel.cardinality} {rel.target} : "{rel.name}"
{endfor}
```

---

## Data Storage

| Type | Technology | Status |
|------|------------|--------|
| Primary Database | {db_type} | {detected/inferred} |
| ORM | {orm} | {detected/none} |
| Cache | {cache_type} | {detected/none} |
| File Storage | {file_storage} | {detected/none} |

{if migrations.present}
### Migrations
- **Count:** {migrations.count}
- **Latest:** {migrations.latest}
{endif}

---

## Integrations

**Total Integrations:** {integration_count}

### External Services
{for service in external_services}
- **{service.name}** via {service.protocol}
  - Endpoints: {service.endpoints}
{endfor}

### Message Queues
{for queue in message_queues}
- **{queue.type}** ({queue.role})
  - Topics: {queue.topics}
{endfor}

### Internal Services
{for internal in internal_services}
- **{internal.name}** ({internal.protocol})
{endfor}

---

## Code Quality Signals

| Aspect | Status | Details |
|--------|--------|---------|
| Testing | {status} | {test_framework}, {test_file_count} files |
| Linting | {status} | {linters} |
| Documentation | {status} | README: {readme}, API docs: {api_docs} |
| CI/CD | {status} | {ci_platform} |

{if security_concerns}
### ⚠️ Security Notes
{for concern in security_concerns}
- {concern}
{endfor}
{endif}

---

## Recommendations

### Immediate Actions
{for rec in immediate_recommendations}
1. **{rec.title}** - {rec.description}
{endfor}

### Suggested Improvements
{for rec in improvement_recommendations}
- {rec.title}: {rec.description}
{endfor}

### Next Steps
1. Run `lens-sync discover --target {target}` for full documentation
2. Update lens metadata if needed
3. Review security notes above

---

## Analysis Metadata

| Property | Value |
|----------|-------|
| Analysis ID | {analysis_id} |
| Confidence | {confidence}% |
| Files Analyzed | {files_analyzed} |
| Duration | {duration}s |
| Warnings | {warning_count} |

{if warnings}
### Warnings
{for warning in warnings}
- ⚠️ {warning}
{endfor}
{endif}

{if limitations}
### Limitations
{for limitation in limitations}
- {limitation}
{endfor}
{endif}

---
*Generated by LENS Analysis. For full documentation, run the discover workflow.*
```

### 3. Cache Analysis Results
Store for future reference and comparison:

**File:** `_bmad/lens-work/_memory/scout-sidecar/analysis/{target_name}.yaml`
```yaml
target: string
target_path: string
analyzed_at: ISO8601
analysis_id: string

summary:
  language: string
  framework: string
  endpoints: N
  models: N
  integrations: N
  confidence: N

full_results: {...}  # complete analysis_results

report_path: "{docs_output_path}/{domain}/{service}/analysis-summary.md"
```

### 4. Update Scout Sidecar State
Update `_bmad/lens-work/_memory/scout-sidecar/scout-discoveries.md`:

```yaml
analysis_results:
  - target: string
    timestamp: ISO8601
    analysis_id: string
    summary_path: string
```

### 5. Update Lens Metadata (if target in lens)
If target is a lens-defined microservice, update service.yaml:

```yaml
# In service.yaml
microservices:
  - name: {service_name}
    # existing fields...
    
    analysis:
      last_analyzed: ISO8601
      analysis_id: string
      confidence: N
      summary_path: string
```

### 6. Handle Batch Analysis
If multiple targets were analyzed:

**File:** `{docs_output_path}/lens-sync/analysis-batch-{timestamp}.md`

```markdown
# Batch Analysis Summary

**Generated:** {ISO8601}  
**Targets Analyzed:** {N}  
**Total Duration:** {N} seconds

## Results Overview

| Target | Language | Endpoints | Models | Confidence |
|--------|----------|-----------|--------|------------|
{for result in batch_results}
| [{result.name}](./{result.path}/analysis-summary.md) | {result.language} | {result.endpoints} | {result.models} | {result.confidence}% |
{endfor}

## Cross-Target Insights

### Common Technologies
{common_technologies}

### Integration Map
```mermaid
graph LR
{for integration in cross_integrations}
    {integration.source} --> {integration.target}
{endfor}
```

### Aggregate Metrics
- Total endpoints: {total_endpoints}
- Total models: {total_models}
- Average confidence: {avg_confidence}%
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Write permission denied | FAIL with specific path |
| Mermaid too complex | Simplify diagram, note limitation |
| Analysis results incomplete | Generate partial report, note gaps |
| Target not in lens | Write report only, skip lens update |
| Very long report (>500 lines) | Split into sections with links |

## Output
```yaml
summary_result:
  status: success|failed
  target: string
  
  report:
    path: string
    size_bytes: N
    sections_generated: [list]
    
  cache:
    path: string
    cached: boolean
    
  lens_updated: boolean
  sidecar_updated: boolean
  
  batch_summary:  # if batch mode
    path: string|null
    targets_reported: N
```
