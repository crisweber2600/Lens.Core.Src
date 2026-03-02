```prompt
---
description: Launch TechPlan phase — technical design and architecture decisions (Winston/Architect, small audience)
---

Activate @lens agent and execute /techplan:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

**📊 VISUAL-FIRST DOCUMENTATION:** All documents generated in this phase MUST include Mermaid diagrams per the `visual_first_documentation` convention. Load `_bmad/lens-work/skills/visual-documentation.md` before creating any document. Architecture documents require: system architecture diagram (flowchart), component interaction (sequenceDiagram), and deployment flow (flowchart).

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/techplan` command to launch the TechPlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify `businessplan` phase PR is merged into `{initiative_root}-small` before proceeding
6. Verify required artifacts exist: `{docs_path}/prd.md`
7. Derive audience from lifecycle contract: `techplan` → `small`
8. Create and checkout phase branch `{initiative_root}-small-techplan` from `{initiative_root}-small` (push immediately)
9. Activate Winston (Architect) as agent owner for this phase:
   - Load and adopt persona from: `_bmad/bmm/agents/architect.md`
   - Remain as Winston for all artifact work in this phase

Use `#think` before making architectural decisions or selecting technology stacks.

**Phase identity:**
- Phase: `techplan` | Display: TechPlan | Audience: `small`
- Agent owner: Winston (Architect) — `_bmad/bmm/agents/architect.md`
- Branch pattern: `{initiative_root}-small-techplan`
- Role gate: Architect, Tech Lead

**Prerequisites:**
- `/businessplan` complete: `{initiative_root}-small-businessplan` PR merged into `{initiative_root}-small`
- `prd.md` exists at `{docs_path}/prd.md`
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
🏗️ TechPlan Phase Setup

All workflows are required. Confirm execution:

[1] Architecture Creation [Required]
[2] Tech Decisions [Required]
[3] Implementation Readiness Check [Required]

Enter: "all" to proceed with all workflows
```

After receiving confirmation, execute workflows in sequence:
- [1] Architecture Creation — Continue as Winston (Architect)
  → Read fully and follow `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
  → Create complete technical architecture document from PRD and UX design
- [2] Tech Decisions — Continue as Winston (Architect)
  → Document key technical decisions, rationale, and trade-offs
  → Inline workflow — present decisions one at a time, wait for user review/approval of each
- [3] Implementation Readiness Check — Continue as Winston (Architect)
  → Read fully and follow `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
  → Validate architecture is buildable and stories can be derived from it

Each workflow uses step-file architecture — halt at each step within the workflow, wait for user input.

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `all questions` / `batch questions` → present all questions upfront, then generate
- `pause` / `back` → halt or roll back

**Context injection:**
- Loads `{docs_path}/prd.md` from businessplan phase
- Loads `{docs_path}/product-brief.md` from preplan phase
- Loads `{docs_path}/ux-design.md` from businessplan phase (if exists)
- Loads repo README/architecture docs from `{repo_docs_path}/` if available
- Constitutional context resolved by constitution skill before artifact generation

**Branch lifecycle:**
- START: `{initiative_root}-small-techplan` created from `{initiative_root}-small`, pushed immediately
- WORK: All sub-workflow branches created from `{initiative_root}-small-techplan`
- END: PR from `{initiative_root}-small-techplan` → `{initiative_root}-small`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check for `GITHUB_PAT` or `GH_ENTERPRISE_TOKEN` environment variable, or `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to set `GITHUB_PAT` env var (or `GH_ENTERPRISE_TOKEN` for enterprise) or run `store-github-pat.ps1`/`store-github-pat.sh` in separate terminal, then retry
- Push artifacts to `{initiative_root}-small-techplan`
- Create PR using promote-branch script: `_bmad/lens-work/scripts/promote-branch.sh -s {initiative_root}-small-techplan -t {initiative_root}-small` (or `.ps1` on Windows)
- Update `phase_status.techplan: pr_pending` in initiative config
- Update `state.yaml`: `current_phase: techplan`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `architecture.md` (required — complete technical design)
- `tech-decisions.md` (required)

**After TechPlan:** Run `@lens next` (or `/devproposal`). If promotion is required, LENS auto-triggers it.

**Next phase:** `/devproposal` — runs after small→medium promotion complete
```
