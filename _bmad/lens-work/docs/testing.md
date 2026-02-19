# Testing & QA Plan

This plan defines the expected validation steps for the lens-sync extension. Execution can be manual or automated depending on environment.

---

## Installation Smoke Tests (Manual)

- [ ] Run `bmad install lens` in a clean project
- [ ] Validate `module.yaml` prompts and defaults
- [ ] Confirm `docs_output_folder` is created on install
- [ ] Verify prompts are copied to `.github/prompts` if present
- [ ] Validate IDE-specific handlers (if added)

---

## Workflow Validation (Manual)

For each workflow, validate preflight, execution, and report output:

- [ ] `bootstrap` generates `bootstrap-report.md`
- [ ] `sync-status` generates `sync-status-report.md`
- [ ] `reconcile` generates `reconcile-report.md`
- [ ] `discover` generates doc bundle under `{docs_output_path}/{domain}/{service}`
- [ ] `analyze-codebase` generates `{docs_output_path}/{domain}/{service}/analysis-summary.md`
- [ ] `generate-docs` writes `{docs_output_path}/{domain}/{service}/architecture.md`, `{docs_output_path}/{domain}/{service}/api-surface.md`, `{docs_output_path}/{domain}/{service}/data-model.md`, `{docs_output_path}/{domain}/{service}/integration-map.md`, `{docs_output_path}/{domain}/{service}/onboarding.md`
- [ ] `lens-sync` generates `lens-sync-report.md`
- [ ] `validate-schema` generates `validate-schema-report.md`
- [ ] `rollback` generates `rollback-report.md`

---

## Test Plan (Unit / Integration / E2E)

### Unit Tests (Future)
- Path resolution and symlink safety checks
- YAML schema validation for `domain-map.yaml` and `service.yaml`
- Report formatting and summary metrics

### Integration Tests (Future)
- Run workflows against a small fixture repo
- Verify docs output structure and lens updates

### End-to-End Tests (Future)
- Full bootstrap → discover → lens-sync pipeline
- Rollback recovery from a staged update

---

## Regression Fixtures

- Fixture created at `fixtures/regression-fixture/` with:
  - 1 domain, 2 services
  - Mixed languages (Node + Python)
  - Simple API/health endpoints

---

## CI Gates (Recommended)

- Lint workflows and specs
- Validate YAML syntax and schema
- Run unit tests on push
- Run integration tests nightly

---

## Platform Matrix

- **OS:** Linux, macOS, Windows
- **Node:** 18 LTS, 20 LTS
- **Git:** 2.30+

---

## Failure Scenarios to Validate

- Missing `domain-map.yaml`
- Invalid YAML syntax
- Git authentication failures
- Disk full mid-clone
- Lens root outside target root
- Conflicting sync plan approval
