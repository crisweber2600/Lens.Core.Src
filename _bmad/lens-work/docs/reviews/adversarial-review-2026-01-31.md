# Adversarial Review — 2026-01-31

## Scope Reviewed
- Agent specs: `agents/*.spec.md`
- Built agents: `agents/*/*.agent.yaml`
- Workflow specs: `workflows/*/*.spec.md`
- Built workflows: `workflows/*/workflow.md` and `workflows/*/steps-c/*`
- User docs: `docs/*.md`

---

## Issues Found (and Fixes Applied)

1. **Agent metadata ID mismatch**
   - Specs listed `_bmad/lens-work/agents/*.md` while built agents used `_bmad/agents/*/*.md`.
   - **Fix:** Updated specs and docs to reflect built agent IDs.

2. **Link `hasSidecar` mismatch**
   - Spec declared `hasSidecar: false`, built agent is `true` with sidecar usage.
   - **Fix:** Updated Link spec to `hasSidecar: true`.

---

## Remaining Risks / Follow-ups

- **Manual testing not executed:** Installation and prompt tests are still pending.
- **Fixture repository missing:** No regression fixture to validate discovery workflows.
- **Governance reviews pending:** Party Mode roundtable still outstanding.

---

## Overall Assessment

Specs, workflows, and docs are now aligned. The primary remaining work is execution of testing and governance checks rather than spec/code mismatches.
