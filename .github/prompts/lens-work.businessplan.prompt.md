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
8. Activate agents per sub-workflow (agent persona adopts per workflow below)

Use `#think` before defining product requirements or UX scope.

**Phase identity:**
- Phase: `businessplan` | Display: BusinessPlan | Audience: `small`
- Agent owner: John (PM) — `_bmad/bmm/agents/pm.md`
- Supporting: Sally (UX Designer) — `_bmad/bmm/agents/ux-designer.md`
- Supporting: Winston (Architect) — `_bmad/bmm/agents/architect.md`
- Branch pattern: `{initiative_root}-small-businessplan`

**Prerequisites:**
- `/preplan` complete: `{initiative_root}-small-preplan` PR merged into `{initiative_root}-small`
- `product-brief.md` exists at `{docs_path}/product-brief.md`
- `state.yaml` exists with `active_initiative` set

**⚠️ CRITICAL — Interactive Workflow Rules:**
Each sub-workflow below uses sequential step-file architecture.
- 🛑 **NEVER** auto-complete or batch-generate content without user input
- ⏸️ **ALWAYS** STOP and wait for user input/confirmation at each step
- 🚫 **NEVER** load the next step file until user explicitly confirms (Continue / C)
- 📋 Back-and-forth dialogue is REQUIRED — you are a facilitator, not a generator
- 💾 Save/update frontmatter after completing each step before loading the next
- 🎯 Read the ENTIRE step file before taking any action within it

**Workflow sequence (present menu and WAIT for user selection before proceeding):**

- **[1] PRD Creation** (required) — Adopt John (PM) persona: `_bmad/bmm/agents/pm.md`
  → When reached: Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`
  → Uses step-file architecture with `steps-c/` folder — halt at each step, wait for user input

- **[2] PRD Validation** (required) — Continue as John (PM)
  → When reached: Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-validate-prd.md`
  → Adversarial review of PRD for completeness and buildability

- **[3] UX Design** (required if UI involved) — Switch to Sally (UX Designer) persona: `_bmad/bmm/agents/ux-designer.md`
  → When reached: Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`
  → Uses step-file architecture with `steps/` folder — halt at each step, wait for user input

- **[4] Architecture** (required) — Switch to Winston (Architect) persona: `_bmad/bmm/agents/architect.md`
  → When reached: Read fully and follow `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
  → Uses step-file architecture with `steps/` folder — halt at each step, wait for user input

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `all questions` / `batch questions` → present all questions upfront, then generate
- `skip` → jump to named optional step
- `pause` / `back` → halt or roll back

**Context injection:**
- Loads `{docs_path}/product-brief.md` from preplan phase
- Loads repo README/CONTRIBUTING from `{repo_docs_path}/` if available
- Constitutional context resolved by constitution skill before artifact generation

**Branch lifecycle:**
- START: `{initiative_root}-small-businessplan` created from `{initiative_root}-small`, pushed immediately
- WORK: All sub-workflow branches created from `{initiative_root}-small-businessplan`
- END: PR from `{initiative_root}-small-businessplan` → `{initiative_root}-small`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to run `bmad.lens.release\_bmad\lens-work\scripts\store-github-pat.ps1` in separate terminal, then retry
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
