```prompt
---
description: Launch DevProposal phase — epics, stories, and readiness (John/PM, medium audience, requires small→medium promotion)
---

Activate @lens agent and execute /devproposal:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/devproposal` command to launch the DevProposal phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Fetch latest remote state: `git fetch origin --prune` (ensures merged PR status and branch refs are current)
6. Gate check: verify small→medium audience promotion is complete (adversarial review gate passed)
7. Verify ancestry: `origin/{initiative_root}-small` is ancestor of `origin/{initiative_root}-medium`
8. Verify required artifacts exist: `{docs_path}/prd.md`, `{docs_path}/architecture.md`
9. Derive audience from lifecycle contract: `devproposal` → `medium`
10. Create and checkout phase branch `{initiative_root}-medium-devproposal` from `{initiative_root}-medium` (push immediately)
11. Activate John (PM) as agent owner for this phase:
    - Load and adopt persona from: `_bmad/bmm/agents/pm.md`
    - Remain as John for all artifact work in this phase

Use `#think` before decomposing architecture into epics or estimating scope.

**Phase identity:**
- Phase: `devproposal` | Display: DevProposal | Audience: `medium`
- Agent owner: John (PM) — `_bmad/bmm/agents/pm.md`
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
📝 DevProposal Phase Setup

All workflows are required. Confirm execution:

[1] Epic Generation [Required]
[2] Epic Stress Gate (runs per epic) [Required]
[3] Story Generation [Required]
[4] Readiness Checklist [Required]

Enter: "all" to proceed with all workflows
```

After receiving confirmation, execute workflows in sequence:
- [1] Epic Generation — Continue as John (PM)
  → Read fully and follow `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`
  → Output: `{docs_path}/epics.md`
- [2] Epic Stress Gate (runs per epic) — Continue as John (PM)
  → For EACH epic: Read fully and follow `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
  → Then run party-mode: Read fully and follow `_bmad/core/workflows/party-mode/workflow.md`
  → Output: `{docs_path}/epic-{id}-party-mode-review.md` per epic
- [3] Story Generation — Continue as John (PM)
  → Continue the epics-and-stories workflow from step [1] (story generation portion)
  → Output: `{docs_path}/stories.md`
- [4] Readiness Checklist — Continue as John (PM)
  → Read fully and follow `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
  → Output: `{docs_path}/readiness-checklist.md`

Each workflow uses step-file architecture — halt at each step within the workflow, wait for user input.

**Epic Stress Gate (mandatory — runs per epic):**
- Run `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md` in adversarial mode for each epic
- Run `_bmad/core/workflows/party-mode/workflow.md` review focused on each epic
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
- Verify PAT configured: Check for `GITHUB_PAT` or `GH_ENTERPRISE_TOKEN` environment variable, or `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to set `GITHUB_PAT` env var (or `GH_ENTERPRISE_TOKEN` for enterprise) or run `store-github-pat.ps1`/`store-github-pat.sh` in separate terminal, then retry
- Push artifacts to `{initiative_root}-medium-devproposal`
- Create PR using promote-branch script: `_bmad/lens-work/scripts/promote-branch.sh -s {initiative_root}-medium-devproposal -t {initiative_root}-medium` (or `.ps1` on Windows)
- Update `phase_status.devproposal: pr_pending` and `audience_status.small_to_medium: complete` in initiative config
- Update `state.yaml`: `current_phase: devproposal`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `epics.md` (required)
- `epic-{id}-party-mode-review.md` (per epic, written alongside)
- `stories.md` (required)
- `readiness-checklist.md` (required)

**After DevProposal:** Run `@lens next` (or `/sprintplan`). If promotion is required, LENS auto-triggers it.

**Next phase:** `/sprintplan` — runs after medium→large promotion complete
```
