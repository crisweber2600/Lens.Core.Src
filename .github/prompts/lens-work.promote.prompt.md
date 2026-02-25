```prompt
---
description: Promote the active initiative to the next audience level — runs the appropriate gate and creates a promotion PR (@lens)
---

Activate @lens agent and execute /promote:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/promote` command
3. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
4. Load `workflows/core/audience-promotion/workflow.md`
5. Pre-flight: verify clean working directory, load two-file state

Use `#think` before determining which gate to run and which phases must be complete.

**Promotion chain (from lifecycle contract):**
```
small   →  medium   gate: adversarial-review   (party mode, lead: Winston)
medium  →  large    gate: stakeholder-approval  (manual confirmation)
large   →  base     gate: constitution-gate     (constitution skill validates all artifacts)
```

**[0] Pre-Flight**
- Git-orchestration: verify clean git state
- Load `state.yaml` + active initiative config
- Derive `source_audience` from current state
- Derive `target_audience` from lifecycle promotion chain
- Validate track allows this promotion (check `lifecycle.tracks[track].audiences`)

**[1] Validate Source Audience Phases Complete**
- Determine required phases: intersection of `lifecycle.audiences[source].phases` + `lifecycle.tracks[track].phases`
- For each required phase: verify `phase_status[phase] == "complete"` (PR merged into source audience branch)
- For `pr_pending` phases: run ancestry check (`git merge-base --is-ancestor`)
- BLOCK if any required phase is incomplete

**[2] Run Promotion Gate**

**small → medium (adversarial-review — party mode):**
- Collect artifacts from all small-audience phases (`product-brief.md`, `prd.md`, `architecture.md`)
- For each artifact: run `core.party-mode` review
- Participants: Winston (Architect), Mary (Analyst), Sally (UX Designer)
- Write review to `{docs_path}/reviews/promotion-small-to-medium-{artifact}-review.md`
- BLOCK if any artifact fails party-mode review

**medium → large (stakeholder-approval):**
- Display review package: `epics.md`, `stories.md`, `readiness-checklist.md`
- Ask: "Has stakeholder approved? [Y]es / [N]o"
- If No: pause promotion (user resumes later)
- If Yes: gate passes

**large → base (constitution-gate — constitution skill):**
- Constitution skill resolves constitutional context (`constitution.resolve-context`)
- Constitution skill runs full compliance check on all planning artifacts
- 4-level inheritance: Org → Domain → Service → Repo
- BLOCK if `fail_count > 0` (warnings allowed — recorded as `passed_with_warnings`)

**[3] Create Promotion PR**
- Git-orchestration creates PR: `{initiative_root}-{source_audience}` → `{initiative_root}-{target_audience}`
- Title: `[promotion] {source_audience} → {target_audience}: {initiative.name}`
- Body includes: phases included, artifacts reviewed, gate status

**[4] Update State**
- Update `audience_status.{source}_to_{target}: pr_pending` in initiative config
- Record PR URL, PR number, gate type, gate status, timestamp
- Update `state.yaml`: `workflow_status: promotion_pr_pending`
- Append events to `event-log.jsonl`

**[5] Output**
```
✅ Audience Promotion: {source} → {target}

Initiative: {name} ({id})
Gate:       {gate_type} — PASSED
PR:         {pr_url}
Status:     pr_pending (awaiting merge)

Next steps:
{small→medium}  Merge PR, then run /devproposal
{medium→large}  Merge PR, then run /sprintplan
{large→base}    Merge PR, then run /dev
```

**CRITICAL — never auto-merge:** The promotion PR must be merged by the user.
Remain on the current branch after creating the PR (REQ-7).

**Manual invocation with explicit audiences:**
`/promote small medium` — override audience detection and promote directly
`/promote` — auto-detect from current state (default)
```
