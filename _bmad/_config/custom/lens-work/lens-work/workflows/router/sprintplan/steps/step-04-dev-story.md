---
name: 'step-04-dev-story'
description: 'Create the selected dev-ready story after sprint planning completes'
nextStepFile: './step-05-closeout.md'
workflowXml: '{project-root}/_bmad/core/tasks/workflow.yaml'
scrumMasterAgent: '{project-root}/_bmad/bmm/agents/sm.md'
devStoryWorkflow: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml'
---

# Step 4: Create Dev-Ready Story

## STEP GOAL:

Generate the developer-facing story artifact that `/dev` consumes after sprint planning completes.

## MANDATORY EXECUTION RULES:

### Universal Rules:
- Read the complete step file before taking action.
- Use the story selected by SprintPlan output, not an ad hoc story choice.
- Preserve constitutional context while generating the dev-story artifact.

### Role Reinforcement:
- You are the LENS control-plane router.
- Convert SprintPlan output into a developer-ready handoff without losing traceability.

### Step-Specific Rules:
- Load `{scrumMasterAgent}` before executing `{devStoryWorkflow}`.
- Load `{workflowXml}` and execute `{devStoryWorkflow}` through the workflow engine.
- Generate the story artifact in `{bmad_docs}` so `/dev` can consume it directly.

## EXECUTION PROTOCOLS:
- Follow the numbered sequence exactly.
- Start workflow tracking before sub-workflow execution and finish it afterward.
- Persist the created story id and output path for closeout.

## CONTEXT BOUNDARIES:
- Available context: selected sprint story, `{workflowXml}`, `{scrumMasterAgent}`, and `{devStoryWorkflow}`.
- Focus: dev-story generation and handoff readiness.
- Limits: do not create the SprintPlan PR in this step.
- Dependencies: successful sprint planning output.

---

## MANDATORY SEQUENCE

### 1. Create Dev Story

Start workflow tracking for `dev-story`.

Load `{scrumMasterAgent}`, then load `{workflowXml}` and execute `{devStoryWorkflow}` with:
- `story_id = {selected_story}`
- `output_path = {bmad_docs}`
- `constitutional_context = current constitutional context`

Finish workflow tracking after dev-story generation completes.

Display the resulting developer-facing story artifact location and confirm that acceptance criteria and technical notes are present.

### 2. Auto-Proceed

Display: "**Proceeding to closeout and handoff...**"

#### Menu Handling Logic:
- After dev-story generation completes successfully, load, read fully, and execute `{nextStepFile}`.

#### EXECUTION RULES:
- This is an auto-proceed step with no user choice.
- Halt only if dev-story generation fails or does not produce the required artifact.

## SYSTEM SUCCESS/FAILURE METRICS:

### SUCCESS:
- The dev-story workflow executes through the workflow engine.
- A developer-facing story artifact is created in `{bmad_docs}`.

### SYSTEM FAILURE:
- The selected story cannot be generated into a dev-story artifact.
- The generated artifact is incomplete or missing.

**Master Rule:** Skipping steps is FORBIDDEN.