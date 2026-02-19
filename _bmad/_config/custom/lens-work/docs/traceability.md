# Spec-to-Docs Traceability Checklist

Use this checklist to ensure every spec is reflected in user documentation and implementation artifacts.

---

## Agent Traceability

- [ ] `agents/bridge.spec.md` → `docs/agents.md` → `agents/bridge/bridge.agent.yaml`
- [ ] `agents/scout.spec.md` → `docs/agents.md` → `agents/scout/scout.agent.yaml`
- [ ] `agents/link.spec.md` → `docs/agents.md` → `agents/link/link.agent.yaml`

---

## Workflow Traceability

- [ ] `workflows/bootstrap/bootstrap.spec.md` → `docs/workflows.md` → `workflows/bootstrap/workflow.md`
- [ ] `workflows/sync-status/sync-status.spec.md` → `docs/workflows.md` → `workflows/sync-status/workflow.md`
- [ ] `workflows/reconcile/reconcile.spec.md` → `docs/workflows.md` → `workflows/reconcile/workflow.md`
- [ ] `workflows/discover/discover.spec.md` → `docs/workflows.md` → `workflows/discover/workflow.md`
- [ ] `workflows/analyze-codebase/analyze-codebase.spec.md` → `docs/workflows.md` → `workflows/analyze-codebase/workflow.md`
- [ ] `workflows/generate-docs/generate-docs.spec.md` → `docs/workflows.md` → `workflows/generate-docs/workflow.md`
- [ ] `workflows/lens-sync/lens-sync.spec.md` → `docs/workflows.md` → `workflows/lens-sync/workflow.md`
- [ ] `workflows/validate-schema/validate-schema.spec.md` → `docs/workflows.md` → `workflows/validate-schema/workflow.md`
- [ ] `workflows/rollback/rollback.spec.md` → `docs/workflows.md` → `workflows/rollback/workflow.md`

---

## Output Traceability

- [ ] Reports listed in `docs/workflows.md` align with step `outputFile` values
- [ ] Examples in `docs/examples.md` reference real output file names
- [ ] `docs/getting-started.md` references `docs/prerequisites.md`

---

## Release Traceability

- [ ] `docs/operations.md` references versioning and changelog process
- [ ] Test plan updates reflected in `docs/testing.md`
