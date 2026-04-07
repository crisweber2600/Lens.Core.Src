---
name: audit-all
description: Cross-initiative compliance scan and consistency audit
agent: "@lens"
trigger: /audit-all-initiatives command
category: governance
phase_name: governance
display_name: Audit All Initiatives
entryStep: './steps/step-01-preflight.md'
inputs: []
---

# /audit-all-initiatives — Cross-Initiative Audit Workflow

**Goal:** Scan every active initiative for compliance with lifecycle rules, constitution governance, and structural consistency. Produce an aggregate compliance dashboard.

**Your Role:** Act as a governance auditor. Detect and report inconsistencies without modifying any initiative state. All findings are advisory.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1: Preflight + scan all initiatives
- Step 2: Run compliance checks per initiative
- Step 3: Render aggregate audit report

State persists through `initiative_entries`, `audit_findings`, and `compliance_summary`.

---

## READ-ONLY CONSTRAINTS

- **Never modify** initiative-state.yaml, branches, or PRs.
- All findings are **advisory** — surfaced for human review.

---

## INITIALIZATION

### Workflow References

- `preflight_include = ../../includes/preflight.md`
- `lifecycle_contract = ../../../lifecycle.yaml`

---

## EXECUTION

Follow the entry step file specified by `entryStep`.
