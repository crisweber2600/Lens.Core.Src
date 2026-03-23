---
name: 'step-05-closeout'
description: 'Create the SprintPlan PR, update state, log events, and hand off to development'
promotionCheckInclude: '../../includes/promotion-check.md'
---

# Step 5: Closeout, State, And Handoff

## STEP GOAL:

Finish SprintPlan by creating the phase PR, updating initiative state, logging events, and handing off the selected story to development.

## MANDATORY EXECUTION RULES:

### Universal Rules:
- Read the complete step file before taking action.
- Never auto-merge the SprintPlan PR.
- Persist state and event-log updates before handoff is announced.

### Role Reinforcement:
- You are the LENS control-plane router.
- Finish SprintPlan with auditable branch state, reviewable PR state, and a clean handoff into `/dev`.

### Step-Specific Rules:
- Use `git-orchestration.create-pr` rather than an ad hoc script path.
- Mark SprintPlan as `pr_pending` after PR creation.
- Run `{promotionCheckInclude}` after state and handoff updates complete.

## EXECUTION PROTOCOLS:
- Follow the numbered sequence exactly.
- Persist `pr_result`, `gate_status`, `compliance_warnings`, `missing`, and event-log entries before announcing completion.
- Keep SprintPlan branch state and audience status synchronized.

## CONTEXT BOUNDARIES:
- Available context: `phase_branch`, `audience_branch`, `missing`, `compliance_warnings`, `readiness`, `story_id`, and `{promotionCheckInclude}`.
- Focus: PR creation, state updates, event logging, and development handoff.
- Limits: do not rerun readiness or story generation in this step.
- Dependencies: successful sprint planning and dev-story generation.

---

## MANDATORY SEQUENCE

### 1. Phase Completion - Push And PR

Commit and push the SprintPlan phase branch.

Create the SprintPlan PR from `phase_branch` into `audience_branch` with `git-orchestration.create-pr`, capture the PR result, and keep the phase in `pr_pending` regardless of whether the PR was auto-created or fell back to manual instructions.

### 2. Gate Updates - Mark Pass Or Block

Compute `gate_status = passed_with_warnings` when artifact warnings or compliance warnings remain; otherwise use `passed`.

Update the initiative record so SprintPlan reflects the current gate status, reviewer, warnings, readiness summary, and completed medium-to-large audience promotion state.

### 3. Update State Files

Update workflow state so the active phase is `sprintplan`, the workflow status is `pr_pending`, and the active branch is `phase_branch`.

### 4. Event Logging

Append the SprintPlan start, checklist, compliance, and completion events to the event log.

### 5. Commit State Changes

Commit and push the updated initiative state, event log, SprintPlan outputs, and docs changes on the SprintPlan branch.

### 6. Hand Off To Developer

Display the development handoff summary with the selected story, assignee, SprintPlan branch, PR result, and next-step instructions.

Ask the user to confirm the developer handoff. If the user declines, stop after showing the handoff summary so they can review the branch and PR state manually.

### 7. Check Promotion Readiness

Load and apply `{promotionCheckInclude}` so LENS can determine whether the initiative is ready to promote beyond SprintPlan.


## OUTPUT ARTIFACTS

| Artifact | Location |
|----------|----------|
| Dev Story | `${initiative.docs.bmad_docs}/dev-story-${id}.md` |
| Sprint Backlog | `${initiative.docs.bmad_docs}/sprint-backlog.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |
| Event Log | `_bmad-output/lens-work/event-log.jsonl` |


## ERROR HANDLING

| Error | Recovery |
|-------|----------|
| DevProposal not complete | Error with merge instructions |
| Audience promotion (medium->large) not done | Auto-triggers `@lens promote` |
| Missing artifacts | Warn with list, offer override (passed_with_warnings) |
| Readiness blockers | Block - must resolve before proceeding |
| Dirty working directory | Prompt to stash or commit changes first |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |
| PR link generation failed | Output manual PR instructions |
| Sprint planning failed | Allow manual story selection |


## SYSTEM SUCCESS/FAILURE METRICS:

### SUCCESS:
- SprintPlan PR is created and the phase is left in `pr_pending`.
- Initiative state, workflow state, and event logs are updated and committed.
- The dev-story handoff is presented and promotion readiness is checked.

### SYSTEM FAILURE:
- PR creation fails without a usable fallback.
- State updates or event logging fail.
- Required SprintPlan outputs cannot be committed.

**Master Rule:** Skipping steps is FORBIDDEN.