```prompt
---
description: Launch TechPlan phase — technical design and architecture decisions (Winston/Architect, small audience)
---

Activate @lens agent and execute /techplan:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/techplan` command to launch the TechPlan phase
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Pre-flight: verify clean working directory, load two-file state (state.yaml + initiative config)
5. Gate check: verify `businessplan` phase PR is merged into `{initiative_root}-small` before proceeding
6. Verify required artifacts exist: `{docs_path}/prd.md`, `{docs_path}/architecture.md`
7. Derive audience from lifecycle contract: `techplan` → `small`
8. Create and checkout phase branch `{initiative_root}-small-techplan` from `{initiative_root}-small` (push immediately)
9. Delegate artifact work to Winston (Architect)

Use `#think` before making architectural decisions or selecting technology stacks.

**Phase identity:**
- Phase: `techplan` | Display: TechPlan | Audience: `small`
- Agent owner: Winston (Architect)
- Branch pattern: `{initiative_root}-small-techplan`
- Role gate: Architect, Tech Lead

**Prerequisites:**
- `/businessplan` complete: `{initiative_root}-small-businessplan` PR merged into `{initiative_root}-small`
- `prd.md` exists at `{docs_path}/prd.md`
- `architecture.md` exists at `{docs_path}/architecture.md`
- `state.yaml` exists with `active_initiative` set

**Workflow sequence:**
- **[1] Architecture Refinement** (required) — Winston refines/completes architecture from BusinessPlan, adds technical decisions, component design, and integration patterns
- **[2] Tech Decisions** (required) — Document key technical decisions, rationale, and trade-offs
- **[3] Implementation Readiness Check** (required) — Validate architecture is buildable and stories can be derived from it

**User interaction keywords:**
- `defaults` / `best defaults` → apply defaults to current step only
- `yolo` / `keep rolling` → auto-complete all remaining steps
- `all questions` / `batch questions` → present all questions upfront, then generate
- `pause` / `back` → halt or roll back

**Context injection:**
- Loads `{docs_path}/prd.md` from businessplan phase
- Loads `{docs_path}/product-brief.md` from preplan phase
- Loads `{docs_path}/architecture.md` as baseline from businessplan
- Loads repo README/architecture docs from `{repo_docs_path}/` if available
- Constitutional context resolved by constitution skill before artifact generation

**Branch lifecycle:**
- START: `{initiative_root}-small-techplan` created from `{initiative_root}-small`, pushed immediately
- WORK: All sub-workflow branches created from `{initiative_root}-small-techplan`
- END: PR from `{initiative_root}-small-techplan` → `{initiative_root}-small`; remain on phase branch

**Phase completion:**
- Verify PAT configured: Check `_bmad-output/lens-work/personal/profile.yaml` has `git_credentials` for current git host
- If PAT missing: Direct user to run `_bmad\lens-work\scripts\store-github-pat.ps1` in separate terminal, then retry
- Push artifacts to `{initiative_root}-small-techplan`
- Create PR: `{initiative_root}-small-techplan` → `{initiative_root}-small`
- Update `phase_status.techplan: pr_pending` in initiative config
- Update `state.yaml`: `current_phase: techplan`, `workflow_status: pr_pending`
- Append event to `event-log.jsonl`
- Remain on phase branch (REQ-7: never auto-merge)

**Output artifacts** (written to `{docs_path}/`):
- `architecture.md` (updated with full technical design)
- `tech-decisions.md` (required)

**After TechPlan:** Run small → medium audience promotion (adversarial review gate) before `/devproposal`

**Next phase:** `/devproposal` — runs after small→medium promotion complete
```
