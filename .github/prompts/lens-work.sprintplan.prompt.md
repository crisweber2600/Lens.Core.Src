```prompt
---
description: Launch SprintPlan phase — sprint backlog and dev-ready stories (Bob/Scrum Master, large audience, requires medium→large promotion)
---

Activate @lens agent and execute /sprintplan:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

**📊 VISUAL-FIRST DOCUMENTATION:** All documents generated in this phase MUST include Mermaid diagrams per the `visual_first_documentation` convention. Load `_bmad/lens-work/skills/visual-documentation.md` before creating any document. Stories documents require: story dependency graph (flowchart), sprint timeline (gantt), acceptance criteria workflow (flowchart).

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/sprintplan` command to launch the SprintPlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify medium→large audience promotion is complete (stakeholder approval gate passed)
6. Verify ancestry: `origin/{initiative_root}-medium` is ancestor of `origin/{initiative_root}-large`
7. Verify ALL required artifacts exist at `{docs_path}/`
8. Derive audience from lifecycle contract: `sprintplan` → `large`
9. Create and checkout phase branch `{initiative_root}-large-sprintplan` from `{initiative_root}-large` (push immediately)
10. Activate Bob (Scrum Master) as agent owner for this phase:
    - Load and adopt persona from: `_bmad/bmm/agents/sm.md`
    - Remain as Bob for all artifact work in this phase

Use `#think` before prioritizing stories or allocating sprint capacity.

**Phase identity:**
- Phase: `sprintplan` | Display: SprintPlan | Audience: `large`
- Agent owner: Bob (Scrum Master) — `_bmad/bmm/agents/sm.md`
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

**⚠️ CRITICAL — Workflow Engine Rules:**
Sub-workflows [3] and [4] use YAML-based workflow.yaml files with the workflow engine.
- Load `_bmad/core/tasks/workflow.xml` FIRST as the execution engine
- Pass the `workflow.yaml` path to the engine
- Follow the engine instructions precisely — execute steps sequentially
- Save outputs after completing EACH engine step (never batch)
- STOP and wait for user at decision points

**Workflow sequence (execute all workflows in order):**

Execute workflows in sequence:
- [1] Re-run Readiness Checklist — Continue as Bob (Scrum Master)
  → Read fully and follow `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
- [2] Constitutional Compliance Check — Continue as Bob (Scrum Master)
  → Constitution skill evaluates all artifacts against resolved constitutional rules
- [3] Sprint Planning — Continue as Bob (Scrum Master)
  → Load workflow engine FIRST: `_bmad/core/tasks/workflow.xml`
  → Pass to engine: `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`
- [4] Dev Story Creation — Continue as Bob (Scrum Master)
  → Load workflow engine FIRST: `_bmad/core/tasks/workflow.xml`
  → Pass to engine: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`

⚠️ **Workflow Engine Rules for [3] and [4]:** Load workflow.xml FIRST, pass workflow.yaml, execute steps sequentially, save after EACH step, STOP at decision points.

**Constitutional compliance gate:**
- Constitution skill evaluates: `product-brief.md`, `prd.md`, `architecture.md`, `epics.md`, `stories.md`, `readiness-checklist.md`
- FAIL (block) on any compliance failures; WARN on warnings (passed_with_warnings)
- Gate status stored in `initiative_config.phase_status.sprintplan`

**Branch lifecycle:**
- START: `{initiative_root}-large-sprintplan` created from `{initiative_root}-large`, pushed immediately
- WORK: Sprint backlog and dev stories created on this branch
- END: PR from `{initiative_root}-large-sprintplan` → `{initiative_root}-large`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check for `GITHUB_PAT` or `GH_ENTERPRISE_TOKEN` environment variable, or `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to set `GITHUB_PAT` env var (or `GH_ENTERPRISE_TOKEN` for enterprise) or run `store-github-pat.ps1`/`store-github-pat.sh` in separate terminal, then retry
- Push artifacts to `{initiative_root}-large-sprintplan`
- Create PR using promote-branch script: `_bmad/lens-work/scripts/promote-branch.sh -s {initiative_root}-large-sprintplan -t {initiative_root}-large` (or `.ps1` on Windows)
- Update `phase_status.sprintplan: pr_pending` (or `passed_with_warnings`) and `audience_status.medium_to_large: complete`
- Update `state.yaml`: `current_phase: sprintplan`, `workflow_status: pr_pending`
- Append events to `event-log.jsonl` (sprintplan-start, sprintplan-checklist, sprintplan-compliance, sprintplan-complete)
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts:**
- `{initiative.docs.bmad_docs}/sprint-backlog.md` (required)
- `{initiative.docs.bmad_docs}/dev-story-{id}.md` (required, one per selected story)

**Auto-Advance:** After phase PR is created, auto-execute `@lens promote` to promote
from base to dev-ready. Load and execute `lens-work.promote.prompt.md`.
After the promotion PR is created: pause and inform the user the PR must be merged.
On the user's next message after merge, auto-execute `/dev` — load and execute
`lens-work.dev.prompt.md`. Do NOT display "Run @lens next" or "Run /dev" — just
execute them.

**Developer handoff:** Story assignment and handoff to Amelia (Developer) happens automatically.
```
