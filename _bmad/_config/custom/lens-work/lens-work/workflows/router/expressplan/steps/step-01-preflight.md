---
name: 'step-01-preflight'
description: 'Run shared preflight, validate express track eligibility, and mark phase start'
nextStepFile: './step-02-plan.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Preflight And Express Track Validation

**Goal:** Confirm the active initiative uses the `express` track, verify express is constitution-permitted, and mark phase start on the initiative root branch.

---

## EXECUTION SEQUENCE

### 1. Run Preflight And Resolve Initiative Context

```yaml
invoke: include
path: "{preflightInclude}"
params:
  skip_constitution: false

invoke: git-orchestration.verify-clean-state

initiative_state = invoke: git-state.current-initiative
initiative = load(initiative_state.config_path)
lifecycle = load("{lifecycleContract}")

initiative_root = initiative.initiative_root
docs_path = initiative.docs.path || "{output_folder}/planning-artifacts"

ensure_directory(docs_path)

# Validate express track
if initiative.track != "express":
  FAIL("❌ ExpressPlan requires the 'express' track. Current track: ${initiative.track}. Use /preplan, /businessplan, or /techplan for other tracks.")

# Verify express track is permitted by constitution
constitutional_context = invoke: constitution.resolve-context
session.constitutional_context = constitutional_context

if constitutional_context.permitted_tracks and "express" not in constitutional_context.permitted_tracks:
  FAIL("❌ Express track is not permitted by the active constitution. Add 'express' to permitted_tracks in your constitution.")

# Work directly on the initiative root branch — no milestone branches for express
current_branch = invoke_command("git symbolic-ref --short HEAD")
if current_branch != initiative_root:
  invoke: git-orchestration.checkout-branch
  params:
    branch: ${initiative_root}

invoke: git-orchestration.pull-latest

# Mark phase start in initiative-state.yaml
invoke: git-orchestration.update-phase-start
params:
  phase: expressplan

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${initiative_state.state_path}
  phase: "PHASE:EXPRESSPLAN:START"
  initiative: ${initiative_root}
  description: "expressplan phase started (express track — single branch, no PRs)"
```

### 2. Output Preflight Summary

```
✅ Express Track Preflight Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Initiative: ${initiative_root}
Track:      express
Branch:     ${initiative_root} (single branch — no milestone branches)
PR Model:   disabled (no PRs will be created)
Gate Model: informational (adversarial review runs inline)
Docs Path:  ${docs_path}

📋 Express Artifacts to Produce:
   1. Product Brief
   2. PRD (Product Requirements Document)
   3. Architecture
   4. Epics & Stories
   5. Sprint Status + Story Files
   6. Review Report (inline adversarial review)
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
