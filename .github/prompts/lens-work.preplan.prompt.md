```prompt
---
description: Launch PrePlan phase — brainstorming, research, and product brief (Mary/Analyst, small audience)
---

Activate @lens agent and execute /preplan:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

**📊 VISUAL-FIRST DOCUMENTATION:** All documents generated in this phase MUST include Mermaid diagrams per the `visual_first_documentation` convention. Load `_bmad/lens-work/skills/visual-documentation.md` before creating any document. Product-brief requires: problem-solution flow diagram (flowchart), stakeholder map (flowchart).

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
- Auto-advance: `/businessplan` (no promotion needed — same audience)

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

**Workflow options (present single batch prompt BEFORE loading any workflows):**

```
🔍 PrePlan Phase Setup

Which workflows would you like to run?

[1] Brainstorming (optional) — Creative exploration with CIS [Y/N]
[2] Research (optional) — Deep dive [Market/Domain/Technical/None]
[3] Product Brief (required) — Problem definition and scope [Required - will run last]

Enter as: "Y | Domain | Y" or "N | None | Y" or "best defaults"
```

After receiving user input, execute workflows in sequence:
- If [1]=Y: Read fully and follow `_bmad/core/workflows/brainstorming/workflow.md`
- If [2]≠None: Read fully and follow the appropriate research workflow:
  - Market: `_bmad/bmm/workflows/1-analysis/research/workflow-market-research.md`
  - Domain: `_bmad/bmm/workflows/1-analysis/research/workflow-domain-research.md`
  - Technical: `_bmad/bmm/workflows/1-analysis/research/workflow-technical-research.md`
- [3] Product Brief always runs: `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`

Each workflow uses step-file architecture — halt at each step within the workflow, wait for user input.

**Sub-workflow tracking:** After each sub-workflow completes successfully, immediately update
`sub_workflows.preplan.{name}: complete` in the initiative config (dual-write to state.yaml).
Mark skipped optional workflows as `skipped`. This tracking persists across context compaction.

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

**Phase completion & Auto-Advance:**
When all required sub-workflows are complete, load and execute:
`_bmad/lens-work/skills/phase-completion.md`
This skill handles: sub-workflow verification, PR creation, state updates, event logging,
and auto-advance to the next phase. It reads everything from persistent state — it does
NOT depend on conversation context.

**Output artifacts** (written to `{docs_path}/`):
- `product-brief.md` (required)
- `brainstorm-notes.md` (if brainstorming run)
- `research-summary.md` (if research run)

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, treat it as additional
context for the product brief. Do NOT invent feature scope not provided by the user.
```
