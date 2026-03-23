---
name: 'step-01-preflight'
description: 'Run shared preflight, validate businessplan eligibility, and prepare the phase branch'
nextStepFile: './step-02-select-workflows.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Preflight And Phase Branch Setup

**Goal:** Confirm the active initiative can run businessplan, verify the inherited product brief, and prepare the small-audience businessplan branch.

---

## EXECUTION SEQUENCE

### 1. Run Preflight And Resolve Initiative Context

```yaml
invoke: include
path: "{preflightInclude}"

invoke: git-orchestration.verify-clean-state

initiative_state = invoke: git-state.current-initiative
initiative = load(initiative_state.config_path)
lifecycle = load("{lifecycleContract}")

audience = "small"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"
phase_branch = "${initiative_root}-${audience}-businessplan"
docs_path = initiative.docs.path || "{output_folder}/planning-artifacts"

ensure_directory(docs_path)

product_brief = load_if_exists("${docs_path}/product-brief.md")
if product_brief == null:
  FAIL("❌ Product brief not found at ${docs_path}/product-brief.md.")

preplan_branch = "${initiative_root}-${audience}-preplan"
merge_check = invoke: git-orchestration.exec
params:
  command: "git merge-base --is-ancestor origin/${preplan_branch} origin/${audience_branch}"

if merge_check.exit_code != 0:
  warning: "⚠️ PrePlan merge is not visible on the audience branch yet. BusinessPlan can continue, but inherited artifacts may be stale."

invoke: lens-work.compliance-check
params:
  phase: "businessplan"
  artifacts_path: ${docs_path}

constitutional_context = invoke: constitution.resolve-context
session.constitutional_context = constitutional_context

if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "businessplan"
    initiative_id: ${initiative.id || initiative_root}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}

invoke: git-orchestration.checkout-branch
params:
  branch: ${phase_branch}

invoke: git-orchestration.pull-latest
params:
  branch: ${phase_branch}
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`