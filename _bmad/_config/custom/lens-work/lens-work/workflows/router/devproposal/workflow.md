---
name: devproposal
description: Implementation proposal (Epics/Stories/Readiness)
agent: "@lens"
trigger: /devproposal command
aliases: [/plan]
category: router
phase_name: devproposal
display_name: DevProposal
agent_owner: john
agent_role: PM
imports: lifecycle.yaml
entryStep: './steps/step-01-preflight.md'
---

# /devproposal - DevProposal Phase Router

**Goal:** Prepare the medium-audience devproposal branch, run epics, stories, and readiness workflows, and close the phase with a reviewable PR.

**Your Role:** Operate as John's implementation-planning router for the medium audience. Validate promotion readiness, prepare the phase branch, orchestrate epics and readiness work, and finish with the standard PR-based phase closeout.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 runs shared preflight, validates the small-to-medium entry gate, and prepares the phase branch.
- Step 2 captures execution mode and the devproposal run profile.
- Step 3 invokes the epics, stories, and readiness workflows, including the epic stress gates.
- Step 4 commits artifacts, creates the phase PR, updates initiative state, and reports the next action.

State persists through `initiative`, `lifecycle`, `phase_branch`, `audience_branch`, `docs_path`, `constitutional_context`, `execution_mode`, `run_epic_stress_gate`, and `pr_result`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `step-01-preflight.md` - Preflight, promotion gate validation, and phase-branch setup
2. `step-02-select-mode.md` - Execution-mode capture and run-profile selection
3. `step-03-run-workflows.md` - Epics, stories, readiness, and epic stress gates
4. `step-04-closeout.md` - Commit, PR creation, state update, and promotion check
