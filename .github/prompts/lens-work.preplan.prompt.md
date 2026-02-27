```prompt
---
description: Launch PrePlan phase — brainstorming, research, and product brief (Mary/Analyst, small audience)
---

Activate @lens agent and execute /preplan:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/preplan` command to launch the PrePlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load `_bmad-output/lens-work/state.yaml` and active initiative config
5. Derive audience from lifecycle contract: `preplan` → `small`
6. Create and checkout phase branch `{initiative_root}-small-preplan` from `{initiative_root}-small` (push immediately)
7. Activate Mary (Analyst) as agent owner for this phase:
   - Load and adopt persona from: `_bmad/bmm/agents/analyst.md`
   - Remain as Mary for all artifact work in this phase

Use `#think` before defining problem scope or selecting workflows.

**Phase identity:**
- Phase: `preplan` | Display: PrePlan | Audience: `small`
- Agent owner: Mary (Analyst) — persona file: `_bmad/bmm/agents/analyst.md`
- Branch pattern: `{initiative_root}-small-preplan`
- Aliases: `/pre-plan`

**Prerequisites:**
- Initiative created via `/new-domain`, `/new-service`, or `/new-feature`
- `_bmad-output/lens-work/state.yaml` exists with `active_initiative` set
- Initiative config exists at `_bmad-output/lens-work/initiatives/{id}.yaml`

**⚠️ CRITICAL — Interactive Workflow Rules:**
Each sub-workflow below uses sequential step-file architecture.
- 🛑 **NEVER** auto-complete or batch-generate content without user input
- ⏸️ **ALWAYS** STOP and wait for user input/confirmation at each step
- 🚫 **NEVER** load the next step file until user explicitly confirms (Continue / C)
- 📋 Back-and-forth dialogue is REQUIRED — you are a facilitator, not a generator
- 💾 Save/update frontmatter after completing each step before loading the next
- 🎯 Read the ENTIRE step file before taking any action within it

**Workflow options (present menu and WAIT for user selection before proceeding):**

- **[1] Brainstorming** (optional) — Creative exploration with CIS
  → When selected: Read fully and follow `_bmad/core/workflows/brainstorming/workflow.md`
  → Uses step-file architecture — halt at each step, wait for user input

- **[2] Research** (optional) — Market/domain/competitive deep dive
  → When selected: Ask user which type: [M]arket / [D]omain / [T]echnical, then read fully and follow:
    - Market: `_bmad/bmm/workflows/1-analysis/research/workflow-market-research.md`
    - Domain: `_bmad/bmm/workflows/1-analysis/research/workflow-domain-research.md`
    - Technical: `_bmad/bmm/workflows/1-analysis/research/workflow-technical-research.md`
  → Uses step-file architecture — halt at each step, wait for user input

- **[3] Product Brief** (required) — Define problem, vision, scope, and success criteria
  → When reached: Read fully and follow `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`
  → Loads step files one at a time (JIT): start with `steps/step-01-init.md`
  → **NEVER** load multiple step files simultaneously
  → **ALWAYS** halt at menus and wait for user input before proceeding

Recommended path: 1 → 2 → 3 (or skip to 3 if you have clarity)

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
- Verify PAT configured: Check for `GITHUB_PAT` or `GH_ENTERPRISE_TOKEN` environment variable, or `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to set `GITHUB_PAT` env var (or `GH_ENTERPRISE_TOKEN` for enterprise) or run `store-github-pat.ps1`/`store-github-pat.sh` in separate terminal, then retry
- Push artifacts to `{initiative_root}-small-preplan`
- Create PR using promote-branch script: `_bmad/lens-work/scripts/promote-branch.sh -s {initiative_root}-small-preplan -t {initiative_root}-small` (or `.ps1` on Windows)
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
