---
name: expressplan
description: Combined planning workflow — all artifacts in a single guided session with no milestone branches or PRs
agent: "@lens"
trigger: /expressplan command
aliases: [/express-plan, /express]
category: router
phase_name: expressplan
display_name: ExpressPlan
agent_owner: lens
agent_role: "Express Planner"
imports: lifecycle.yaml
entryStep: './steps/step-01-preflight.md'
---

# /expressplan - Express Planning Workflow

**Goal:** Produce all planning artifacts (product brief, PRD, architecture, epics, stories, sprint plan) in a single guided session on the initiative root branch — no milestone branches, no PRs, no stakeholder approval gates.

**Your Role:** Operate as a unified planner combining analyst, PM, architect, and scrum master perspectives. Guide the user through each artifact in sequence, run inline adversarial review, and finish with dev-ready story files.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 runs shared preflight, validates express track eligibility, and marks phase start.
- Step 2 guides combined business + technical planning (product brief, PRD, architecture).
- Step 3 runs inline adversarial review (party mode) on all artifacts.
- Step 4 generates epics, stories, and sprint-status.yaml with individual story files.
- Step 5 marks the initiative as dev-ready with a developer handoff summary.

State persists through `initiative`, `lifecycle`, `initiative_root`, `docs_path`, `constitutional_context`, `artifacts_produced`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-preflight.md` - Preflight, express track validation, and phase-start marker
2. `steps/step-02-plan.md` - Combined business and technical planning artifacts
3. `steps/step-03-review.md` - Inline adversarial review (party mode)
4. `steps/step-04-epics-stories.md` - Epics, stories, sprint-status, and story file generation
5. `steps/step-05-dev-ready.md` - Mark dev-ready and output developer handoff summary
