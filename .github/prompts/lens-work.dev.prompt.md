```prompt
---
description: Launch Dev phase — implementation loop with code review and retrospective (Amelia/Developer, base audience, requires large→base promotion)
---

Activate @lens agent and execute /dev:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/dev` command to launch the Dev phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify large→base audience promotion is complete (constitution gate via constitution skill)
6. Verify ancestry: `origin/{initiative_root}-large-sprintplan` is ancestor of `origin/{initiative_root}-large`
7. Verify dev story exists (interactive mode) at `{bmad_docs}/dev-story-{id}.md` or fallback to `_bmad-output/implementation-artifacts/dev-story-{id}.md`
8. Derive audience from lifecycle contract: `dev` → `base`
9. Create and checkout phase branch `{initiative_root}-dev` from base (push immediately)
10. Activate Amelia (Developer) as agent owner for this phase:
    - Load and adopt persona from: `_bmad/bmm/agents/dev.md`
    - Remain as Amelia for implementation work; switch persona for code review and retro as noted below

Use `#think` before decomposing implementation tasks or selecting code patterns.

**Phase identity:**
- Phase: `dev` | Display: Dev | Audience: `base`
- Agent owner: Amelia (Developer) — `_bmad/bmm/agents/dev.md`
- Branch pattern: `{initiative_root}-dev`
- Role gate: Developer (post-review only)

**Prerequisites:**
- `/sprintplan` complete: `{initiative_root}-large-sprintplan` PR merged into `{initiative_root}-large`
- **Large → base audience promotion done** (constitution gate via constitution skill)
- Dev story exists at `{bmad_docs}/dev-story-{id}.md` (created by `/sprintplan`)
- `state.yaml` exists with `active_initiative` set and `audience_status.large_to_base: passed`

**Audience promotion gate (large → base):**
- Gate: constitution (via @lens/constitution)
- Constitution skill resolves and validates all artifacts against constitutional rules
- Entry condition: all large-audience phases merged into `{initiative_root}-large`
- Dev phase is blocked until this gate passes

**⚠️ CRITICAL — Workflow Engine Rules:**
Sub-workflows [4], [5], and [7] use YAML-based workflow.yaml files with the workflow engine.
- Load `_bmad/core/tasks/workflow.yaml` FIRST as the execution engine
- Pass the `workflow.yaml` path to the engine
- Follow the engine instructions precisely — execute steps sequentially
- Save outputs after completing EACH engine step (never batch)
- STOP and wait for user at decision points

**Execution sequence:**

**[0] Pre-Flight (required)**
- Verify clean working directory (git-orchestration)
- Load two-file state
- Verify `audience_status.large_to_base` is `passed` or `passed_with_warnings`
- Create phase branch `{initiative_root}-dev` from base; push immediately

**[1] Audience Promotion Check**
- Confirm `sprintplan` branch is merged into large audience branch (ancestry check)
- Confirm constitution gate (large→base) is `passed` or `passed_with_warnings`

**[1a] Constitutional Context Injection (required)**
- Constitution skill resolves constitutional context for current domain/service
- BLOCK on parse errors; store context for the entire implementation session

**[2] Load Dev Story**
- Load dev story from `{bmad_docs}/dev-story-{id}.md` (REQ-10) or fallback to `_bmad-output/implementation-artifacts/dev-story-{id}.md`
- Display: story title, acceptance criteria, technical notes, target branch

**[2a] Dev Story Constitution Check (required)**
- Constitution skill runs compliance check on dev story
- BLOCK if `fail_count > 0` — resolve story issues before implementation

**[3] Checkout Target Repo — Epic & Story Branch Management**
- Git-orchestration switches from BMAD control repo to `TargetProjects/{repo}/`
- Resolve epic key from story key (e.g., story `1-2-user-auth` → `epic-1`)
- Ensure epic branch exists: `feature/{epic-key}` (created from `develop` or `main` if missing)
- Create/checkout story branch: `feature/{epic-key}-{story-key}` (from epic branch, push immediately)
- Store `epic_key`, `epic_branch`, `story_branch` in session for Steps 4-6

**[4] Implementation Loop (repeating per task)** — Continue as Amelia (Developer)
  → Load workflow engine FIRST: `_bmad/core/tasks/workflow.yaml`
  → Pass to engine: `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
  → Amelia implements task per dev story guidance and constitutional context
  → Engine executes steps sequentially — save outputs after EACH step
  → STOP and wait for user at decision points
  → **Auto-commit:** After each task completion, `git add -A && commit && push` to story branch
  → Commit format: `feat({story-key}): {task-description}`
  → **Auto-PR:** When ALL story tasks are complete, auto-create PR: story branch → epic branch
  → PR title format: `feat({epic-key}): {story-title} [{story-key}]`

**[5] Code Review (per task, constitution-aware)** — Switch to Quinn (QA) persona: `_bmad/bmm/agents/qa.md`
  → Load workflow engine FIRST: `_bmad/core/tasks/workflow.yaml`
  → Pass to engine: `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`
  → Adversarial review against: story acceptance criteria, constitutional rules, architecture decisions
  → FAIL blocks the task (not the whole story)
  → WARN records in review-log but allows continuation
  → After review: switch back to Amelia for next task

**[6] Epic Completion Check**
- After all tasks in story complete: verify all acceptance criteria met
- If this story is the last story in an epic: run epic teardown (party mode review)
  → Read fully and follow `_bmad/core/workflows/party-mode/workflow.md`
  → Epic teardown participants: Winston (Arch) `_bmad/bmm/agents/architect.md`, Mary (Analyst) `_bmad/bmm/agents/analyst.md`, Quinn (QA) `_bmad/bmm/agents/qa.md`

**[7] Retrospective** — Switch to Bob (Scrum Master) persona: `_bmad/bmm/agents/sm.md`
  → Load workflow engine FIRST: `_bmad/core/tasks/workflow.yaml`
  → Pass to engine: `_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml`
  → Bob conducts sprint retrospective
  → Output: `retro.md` documenting what worked, what didn't, action items

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining tasks in story
- `pause` / `back` → halt or roll back
- `review` → trigger immediate code review on current state
- `retro` → jump directly to retrospective

**Context injection:**
- Loads `{docs_path}/architecture.md` (read-only reference)
- Loads `{docs_path}/stories.md` (read-only reference)
- Dev outputs go to target repos via `TargetProjects/` — NOT to `{docs_path}/`

**Branch lifecycle:**
- BMAD branch: `{initiative_root}-dev` (stays on this throughout the dev phase)
- TARGET epic branch: `feature/{epic-key}` in `TargetProjects/{repo}/` (parent for all story branches)
- TARGET story branch: `feature/{epic-key}-{story-key}` in `TargetProjects/{repo}/` (implementation lives here)
- Task auto-commit: every completed task is committed+pushed to story branch immediately
- Story auto-PR: when all tasks done, PR from `feature/{epic-key}-{story-key}` → `feature/{epic-key}`
- Epic auto-PR: when all stories done and merged, PR from `feature/{epic-key}` → `develop`
- END: dev phase branch updated with any BMAD artifacts

**Phase completion:**
- All stories in sprint complete
- All PRs merged to target repos
- Retrospective complete
- Update `phase_status.dev: complete` in initiative config
- Update `state.yaml`: `current_phase: dev`, `workflow_status: complete`
- Append events to `event-log.jsonl` (dev-start, dev-story-{id}-complete, retro-complete, dev-complete)
- Remain on BMAD phase branch (REQ-7: never auto-merge)

**Output artifacts:**
- Implementation commits in target repo feature branches (primary output)
- `{bmad_docs}/review-log-{story-id}.md` (code review findings per story)
- `{bmad_docs}/retro.md` (sprint retrospective)

**CRITICAL — Developer Handoff:**
Developer reads the dev story file before starting. Accept dev story as the source
of truth for acceptance criteria. Do NOT invent requirements not present in the story.
If story is ambiguous, surface the question immediately rather than assuming.
```
