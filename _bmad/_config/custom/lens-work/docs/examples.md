# Examples & Use Cases

This section provides practical examples for using LENS Sync & Discovery.

---

## Example Workflows

### New Team Member Onboarding

1. `Bridge, bootstrap`
2. `Scout, discover`
3. `Link, lens-sync`

**Result:** A complete BMAD-ready documentation set for fast onboarding.

---

### Legacy Microservice Documentation

1. `Scout, discover`
2. Review generated docs in `{docs_output_path}/{domain}/{service}/...`
3. `Link, lens-sync`

**Result:** Architecture, API, and data model documentation produced in under an hour.

---

### Documentation Propagation After Change

1. Update microservice documentation
2. `Link, lens-sync`
3. Review sharded outputs and reports

**Result:** Service and domain docs stay synchronized with changes.

---

## Workflow Examples (Per Workflow)

### bootstrap

1. `Bridge, bootstrap`
2. Approve the sync plan

**Expected Output:** `{docs_output_path}/lens-sync/bootstrap-report.md`

---

### sync-status

1. `Bridge, sync-status`
2. Review drift findings

**Expected Output:** `{docs_output_path}/lens-sync/sync-status-report.md`

---

### reconcile

1. Run `Bridge, sync-status`
2. Run `Bridge, reconcile`
3. Select and apply resolutions

**Expected Output:** `{docs_output_path}/lens-sync/reconcile-report.md`

---

### discover

1. `Scout, discover`
2. Select target service

**Expected Output:**
`{docs_output_path}/{domain}/{service}/architecture.md` and related docs.

---

### analyze-codebase

1. `Scout, analyze-codebase`
2. Select target service

**Expected Output:** `{docs_output_path}/{domain}/{service}/analysis-summary.md`

---

### generate-docs

1. Run `Scout, analyze-codebase`
2. Run `Scout, generate-docs`

**Expected Output:**
`{docs_output_path}/{domain}/{service}/architecture.md`, `api-surface.md`, `data-model.md`, `integration-map.md`, `onboarding.md`

---

### lens-sync

1. `Link, lens-sync`
2. Review sharding and propagation summary

**Expected Output:** `{docs_output_folder}/lens-sync/lens-sync-report.md`

---

### validate-schema

1. `Link, validate-schema`
2. Review validation results

**Expected Output:** `{docs_output_folder}/lens-sync/validate-schema-report.md`

---

### rollback

1. `Link, rollback`
2. Select snapshot

**Expected Output:** `{docs_output_folder}/lens-sync/rollback-report.md`

---

## Tips & Tricks

- Keep `domain-map.yaml` up to date to avoid drift.
- Start with `discovery_depth = standard` for balanced results.
- Use `sync-status` regularly to detect drift early.

---

## Troubleshooting

### Common Issues

- **Missing domain map:** Ensure `domain-map.yaml` exists in the lens root.
- **Repository clone fails:** Verify git credentials and repository access.
- **JIRA context missing:** Confirm `enable_jira_integration` is enabled and credentials are configured.
- **Docs not generated:** Check `docs_output_folder` and permissions.
- **Drift report empty:** Confirm lens domain paths exist and services are registered.
- **Schema validation errors:** Run `validate-schema` after updating lens metadata.
- **Rollback fails:** Ensure a snapshot exists in `_memory/*-sidecar/`.

---

## Getting More Help

- Review the main BMAD documentation
- Check module configuration in module.yaml
- Verify all agents and workflows are properly installed
