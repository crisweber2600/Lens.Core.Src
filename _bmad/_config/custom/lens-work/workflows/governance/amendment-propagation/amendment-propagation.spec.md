# Amendment Propagation Workflow Specification

**Workflow Name:** amendment-propagation

**Purpose:** Generate hierarchical impact analysis (propagation plan) when a constitution is amended, identifying affected child constitutions and potential conflicts.

**Critical Rule:** REPORT-ONLY workflow — NEVER auto-modifies child constitutions (AD-5).

---

## Entry Metadata

- **Category:** Governance
- **Scope:** Constitutional amendment impact analysis
- **Invocation:** Via Scribe `/propagate` command or post-amendment trigger
- **Artifacts Produced:** Propagation plan markdown file

---

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `constitution_name` | string | Yes | Name of amended constitution |
| `layer` | string | Yes | Layer: Domain, Service, Microservice, Feature |
| `amendment_id` | string/number | Yes | Amendment identifier |
| `constitutional_context` | object | Yes | Full resolved constitutional context |

---

## Behavioral Contract

### Must Do

1. Scan filesystem at `_bmad-output/lens-work/constitutions/` for child constitutions
2. Verify parent-child relationships via `resolve-constitution`
3. Detect 3 conflict types: removal, redefinition, contradiction
4. Generate propagation plan at `constitutions/{layer}/{name}/propagation-plans/{date}-amendment-{id}.md`
5. Emit `amendment-propagated` Tracey event
6. Request Casey commit with governance prefix

### Must Not Do

1. NEVER auto-modify child constitutions
2. NEVER block on conflicts — always generate report
3. NEVER skip children due to errors — log and continue

---

## Output Format

Propagation plan markdown with:
- Amendment summary (version, date, rationale)
- List of affected children with conflict details
- Recommended actions per child
- Follow-up checklist