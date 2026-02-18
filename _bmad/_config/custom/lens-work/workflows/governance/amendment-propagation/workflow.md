# Amendment Propagation Workflow

**Purpose:** Analyze the impact of a constitution amendment on child constitutions in the inheritance hierarchy and generate a propagation plan.

**Critical Rule:** This workflow is **REPORT-ONLY** — it NEVER auto-modifies child constitutions. All changes must be manually reviewed and applied by users.

---

## Input Parameters

- `constitution_name` — Name of the constitution that was amended
- `layer` — Layer of the amended constitution (Domain, Service, Microservice, Feature)
- `amendment_id` — Amendment number or identifier
- `constitutional_context` — Full constitutional context including resolved constitution

---

## Workflow Steps

### Step 1: Traverse Hierarchy

Read and follow: `steps/traverse-hierarchy.md`

Scan filesystem at `_bmad-output/lens-work/constitutions/` for child constitutions in lower layers. Verify parent-child relationships using `resolve-constitution` workflow.

### Step 2: Detect Conflicts

Read and follow: `steps/detect-conflicts.md`

For each child constitution, detect 3 conflict types:
1. **Removal conflict** — Parent removed an article that child references
2. **Redefinition conflict** — Parent redefined a NON-NEGOTIABLE rule that child customized
3. **Contradiction conflict** — Parent added a rule that contradicts child rule

### Step 3: Generate Propagation Plan

Read and follow: `steps/generate-plan.md`

Create a report-only propagation plan listing affected children, detected conflicts, and recommended actions. Store at `_bmad-output/lens-work/constitutions/{layer}/{name}/propagation-plans/{date}-amendment-{amendment_id}.md`.

---

## Output

- Propagation plan markdown file
- `amendment-propagated` Tracey event
- Governance-prefixed commit via Casey

---

## Exit Conditions

- **Success:** Propagation plan generated and committed
- **No children:** Plan generated with "No downstream constitutions affected" message
- **Error:** Unable to scan constitutions directory — report error to user
