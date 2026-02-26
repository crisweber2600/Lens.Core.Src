```prompt
---
description: Launch DevProposal phase — epics, stories, and readiness (John/PM, medium audience, requires small→medium promotion)
---

Activate @lens agent and execute /devproposal:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/devproposal` command to launch the DevProposal phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify small→medium audience promotion is complete (adversarial review gate passed)
6. Verify ancestry: `origin/{initiative_root}-small` is ancestor of `origin/{initiative_root}-medium`
7. Verify required artifacts exist: `{docs_path}/prd.md`, `{docs_path}/architecture.md`
8. Derive audience from lifecycle contract: `devproposal` → `medium`
9. Create and checkout phase branch `{initiative_root}-medium-devproposal` from `{initiative_root}-medium` (push immediately)
10. Delegate artifact work to John (PM)

Use `#think` before decomposing architecture into epics or estimating scope.

**Phase identity:**
- Phase: `devproposal` | Display: DevProposal | Audience: `medium`
- Agent owner: John (PM)
- Branch pattern: `{initiative_root}-medium-devproposal`
- Aliases: `/plan`
- Role gate: PO, Architect, Tech Lead

**Prerequisites:**
- All small-audience phases complete: `preplan`, `businessplan`, `techplan` PRs merged into `{initiative_root}-small`
- **Small → medium audience promotion done** (adversarial review gate — party mode with John, Winston, Mary)
- `prd.md` and `architecture.md` exist at `{docs_path}/`
- `state.yaml` exists with `active_initiative` set

**Audience promotion gate (small → medium):**
- Mode: party (adversarial review)
- Lead reviewer: Winston (Architect)
- Participants: Winston, Mary (Analyst), Sally (UX Designer)
- Focus: Buildable? Well-researched? UX-aligned?
- Gate entry: all three small-audience phase PRs merged

**Workflow sequence:**
- **[1] Epic Generation** (required) — John generates epics from architecture + PRD
- **[2] Epic Stress Gate** (required) — for EACH epic: adversarial review + party-mode teardown (blocks on failure)
- **[3] Story Generation** (required) — John generates implementation stories from epics
- **[4] Readiness Checklist** (required) — validate all artifacts are present and implementation-ready

**Epic Stress Gate (mandatory — runs per epic):**
- Run `bmm.check-implementation-readiness` in adversarial mode for each epic
- Run `core.party-mode` review focused on each epic
- FAIL if readiness check returns `blocked` or party mode returns unresolved issues
- All epics must pass before stories are generated

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `pause` / `back` → halt or roll back

**Context injection:**
- Loads `{docs_path}/product-brief.md`, `{docs_path}/prd.md`, `{docs_path}/architecture.md`
- Loads repo README/SETUP from `{repo_docs_path}/` if available
- Constitutional context resolved by constitution skill before artifact generation

**Branch lifecycle:**
- START: `{initiative_root}-medium-devproposal` created from `{initiative_root}-medium`, pushed immediately
- WORK: Epic/story generation on this branch
- END: PR from `{initiative_root}-medium-devproposal` → `{initiative_root}-medium`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to run `_bmad\lens-work\scripts\store-github-pat.ps1` in separate terminal, then retry
- Push artifacts to `{initiative_root}-medium-devproposal`
- Create PR: `{initiative_root}-medium-devproposal` → `{initiative_root}-medium`
- Update `phase_status.devproposal: pr_pending` and `audience_status.small_to_medium: complete` in initiative config
- Update `state.yaml`: `current_phase: devproposal`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `epics.md` (required)
- `epic-{id}-party-mode-review.md` (per epic, written alongside)
- `stories.md` (required)
- `readiness-checklist.md` (required)

**After DevProposal:** Run medium → large audience promotion (stakeholder approval gate) before `/sprintplan`

**Next phase:** `/sprintplan` — runs after medium→large promotion complete
```
