---
name: 'step-01-preflight'
description: 'Run pre-flight, branch routing, prerequisite validation, and artifact checklist gating'
nextStepFile: './step-02-readiness.md'
preflightInclude: '../../includes/preflight.md'
lifecycleContract: '{project-root}/_bmad/lens-work/lifecycle.yaml'
---

# Step 1: Pre-Flight And Gate Checks

## STEP GOAL:

Establish the correct SprintPlan branch context, confirm promotion prerequisites, and detect missing required artifacts before deeper validation.

## MANDATORY EXECUTION RULES:

### Universal Rules:
- Read the complete step file before taking action.
- Stop immediately when a hard gate fails.
- Keep all branch and state decisions grounded in initiative config and lifecycle data.

### Role Reinforcement:
- You are the LENS control-plane router.
- Protect audience progression, branch discipline, and planning gate integrity.

### Step-Specific Rules:
- Load `{preflightInclude}` before SprintPlan-specific gating.
- Use `{lifecycleContract}` to derive the large-audience SprintPlan branch.
- Treat missing required artifacts as a warning gate that needs an explicit user decision.

## EXECUTION PROTOCOLS:
- Follow the numbered sequence exactly.
- Carry forward `initiative`, `initiative_root`, `docs_path`, `bmad_docs`, `phase_branch`, `audience_branch`, and `missing`.
- Preserve any artifact-warning decision so later steps can mark `passed_with_warnings` when necessary.

## CONTEXT BOUNDARIES:
- Available context: active branch, initiative config, `{preflightInclude}`, and `{lifecycleContract}`.
- Focus: branch setup, prerequisite validation, promotion checks, and artifact gating.
- Limits: do not run readiness validation or sprint planning in this step.
- Dependencies: clean working tree and resolvable initiative state.

---

## MANDATORY SEQUENCE

### 1. Pre-Flight [REQ-9]

Load and execute `{preflightInclude}` first so authority-repo sync and constitutional bootstrap happen before SprintPlan routing logic.

Verify the working directory is clean, derive initiative state from the active branch, and load `{lifecycleContract}` to determine the SprintPlan audience.

Set `current_phase = sprintplan`, derive the large-audience branch from the lifecycle contract, resolve `initiative_root`, `audience_branch`, `docs_path`, `repo_docs_path`, `output_path`, and `bmad_docs`, and preserve the existing docs-path deprecation warning when initiative metadata is incomplete.

Validate the medium-to-large audience promotion gate. If promotion is already complete, update initiative state accordingly. If it is not complete, surface the gate failure and auto-trigger `@lens promote`, then stop this workflow.

Derive `phase_branch = {initiative_root}-{audience}-sprintplan`, ensure it exists through `git-orchestration.start-phase` when required, check it out, pull the latest state, and confirm the active branch to the user.

### 2. Validate Prerequisites And Gate Check

Verify that the medium-audience `devproposal` branch has been merged into the medium audience branch.

If DevProposal is not complete, stop with guidance to finish `/devproposal` or merge pending PRs.

If the medium-to-large audience promotion is still incomplete after the prerequisite check, auto-trigger `@lens promote` and stop.

### 3. Checklist Enforcement - Verify Required Artifacts

Verify the required planning artifacts exist at `{docs_path}`:
- Product Brief
- PRD
- Architecture
- Epics
- Stories
- Readiness Checklist

Collect missing artifacts into `missing`.

If any required artifacts are missing, display the list and ask whether to continue in warning mode. If the user declines, stop. If the user accepts, preserve that choice so later SprintPlan state can be marked `passed_with_warnings`.

### 4. Auto-Proceed

Display: "**Proceeding to readiness validation...**"

#### Menu Handling Logic:
- After preflight, prerequisite checks, and artifact gating complete, load, read fully, and execute `{nextStepFile}`.

#### EXECUTION RULES:
- This is an auto-proceed step with no final menu.
- Stop only on hard prerequisite failures or when the user declines to continue past missing artifacts.

## SYSTEM SUCCESS/FAILURE METRICS:

### SUCCESS:
- The large-audience SprintPlan phase branch is ready and checked out.
- Medium-to-large promotion prerequisites are validated.
- Required planning artifacts are checked and any warning-mode decision is explicit.

### SYSTEM FAILURE:
- The working tree is dirty.
- DevProposal is incomplete.
- Audience promotion is not complete.
- The SprintPlan branch cannot be created or checked out.
- The user declines to continue with missing required artifacts.

**Master Rule:** Skipping steps is FORBIDDEN.