---
name: 'step-01-preflight'
description: 'Run shared preflight, validate preplan eligibility, and prepare the phase branch'
nextStepFile: './step-02-select-workflows.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Preflight And Phase Branch Setup

**Goal:** Confirm the active initiative can run preplan, then resolve and prepare the small-audience preplan branch and artifact output path.

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

enabled_phases = lifecycle.tracks[initiative.track].phases || lifecycle.phase_order
if not contains(enabled_phases, "preplan"):
  FAIL("❌ Track `${initiative.track}` does not include preplan.")

audience = "small"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"
phase_branch = "${initiative_root}-${audience}-preplan"
output_path = initiative.docs.path || "{output_folder}/planning-artifacts"

if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "preplan"
    initiative_id: ${initiative.id || initiative_root}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}

invoke: git-orchestration.checkout-branch
params:
  branch: ${phase_branch}

ensure_directory(output_path)
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`