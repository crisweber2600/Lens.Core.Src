---
name: businessplan
description: Launch BusinessPlan phase (PRD/UX Design)
agent: "@lens"
trigger: /businessplan command
aliases: [/spec]
category: router
phase_name: businessplan
display_name: BusinessPlan
agent_owner: john
agent_role: PM
supporting_agents: [sally]
imports: lifecycle.yaml
entryStep: './steps/step-01-preflight.md'
---

# /businessplan - BusinessPlan Phase Router

**Goal:** Prepare the small-audience businessplan branch, let the user choose how to run PRD, UX, and architecture work, and close the phase with a reviewable PR.

**Your Role:** Operate as John's planning router for the small audience. Validate preplan completion, prepare the phase branch, orchestrate the selected planning workflows, and finish with the standard PR-based phase closeout.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 runs shared preflight, resolves initiative context, and prepares the phase branch.
- Step 2 captures execution mode and workflow selection.
- Step 3 invokes the selected businessplan sub-workflows.
- Step 4 commits artifacts, creates the phase PR, updates initiative state, and reports the next action.

State persists through `initiative`, `lifecycle`, `phase_branch`, `audience_branch`, `docs_path`, `constitutional_context`, `execution_mode`, `selected_workflows`, and `pr_result`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `step-01-preflight.md` - Preflight, artifact checks, and phase-branch setup
2. `step-02-select-workflows.md` - Execution-mode and workflow selection
3. `step-03-run-workflows.md` - PRD, UX, and architecture orchestration
4. `step-04-closeout.md` - Commit, PR creation, state update, and promotion check
