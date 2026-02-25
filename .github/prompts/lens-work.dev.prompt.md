```prompt
---
description: Launch Dev phase — implementation loop with code review and retrospective (Amelia/Developer, base audience, requires large→base promotion)
---

Activate @lens agent and execute /dev:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/dev` command to launch the Dev phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify large→base audience promotion is complete (constitution gate via constitution skill)
6. Verify ancestry: `origin/{initiative_root}-large-sprintplan` is ancestor of `origin/{initiative_root}-large`
7. Verify dev story exists (interactive mode) at `{bmad_docs}/dev-story-{id}.md` or fallback to `_bmad-output/implementation-artifacts/dev-story-{id}.md`
8. Derive audience from lifecycle contract: `dev` → `base`
9. Create and checkout phase branch `{initiative_root}-dev` from base (push immediately)
10. Delegate implementation to Amelia (Developer)

Use `#think` before decomposing implementation tasks or selecting code patterns.

**Phase identity:**
- Phase: `dev` | Display: Dev | Audience: `base`
- Agent owner: Amelia (Developer)
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

**[3] Checkout Target Repo**
- Git-orchestration switches from BMAD control repo to `TargetProjects/{repo}/`
- Checkout feature branch in target repo (creates if needed, pushes immediately)

**[4] Implementation Loop (repeating per task)**
- Amelia implements task per dev story guidance and constitutional context
- Code review after EACH task (not at end): constitution-aware adversarial review
- Push implementation commits to feature branch in target repo

**[5] Code Review (per task, constitution-aware)**
- Adversarial review of implementation against: story acceptance criteria, constitutional rules, architecture decisions
- FAIL blocks the task (not the whole story)
- WARN records in review-log but allows continuation

**[6] Epic Completion Check**
- After all tasks in story complete: verify all acceptance criteria met
- If this story is the last story in an epic: run epic teardown (party mode review of the epic)
- Epic teardown participants: Winston (Arch), Mary (Analyst), Quinn (QA)

**[7] Retrospective**
- Bob conducts sprint retrospective
- Output: `retro.md` documenting what worked, what didn't, action items

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
- TARGET branch: `{repo-feature-branch}` in `TargetProjects/{repo}/` (implementation lives here)
- END: PR from target feature branch → target repo main; dev phase branch updated with any BMAD artifacts

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
