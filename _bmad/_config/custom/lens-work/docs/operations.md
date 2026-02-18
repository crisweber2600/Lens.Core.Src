# Release & Operations

This document defines versioning, rollout practices, observability, and ownership for the lens-sync extension.

---

## Versioning Strategy

- Use **Semantic Versioning**: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking schema/output changes
- **MINOR:** New workflows, new outputs, additive features
- **PATCH:** Bug fixes and safe improvements

## Changelog Process

- Maintain a `CHANGELOG.md` in the extension root
- Add entries under **Unreleased** for each change
- On release, move entries to a dated release section

---

## Rollout & Rollback Criteria

### Rollout Readiness
- All workflow reports generated successfully
- Schema validation passes (or known warnings documented)
- Test plan executed on at least one fixture repo

### Rollback Triggers
- Schema validation errors that corrupt lens data
- Incomplete or failed propagation in `lens-sync`
- User reports of documentation drift after update

### Rollback Procedure
- Use the `rollback` workflow with the latest snapshot
- Verify integrity with `validate-schema` post-rollback
- Record rollback outcomes in `rollback-report.md`

---

## Observability Plan

- **Logging:** Workflow step summaries and warnings in reports
- **Audit Trail:** Sidecar state files in `_memory/*-sidecar/`
- **Metrics (optional):** counts of repos cloned, docs generated, schema errors

---

## Ownership & Escalation

| Area | Primary Owner | Backup | Escalation |
|---|---|---|---|
| Module maintenance | Lens Module Owner | Core Maintainer | Repo Admin |
| Workflow behavior | Workflow Maintainer | Module Owner | Repo Admin |
| Schema validation | Data Steward | Module Owner | Repo Admin |
| Security concerns | Security Lead | Repo Admin | Org Security |

---

## Feedback Loop

- Use GitHub issues for defects and enhancements
- Triage cadence: weekly
- Labeling: `lens-sync`, `workflow`, `docs`, `bug`
