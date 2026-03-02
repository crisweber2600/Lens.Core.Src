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

### Step 0: Verify Governance Repo

Load `module.yaml` and resolve `outputs.governance_repo_root` (default: `TargetProjects/lens/lens-governance`).

Check that the path exists and is a valid git repository. If not:
```
❌ Governance repo not cloned.

Run '@lens check-repos' to clone bmad.lens.governance, then retry.
Expected path: TargetProjects/lens/lens-governance
```
Halt.

### Step 1: Traverse Hierarchy

Read and follow: `steps/traverse-hierarchy.md`

Scan filesystem at `{governance_repo_root}/constitutions/` for child constitutions in lower layers. Verify parent-child relationships using `resolve-constitution` workflow.

### Step 2: Detect Conflicts

Read and follow: `steps/detect-conflicts.md`

For each child constitution, detect 3 conflict types:
1. **Removal conflict** — Parent removed an article that child references
2. **Redefinition conflict** — Parent redefined a NON-NEGOTIABLE rule that child customized
3. **Contradiction conflict** — Parent added a rule that contradicts child rule

### Step 3: Generate Propagation Plan

Read and follow: `steps/generate-plan.md`

Create a report-only propagation plan listing affected children, detected conflicts, and recommended actions.

**Branch strategy (governance data zone):**
1. In `{governance_repo_root}`, ensure a branch named `universal/amendment-{amendment_id}` exists (create from `main` if not).
2. Checkout that branch in the governance repo.
3. Store the plan at `{governance_repo_root}/constitutions/{layer}/{name}/propagation-plans/{date}-amendment-{amendment_id}.md`.
4. Commit with message: `governance: propagation plan for amendment {amendment_id}`.
5. Push and open a PR targeting `main` in `bmad.lens.governance`.

---

## Output

- Propagation plan markdown file
- `amendment-propagated` event (via state-management)
- Governance-prefixed commit via git-orchestration skill

---

## Exit Conditions

- **Success:** Propagation plan generated and committed
- **No children:** Plan generated with "No downstream constitutions affected" message
- **Error:** Unable to scan constitutions directory — report error to user
