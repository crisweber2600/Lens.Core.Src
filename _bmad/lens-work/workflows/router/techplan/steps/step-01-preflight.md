---
name: 'step-01-preflight'
description: 'Run shared preflight, validate techplan eligibility, and prepare the phase branch'
nextStepFile: './step-02-select-mode.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Preflight And Phase Branch Setup

**Goal:** Confirm the active initiative can run techplan, verify inherited planning artifacts, and prepare the small-audience techplan branch.

---

## EXECUTION SEQUENCE

### 1. Run Preflight And Resolve Initiative Context

```yaml
invoke: include
path: "{preflightInclude}"
params:
  skip_constitution: true

invoke: git-orchestration.verify-clean-state

initiative_state = invoke: git-state.current-initiative
initiative = load(initiative_state.config_path)
lifecycle = load("{lifecycleContract}")

audience = "small"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"
phase_branch = "${initiative_root}-${audience}-techplan"
docs_path = initiative.docs.path || "{output_folder}/planning-artifacts"

ensure_directory(docs_path)

prd = load_if_exists("${docs_path}/prd.md")
if prd == null:
  FAIL("❌ TechPlan requires prd.md under ${docs_path}.")

businessplan_branch = "${initiative_root}-${audience}-businessplan"
merge_check = invoke: git-orchestration.exec
params:
  command: "git merge-base --is-ancestor origin/${businessplan_branch} origin/${audience_branch}"

if merge_check.exit_code != 0:
  warning: "⚠️ BusinessPlan merge is not visible on the audience branch yet. TechPlan can continue, but inherited artifacts may be stale."

constitutional_context = invoke: constitution.resolve-context
session.constitutional_context = constitutional_context

if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "techplan"
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