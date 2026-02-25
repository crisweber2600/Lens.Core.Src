```prompt
---
description: Launch BusinessPlan phase — PRD, UX design, and architecture (John/PM + Sally/UX, small audience)
---

Activate @lens agent and execute /businessplan:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/businessplan` command to launch the BusinessPlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify `preplan` phase PR is merged into `{initiative_root}-small` before proceeding
6. Derive audience from lifecycle contract: `businessplan` → `small`
7. Create and checkout phase branch `{initiative_root}-small-businessplan` from `{initiative_root}-small` (push immediately)
8. Delegate artifact work to John (PM) with Sally (UX Designer) as supporting agent

Use `#think` before defining product requirements or UX scope.

**Phase identity:**
- Phase: `businessplan` | Display: BusinessPlan | Audience: `small`
- Agent owner: John (PM) | Supporting: Sally (UX Designer)
- Branch pattern: `{initiative_root}-small-businessplan`

**Prerequisites:**
- `/preplan` complete: `{initiative_root}-small-preplan` PR merged into `{initiative_root}-small`
- `product-brief.md` exists at `{docs_path}/product-brief.md`
- `state.yaml` exists with `active_initiative` set

**Workflow sequence:**
- **[1] PRD Creation** (required) — John creates Product Requirements Document from product brief
- **[2] PRD Validation** (required) — adversarial review of PRD for completeness and buildability
- **[3] UX Design** (required) — Sally creates UX design aligned with PRD requirements
- **[4] Architecture** (required) — Winston creates high-level architecture document from PRD + product brief

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `all questions` / `batch questions` → present all questions upfront, then generate
- `skip` → jump to named optional step
- `pause` / `back` → halt or roll back

**Context injection:**
- Loads `{docs_path}/product-brief.md` from preplan phase
- Loads repo README/CONTRIBUTING from `{repo_docs_path}/` if available
- Constitutional context resolved by Scribe before artifact generation

**Branch lifecycle:**
- START: `{initiative_root}-small-businessplan` created from `{initiative_root}-small`, pushed immediately
- WORK: All sub-workflow branches created from `{initiative_root}-small-businessplan`
- END: PR from `{initiative_root}-small-businessplan` → `{initiative_root}-small`; remain on phase branch

**Phase completion:**
- Push artifacts to `{initiative_root}-small-businessplan`
- Create PR: `{initiative_root}-small-businessplan` → `{initiative_root}-small`
- Update `phase_status.businessplan: pr_pending` and `phase_status.preplan: complete` in initiative config
- Update `state.yaml`: `current_phase: businessplan`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `prd.md` (required)
- `ux-design.md` (required)
- `architecture.md` (required)

**Next phase:** `/techplan` — runs after businessplan PR is merged into `{initiative_root}-small`
```
