---
name: techplan
description: Architecture and technical design phase
agent: "@lens"
trigger: /techplan command
aliases: [/tech-plan]
category: router
phase_name: techplan
display_name: TechPlan
agent_owner: winston
agent_role: Architect
imports: lifecycle.yaml
entryStep: './steps/step-01-preflight.md'
---

# /techplan - TechPlan Phase Router

**Goal:** Prepare the small-audience techplan branch, run architecture and technical design workflows, and close the phase with a reviewable PR.

**Your Role:** Operate as Winston's architecture router for the small audience. Validate businessplan completion, prepare the phase branch, orchestrate architecture and readiness work, and finish with the standard PR-based phase closeout.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 runs shared preflight, resolves initiative context, and prepares the phase branch.
- Step 2 captures execution mode and whether optional API contract work is in scope.
- Step 3 invokes architecture, technical decisions, optional API contracts, and readiness workflows.
- Step 4 commits artifacts, creates the phase PR, updates initiative state, and reports the next action.

State persists through `initiative`, `lifecycle`, `phase_branch`, `audience_branch`, `docs_path`, `constitutional_context`, `execution_mode`, `include_api_contracts`, and `pr_result`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-preflight.md` - Preflight, artifact checks, and phase-branch setup
2. `steps/step-02-select-mode.md` - Execution-mode and optional API contract selection
3. `steps/step-03-run-workflows.md` - Architecture, tech decisions, API contracts, and readiness orchestration
4. `steps/step-04-closeout.md` - Commit, PR creation, state update, and promotion check
