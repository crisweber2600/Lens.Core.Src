```prompt
---
description: Launch PrePlan phase — brainstorming, research, and product brief (Mary/Analyst, small audience)
---

Activate @lens agent and execute /preplan:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/preplan` command to launch the PrePlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load `_bmad-output/lens-work/state.yaml` and active initiative config
5. Derive audience from lifecycle contract: `preplan` → `small`
6. Create and checkout phase branch `{initiative_root}-small-preplan` from `{initiative_root}-small` (push immediately)
7. Delegate artifact work to Mary (Analyst)

Use `#think` before defining problem scope or selecting workflows.

**Phase identity:**
- Phase: `preplan` | Display: PrePlan | Audience: `small`
- Agent owner: Mary (Analyst)
- Branch pattern: `{initiative_root}-small-preplan`
- Aliases: `/pre-plan`

**Prerequisites:**
- Initiative created via `/new-domain`, `/new-service`, or `/new-feature`
- `_bmad-output/lens-work/state.yaml` exists with `active_initiative` set
- Initiative config exists at `_bmad-output/lens-work/initiatives/{id}.yaml`

**Workflow options (present in order):**
- **[1] Brainstorming** (optional) — CIS creative exploration of the problem space
- **[2] Research** (optional) — CIS deep-dive market/domain/competitive research
- **[3] Product Brief** (required) — Define problem, vision, scope, and success criteria

Recommended path: 1 → 2 → 3 (or skip to Product Brief if clarity exists)

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `all questions` / `batch questions` → present all questions upfront, then generate
- `skip` → jump to named optional step
- `pause` / `back` → halt or roll back

**Branch lifecycle:**
- START: `{initiative_root}-small-preplan` created from `{initiative_root}-small`, pushed immediately
- WORK: All sub-workflow branches created from `{initiative_root}-small-preplan`
- END: PR from `{initiative_root}-small-preplan` → `{initiative_root}-small`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to run `_bmad\lens-work\scripts\store-github-pat.ps1` in separate terminal, then retry
- Push artifacts to `{initiative_root}-small-preplan`
- Create PR: `{initiative_root}-small-preplan` → `{initiative_root}-small`
- Update `phase_status.preplan: pr_pending` in initiative config
- Update `state.yaml`: `current_phase: preplan`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `product-brief.md` (required)
- `brainstorm-notes.md` (if brainstorming run)
- `research-summary.md` (if research run)

**Next phase:** `/businessplan` — runs after preplan PR is merged into `{initiative_root}-small`

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, treat it as additional
context for the product brief. Do NOT invent feature scope not provided by the user.
```
