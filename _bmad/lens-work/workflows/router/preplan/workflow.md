---
name: preplan
description: Launch PrePlan phase (brainstorm/research/product brief)
agent: "@lens"
trigger: /preplan command
aliases: [/pre-plan]
category: router
phase_name: preplan
display_name: PrePlan
agent_owner: mary
agent_role: Analyst
imports: lifecycle.yaml
entryStep: './steps/step-01-preflight.md'
---

# /preplan - PrePlan Phase Router

**Goal:** Prepare the small-audience preplan branch, let the user choose the preplan sub-workflows to run, and close the phase with artifact commits, a phase PR, and next-step guidance.

**Your Role:** Operate as Mary’s phase router for early analysis. Validate track eligibility, set up the phase branch, orchestrate brainstorming, research, and product-brief generation, then complete the standard phase closeout flow.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 runs shared preflight, resolves initiative context, and prepares the phase branch.
- Step 2 captures workflow selection and execution mode.
- Step 3 invokes the selected preplan sub-workflows.
- Step 4 commits artifacts, creates the phase PR, updates initiative state, and reports the next action.

State persists through `initiative`, `lifecycle`, `phase_branch`, `audience_branch`, `output_path`, `selected_workflows`, `execution_mode`, `research_type`, and `pr_result`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `step-01-preflight.md` - Preflight, track validation, and phase-branch setup
2. `step-02-select-workflows.md` - Workflow and execution-mode selection
3. `step-03-run-workflows.md` - Brainstorming, research, and product-brief orchestration
4. `step-04-closeout.md` - Commit, PR creation, state update, and promotion check
