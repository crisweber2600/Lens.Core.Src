```prompt
---
description: Launch BusinessPlan phase — PRD, UX design, and architecture (John/PM + Sally/UX, small audience)
---

Activate @lens agent and execute /businessplan:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

**📊 VISUAL-FIRST DOCUMENTATION:** All documents generated in this phase MUST include Mermaid diagrams per the `visual_first_documentation` convention. Load `_bmad/lens-work/skills/visual-documentation.md` before creating any document. PRD requires: user journey flow (flowchart), feature relationship diagram (flowchart or mindmap). UX Design requires: user journey flows (flowchart), component hierarchy (flowchart).

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
- Auto-advance: `/techplan` (promote small→medium first)

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

**Workflow sequence (present single batch prompt BEFORE loading any workflows):**

```
📋 BusinessPlan Phase Setup

Which workflows would you like to run?

[1] PRD Creation (required) [Required]
[2] PRD Validation (required) [Required]
[3] UX Design - Is UI involved in this feature? [Y/N]

Enter as: "Y | Y | Y" or "required-only" (skips UX) or "all"
```

After receiving user input, execute workflows in sequence:
- [1] PRD Creation — Adopt John (PM) persona: `_bmad/bmm/agents/pm.md`
  → Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`
- [2] PRD Validation — Continue as John (PM)
  → Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-validate-prd.md`
- [3] UX Design (if Y) — Switch to Sally (UX Designer) persona: `_bmad/bmm/agents/ux-designer.md`
  → Read fully and follow `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`

Each workflow uses step-file architecture — halt at each step within the workflow, wait for user input.

**Sub-workflow tracking:** After each sub-workflow completes successfully, immediately update
`sub_workflows.businessplan.{name}: complete` in the initiative config (dual-write to state.yaml).
Mark skipped optional workflows as `skipped`. This tracking persists across context compaction.

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

**Phase completion & Auto-Advance:**
When all required sub-workflows are complete, load and execute:
`_bmad/lens-work/skills/phase-completion.md`
This skill handles: sub-workflow verification, PR creation, state updates, event logging,
and auto-advance to the next phase. It reads everything from persistent state — it does
NOT depend on conversation context.

**Output artifacts** (written to `{docs_path}/`):
- `prd.md` (required)
- `ux-design.md` (if UX workflow was run)
```
