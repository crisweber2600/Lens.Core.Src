```prompt
---
description: Launch SprintPlan phase — sprint backlog and dev-ready stories (Bob/Scrum Master, large audience, requires medium→large promotion)
---

Activate @lens agent and execute /sprintplan:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/sprintplan` command to launch the SprintPlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify medium→large audience promotion is complete (stakeholder approval gate passed)
6. Verify ancestry: `origin/{initiative_root}-medium` is ancestor of `origin/{initiative_root}-large`
7. Verify ALL required artifacts exist at `{docs_path}/`
8. Derive audience from lifecycle contract: `sprintplan` → `large`
9. Create and checkout phase branch `{initiative_root}-large-sprintplan` from `{initiative_root}-large` (push immediately)
10. Delegate artifact work to Bob (Scrum Master)

Use `#think` before prioritizing stories or allocating sprint capacity.

**Phase identity:**
- Phase: `sprintplan` | Display: SprintPlan | Audience: `large`
- Agent owner: Bob (Scrum Master)
- Branch pattern: `{initiative_root}-large-sprintplan`
- Role gate: Scrum Master

**Prerequisites:**
- `/devproposal` complete: `{initiative_root}-medium-devproposal` PR merged into `{initiative_root}-medium`
- **Medium → large audience promotion done** (stakeholder approval gate)
- ALL required artifacts present at `{docs_path}/`: `product-brief.md`, `prd.md`, `architecture.md`, `epics.md`, `stories.md`, `readiness-checklist.md`
- `state.yaml` exists with `active_initiative` set

**Audience promotion gate (medium → large):**
- Gate: stakeholder-approval
- Entry condition: devproposal phase merged, all medium-audience artifacts present
- Stakeholders review epics, stories, and readiness checklist before approval

**Workflow sequence:**
- **[1] Re-run Readiness Checklist** (required) — validate all artifacts in validate mode; BLOCK on readiness blockers
- **[2] Constitutional Compliance Check** (required) — constitution skill validates all artifacts against resolved constitutional rules; BLOCK on compliance failures
- **[3] Sprint Planning** (required) — Bob prioritizes stories, allocates capacity, creates sprint backlog
- **[4] Dev Story Creation** (required) — Bob creates dev-ready story file(s) for immediate developer handoff

**Constitutional compliance gate:**
- Constitution skill evaluates: `product-brief.md`, `prd.md`, `architecture.md`, `epics.md`, `stories.md`, `readiness-checklist.md`
- FAIL (block) on any compliance failures; WARN on warnings (passed_with_warnings)
- Gate status stored in `initiative_config.phase_status.sprintplan`

**Branch lifecycle:**
- START: `{initiative_root}-large-sprintplan` created from `{initiative_root}-large`, pushed immediately
- WORK: Sprint backlog and dev stories created on this branch
- END: PR from `{initiative_root}-large-sprintplan` → `{initiative_root}-large`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to run `_bmad\lens-work\scripts\store-github-pat.ps1` in separate terminal, then retry
- Push artifacts to `{initiative_root}-large-sprintplan`
- Create PR: `{initiative_root}-large-sprintplan` → `{initiative_root}-large`
- Update `phase_status.sprintplan: pr_pending` (or `passed_with_warnings`) and `audience_status.medium_to_large: complete`
- Update `state.yaml`: `current_phase: sprintplan`, `workflow_status: pr_pending`
- Append events to `event-log.jsonl` (sprintplan-start, sprintplan-checklist, sprintplan-compliance, sprintplan-complete)
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts:**
- `{initiative.docs.bmad_docs}/sprint-backlog.md` (required)
- `{initiative.docs.bmad_docs}/dev-story-{id}.md` (required, one per selected story)

**After SprintPlan:** Run large → base audience promotion (constitution gate via constitution skill) before `/dev`

**Next steps:**
1. Merge sprintplan PR into `{initiative_root}-large`
2. Run audience promotion (large → base) — constitution gate
3. Run `/dev` to begin implementation in target repos

**Developer handoff:** Confirm story assignment and hand off dev story file to Amelia (Developer)
```
