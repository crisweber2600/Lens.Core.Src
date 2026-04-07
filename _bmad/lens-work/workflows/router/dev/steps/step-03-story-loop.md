---
name: 'step-03-story-loop'
description: 'Execute the per-story implementation loop, review gate, PR creation, and BMAD control-plane updates'
nextStepFile: './step-04-epic-completion.md'
targetRepoRoutingData: '../resources/story-target-repo-routing.md'
implementationGuidanceData: '../resources/story-implementation-guidance.md'
reviewLoopData: '../resources/story-review-loop.md'
---

# Step 3: Story Implementation Loop

## STEP GOAL:

For each story in the epic, enforce constitutional gates, route implementation into the TargetProject repo, run review loops, and create the story PR before moving to the next story.

## MANDATORY EXECUTION RULES:

### Universal Rules:
- Read the complete step file before taking action.
- Process one story at a time in the resolved story order.
- Stop immediately when an enforced constitutional or review gate fails.

### Role Reinforcement:
- You are the LENS control-plane router.
- Protect the story-branch, epic-branch, and initiative-branch chain while coordinating implementation inside the TargetProject repo.

### Step-Specific Rules:
- NEVER skip the story constitution check or pre-implementation gates.
- Use `{targetRepoRoutingData}`, `{implementationGuidanceData}`, and `{reviewLoopData}` in that order for every story.
- Keep TargetProject writes inside `session.target_path` and keep control-plane state updates in the BMAD repo.

## EXECUTION PROTOCOLS:
- Follow the numbered sequence exactly for each story.
- Maintain `story_id`, `dev_story`, `dev_story_source`, `article_gates`, `session.story_branch`, `session.epic_branch`, and `session.stories_completed` throughout the loop.
- Do not advance to the next story until review, PR creation, and control-plane updates are complete for the current story.

## CONTEXT BOUNDARIES:
- Available context: `session.story_files`, `initiative`, `constitutional_context`, and the three referenced data files.
- Focus: story-by-story execution, gating, branch routing, implementation guidance, review, and PR creation.
- Limits: do not run the epic completion gate in this step.
- Dependencies: accepted story set from step 2 and successful preflight.

---

## MANDATORY SEQUENCE

### 1. Story Loop

Iterate `session.story_files` in order. For each story:
- derive `story_id`
- load the story artifact into `dev_story`
- persist `dev_story_source`
- present the story title, acceptance criteria, technical notes, and active `/dev` branch context before implementation begins

### 2. Story Constitution Check (Required)

Run `constitution.compliance-check` against the active story artifact.

If article-gate failures are present:
- display the failing gates
- auto-resolve and halt when enforcement mode is `enforced`
- otherwise record the advisory warning through constitutional complexity tracking

If legacy fail counts remain after compliance evaluation and enforcement mode is `enforced`, auto-resolve the gate block and halt.

### 3. Pre-Implementation Gates (Required)

Generate article gates for the active story and display the gate summary.

If any pre-implementation gate fails:
- auto-resolve and halt when enforcement mode is `enforced`
- otherwise gather the user’s justification for each override and record it through constitutional complexity tracking

Run the checklist quality gate against `bmad_docs` and `docs_path` before implementation proceeds.

### 4. Target Repo Routing, Implementation Guidance, And Review Loop

Load and apply the following references inside the active story iteration, in order:

- `{targetRepoRoutingData}` for initiative, epic, and story branch routing plus the dev write guard
- `{implementationGuidanceData}` for constitutional implementation guidance and per-task commit rules
- `{reviewLoopData}` for code review, party-mode teardown, story PR creation, and BMAD control-plane completion updates

### 4a. Checkpoint Session Progress

After each story completes review and PR creation, write a `dev-session.yaml` checkpoint to the BMAD control-plane repo. This enables resuming the epic loop if the session is interrupted by context compaction or session loss.

```yaml
dev_session = {
  epic_number: session.epic_number,
  initiative_root: initiative.initiative_root,
  started_at: session.dev_started_at || current_timestamp(),
  last_checkpoint: current_timestamp(),
  special_instructions: session.special_instructions || "",
  total_stories: count(session.story_files),
  stories_completed: session.stories_completed,
  stories_failed: session.stories_failed || [],
  current_story_index: current_loop_index + 1,
  status: "in-progress"
}

write_yaml("${initiative.docs_path}/dev-session.yaml", dev_session)

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - "${initiative.docs_path}/dev-session.yaml"
  phase: "DEV:CHECKPOINT"
  initiative: ${initiative.initiative_root}
  description: "[dev] checkpoint after story ${story_id}"
```

When `/dev` starts, check for an existing `dev-session.yaml`:
- If found with `status: in-progress` and `stories_completed` is non-empty, offer to **resume** from the next incomplete story instead of restarting. Display completed stories and confirm continuation.
- If found with `status: completed`, ignore and start fresh.

### 5. End-Of-Loop Summary

After the final story finishes, display the completed story list and confirm how many stories were successfully implemented in the epic.

### 6. Auto-Proceed

Display: "**Proceeding to the epic completion gate...**"

#### Menu Handling Logic:
- After the story loop completes successfully, load, read fully, and execute `{nextStepFile}`.

#### EXECUTION RULES:
- This is an auto-proceed step with no user choice.
- Halt only when a story-level gate, review loop, or PR creation block remains unresolved.

## SYSTEM SUCCESS/FAILURE METRICS:

### SUCCESS:
- Every story in `session.story_files` is processed in order.
- Story-level constitutional and pre-implementation gates are enforced.
- Target repo routing, implementation guidance, review, and PR creation all complete per story.
- `session.stories_completed` reflects the finished story set.

### SYSTEM FAILURE:
- Any story fails constitutional enforcement.
- Target repo routing or dev write guard fails.
- Code review, party-mode teardown, or story PR creation halts the loop.

**Master Rule:** Skipping steps is FORBIDDEN.