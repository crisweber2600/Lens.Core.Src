````prompt
---
description: 'Lightweight post-dev adjustment - make tweaks without full /dev ceremony'
---

Activate @lens agent and execute #adjust:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `#adjust` command to launch the Adjust utility workflow
3. Load workflow: `_bmad/lens-work/workflows/utility/adjust/workflow.md`
4. Follow all steps in the workflow sequentially

**Workflow identity:**
- Type: Utility (not a phase command)
- Ceremony: Abbreviated - single-pass review, no adversarial/party mode
- Agent owner: None specific - developer stays as themselves
- Constitution mode: Advisory only (non-blocking)

**Prerequisites:**
- Active initiative exists and has completed at least one `/dev` cycle
- Initiative phase is `dev`, `promote`, or `complete`
- Target repo is accessible

**Scope guardrails:**
- 5 files changed or fewer
- 100 lines added or fewer
- No new planning artifacts required
- No architecture changes
- If exceeded: warn and suggest `/dev` instead (allow override)

**Execution sequence:**

**[1] Parse and Validate**
- Parse `initiative_id` from command argument
- Load initiative state from `_bmad-output/lens-work/initiatives/{initiative_id}.yaml`
- Validate phase is dev/promote/complete
- Load target repo info

**[2] Load Constitutional Context (Advisory)**
- Invoke constitution skill in advisory mode
- Surface guidance without blocking

**[3] Create Adjust Branch**
- Base: `{initiative_root}-dev`
- New: `adjust/{initiative_id}-{timestamp}`
- Checkout target repo on adjust branch

**[4] Developer Makes Changes**
- Developer works freely in target repo
- Commit prefix: `adjust:`
- Signal completion with: `@lens done`

**[5] Abbreviated Code Review**
- Single-pass review (no adversarial, no party mode, no multi-agent teardown)
- Check: syntax/lint, obvious logic bugs, constitutional advisory warnings, test coverage impact
- Size guard: warn if >5 files or >100 lines

**[6] Commit, Push, PR**
- Ensure all changes committed with `adjust:` prefix
- Push adjust branch
- Create PR: `adjust/{initiative_id}-*` -> `{initiative_root}-dev`

**[7] Log and Cleanup**
- Append `adjust-complete` event to `_bmad-output/lens-work/event-log.jsonl`
- Return to BMAD control repo

**User interaction keywords:**
- `@lens done` -> trigger abbreviated review
- `@lens abort` -> abandon adjust, delete branch, return to control repo

**Output artifacts:**
- PR from adjust branch to dev branch (primary output)
- Event log entry in `event-log.jsonl`
````
