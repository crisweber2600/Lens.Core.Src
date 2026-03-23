---
name: 'step-01-preflight'
description: 'Run shared preflight, validate medium-audience entry, and prepare the devproposal phase branch'
nextStepFile: './step-02-select-mode.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Preflight And Medium-Audience Entry Gate

**Goal:** Confirm the active initiative can run devproposal, verify the medium-audience entry gate, and prepare the devproposal phase branch.

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

audience = "medium"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"
phase_branch = "${initiative_root}-${audience}-devproposal"
docs_path = initiative.docs.path || "{output_folder}/planning-artifacts"

ensure_directory(docs_path)

prd = load_if_exists("${docs_path}/prd.md")
architecture = load_if_exists("${docs_path}/architecture.md")
if prd == null or architecture == null:
  FAIL("❌ DevProposal requires prd.md and architecture.md under ${docs_path}.")

promotion_check = invoke: git-orchestration.exec
params:
  command: "git merge-base --is-ancestor origin/${initiative_root}-small origin/${audience_branch}"

if promotion_check.exit_code != 0:
  FAIL("❌ Small-to-medium audience promotion is not complete. Run `/promote` first.")

adversarial_review_report = load_if_exists("${docs_path}/adversarial-review-report.md")
if adversarial_review_report == null:
  warning: "⚠️ Adversarial review entry artifact is missing. DevProposal can proceed, but promotion evidence is incomplete."

invoke: lens-work.compliance-check
params:
  phase: "devproposal"
  artifacts_path: ${docs_path}

constitutional_context = invoke: constitution.resolve-context
session.constitutional_context = constitutional_context

if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "devproposal"
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