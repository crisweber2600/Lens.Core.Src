# Scope, MVP Priorities, and Acceptance

This document defines what the lens-sync extension **does**, **does not** do, and the acceptance criteria used to consider features complete.

---

## Scope Boundaries

### In Scope
- Bootstrap folder structures from the lens domain map.
- Detect drift between lens metadata and the physical codebase.
- Reconcile conflicts with explicit user approval.
- Discover brownfield systems and generate BMAD-ready documentation.
- Propagate documentation updates to the lens hierarchy.
- Validate lens data against schemas.
- Roll back lens changes to a safe snapshot.
- Persist state in agent sidecars for traceability.

### Out of Scope
- Large-scale refactors or code migrations.
- Automated commits, pushes, or PR creation.
- Runtime deployment changes (K8s/CI/CD changes).
- Rewriting domain-map ownership rules or access policies.
- Continuous background scanning (scheduled daemons).

---

## MVP Priorities & Milestones

### MVP1 — Structural Sync (Bridge)
- **Workflows:** `bootstrap`, `sync-status`, `reconcile`
- **Goal:** Safe, reversible alignment between lens and filesystem.

### MVP2 — Discovery (Scout)
- **Workflows:** `discover`, `analyze-codebase`, `generate-docs`
- **Goal:** Reliable extraction of architecture, API, and data docs.

### MVP3 — Propagation & Integrity (Link)
- **Workflows:** `lens-sync`, `validate-schema`, `rollback`
- **Goal:** Propagation, schema safety, and recovery tooling.

---

## Success Criteria & Acceptance Checklist

### Agents

**Bridge**
- [ ] Loads `domain-map.yaml` and referenced `service.yaml` files.
- [ ] Creates a preflight snapshot before filesystem changes.
- [ ] Generates `bootstrap-report.md`, `sync-status-report.md`, and `reconcile-report.md`.
- [ ] Records outcomes in `_memory/bridge-sidecar/bridge-state.md`.

**Scout**
- [ ] Produces `analysis-summary.md` per target.
- [ ] Produces documentation artifacts in `{docs_output_path}/{domain}/{service}/`.
- [ ] Tracks discovery status and confidence signals in outputs.

**Link**
- [ ] Aggregates and shards docs into lens hierarchy.
- [ ] Validates schemas and reports errors cleanly.
- [ ] Creates rollback reports and preserves snapshots.

### Workflows

- **bootstrap:** Creates folders/clones repos and produces `bootstrap-report.md`.
- **sync-status:** Produces `sync-status-report.md` with drift findings.
- **reconcile:** Applies selected resolutions and produces `reconcile-report.md`.
- **discover:** Produces doc bundle for the target and updates lens metadata.
- **analyze-codebase:** Produces `{target}/analysis-summary.md`.
- **generate-docs:** Produces doc bundle for the target.
- **lens-sync:** Produces `lens-sync-report.md` after propagation.
- **validate-schema:** Produces `validate-schema-report.md` with errors/warnings.
- **rollback:** Produces `rollback-report.md` after restoration.

---

## Workflow Dependencies & Prerequisites

| Workflow | Requires | Produces | Used By |
|---|---|---|---|
| `bootstrap` | `domain-map.yaml`, `service.yaml`, git access | `bootstrap-report.md` | Manual follow-up
| `sync-status` | `domain-map.yaml`, target root | `sync-status-report.md` | `reconcile`
| `reconcile` | conflict report from `sync-status` | `reconcile-report.md` | Manual follow-up
| `discover` | target root, `discovery_depth` | doc bundle | `lens-sync`
| `analyze-codebase` | target root | `analysis-summary.md` | `generate-docs`
| `generate-docs` | `analysis-summary.md` | doc bundle | `lens-sync`
| `lens-sync` | doc bundle | `lens-sync-report.md` | Optional `validate-schema`
| `validate-schema` | lens schemas, lens data | `validate-schema-report.md` | Optional `rollback`
| `rollback` | snapshots | `rollback-report.md` | Manual follow-up

---

## Spec Alignment

Spec files exist for every agent and workflow under `agents/*.spec.md` and `workflows/*/*.spec.md`. These specs align with the workflows listed above and are referenced by this scope document.
