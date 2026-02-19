# Architecture & Integration

This document captures how agents and workflows interact, what they exchange, and the integration contracts that keep lens data consistent.

---

## Interaction Map

```mermaid
flowchart LR
  LensMap[domain-map.yaml + service.yaml] --> Bridge
  TargetRoot[target_project_root] --> Bridge
  Bridge --> DriftReport[sync-status-report.md]
  Bridge --> BootstrapReport[bootstrap-report.md]
  Bridge --> ReconcileReport[reconcile-report.md]

  TargetRoot --> Scout
  Scout --> AnalysisSummary[analysis-summary.md]
  Scout --> DocBundle[docs_output_path/{domain}/{service}/*]

  DocBundle --> Link
  Link --> UpdateReport[lens-sync-report.md]
  LensSchemas[lens schemas] --> Link
  Link --> SchemaReport[validate-schema-report.md]
  Link --> RollbackReport[rollback-report.md]

  Link --> LensMetadata[Updated lens hierarchy]
```

---

## Inputs, Outputs, and Handoffs

| Agent | Inputs | Outputs | Handoff To |
|---|---|---|---|
| Bridge | `domain-map.yaml`, `service.yaml`, target root | Bootstrap/Drift/Reconcile reports | Scout (optional), Link (optional) |
| Scout | Target root, discovery config | `analysis-summary.md`, doc bundle | Link |
| Link | Doc bundle, lens schemas | Update/Schema/Rollback reports | Manual review |

---

## Integration Contracts & Schemas

### Lens Metadata

**domain-map.yaml** (minimum viable structure):
```yaml
domains:
  - name: platform
    path: domains/platform
    service_file: service.yaml
```

**service.yaml** (minimum viable structure):
```yaml
services:
  - name: auth
    path: services/auth
    git_repo: git@github.com:org/auth.git
```

**Contract Notes**
- `path` values must resolve under the lens root.
- `service_file` defaults to `service.yaml` when omitted.
- `git_repo` is required for clone operations.

### Documentation Outputs

Generated docs live under:
```
{docs_output_path}/{domain}/{service}/
```

Minimum expected outputs:
- `architecture.md`
- `api-surface.md`
- `data-model.md`
- `integration-map.md`
- `onboarding.md`

### Sidecar State

Sidecar files are used for persistence and rollback:
- `_memory/bridge-sidecar/bridge-state.md`
- `_memory/scout-sidecar/scout-discoveries.md`
- `_memory/link-sidecar/link-state.md`

---

## External Dependencies

- **Git:** required for clone and status validation.
- **JIRA (optional):** contextual discovery enrichment.
- **Repo layout:** must align with lens domain and service paths.
