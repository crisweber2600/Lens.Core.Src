```prompt
---
description: Launch SprintPlan phase — sprint backlog and dev-ready stories (Bob/Scrum Master, large audience, requires medium→large promotion)
---

Activate @lens agent and execute /sprintplan:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

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
- Auto-advance: `/dev` (promote base→dev-ready first)

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

**Sub-workflow tracking:** After each sub-workflow completes successfully, immediately update
`sub_workflows.sprintplan.{name}: complete` in the initiative config (dual-write to state.yaml).
This tracking persists across context compaction.

**Constitutional compliance gate:**
- Constitution skill evaluates: `product-brief.md`, `prd.md`, `architecture.md`, `epics.md`, `stories.md`, `readiness-checklist.md`
- FAIL (block) on any compliance failures; WARN on warnings (passed_with_warnings)
- Gate status stored in `initiative_config.phase_status.sprintplan`

**Branch lifecycle:**
- START: `{initiative_root}-large-sprintplan` created from `{initiative_root}-large`, pushed immediately
- WORK: Sprint backlog and dev stories created on this branch
- END: PR from `{initiative_root}-large-sprintplan` → `{initiative_root}-large`; remain on phase branch

**Phase completion & Auto-Advance:**
When all required sub-workflows are complete, load and execute:
`_bmad/lens-work/skills/phase-completion.md`
This skill handles: sub-workflow verification, PR creation, state updates, event logging,
and auto-advance to the next phase. It reads everything from persistent state — it does
NOT depend on conversation context.

**Output artifacts:**
- `{initiative.docs.bmad_docs}/sprint-backlog.md` (required)
- `{initiative.docs.bmad_docs}/dev-story-{id}.md` (required, one per selected story)

**Developer handoff:** Story assignment and handoff to Amelia (Developer) happens automatically.
```
