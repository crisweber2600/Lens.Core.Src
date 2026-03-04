# Skill: phase-completion

**Module:** lens-work
**Skill of:** `@lens` agent
**Type:** Internal delegation skill — loaded JIT after last required sub-workflow completes
**Load trigger:** A sub-workflow marks itself complete and all other required sub-workflows for the current phase are already complete

---

## Purpose

Handles the transition from "all sub-workflows done" to "phase PR created and next phase started." This skill exists as a separate file so it can be loaded fresh (JIT) after context compaction, ensuring the agent always knows the correct completion procedure and auto-advance target regardless of how long the conversation has been.

## When to Load This Skill

Load this skill when ANY of these conditions are met:

1. **A sub-workflow just completed** and you need to check if it was the last required one
2. **`/next` determines** all required sub-workflows for the current phase are complete but phase completion hasn't run yet
3. **`/resume` detects** a phase with all sub-workflows complete but `phase_status` still shows `in_progress` (not `pr_pending` or `passed`)

---

## Part 1: Sub-Workflow Completion Check

### Procedure

1. Read `current_phase` from `_bmad-output/lens-work/state.yaml`
2. Read `sub_workflows.{current_phase}` from the initiative config file:
   - Feature/repo: `_bmad-output/lens-work/initiatives/{id}.yaml`
   - Domain: `_bmad-output/lens-work/initiatives/{id}/Domain.yaml`
   - Service: `_bmad-output/lens-work/initiatives/{domain}/{service}/Service.yaml`
3. Read the phase definition from `_bmad/lens-work/lifecycle.yaml` → `phases.{current_phase}.sub_workflows`
4. Cross-reference:

```
For each sub_workflow defined in lifecycle.yaml:
  required = lifecycle.phases[current_phase].sub_workflows[i].required
  status   = initiative_config.sub_workflows[current_phase][name]

  If required == true AND status NOT IN [complete]:
    → STOP. Report: "{name} is required but status is {status}. Phase completion blocked."
    → Exit skill. Do NOT proceed to Part 2.

  If required == false AND status IN [null]:
    → Mark as "skipped" (write to initiative config + state.yaml, dual-write)
    → Append event: sub_workflow_skipped
```

5. If ALL required sub-workflows have `status == complete`:
   → Log: "All required sub-workflows for {current_phase} are complete."
   → Proceed to **Part 2**

### Sub-workflow Status Values

| Value | Meaning |
|-------|---------|
| `null` | Not started |
| `skipped` | Optional, deliberately not run |
| `in_progress` | Started but not finished |
| `complete` | Finished successfully |

---

## Part 2: Phase Completion Procedure

### Pre-flight

1. Verify `phase_status.{current_phase}` is `in_progress` (not already `pr_pending` or `passed`)
   - If already `pr_pending`: skip to Part 3 (PR exists, check if merged)
   - If already `passed`: skip to Part 3 (phase done, just need auto-advance)
2. Verify current git branch matches the expected phase branch pattern
3. Verify working tree is clean (`git status --short` returns empty)
   - If dirty: stage and commit with message `"docs({phase}): complete {phase} phase artifacts"`

### Push & PR Creation

4. Push the phase branch:
   ```bash
   git push origin HEAD
   ```

5. Create a PR (promote phase branch → audience branch):

   **Determine the audience branch:**
   - Read phase audience from `lifecycle.yaml` → `phases.{current_phase}.audience`
   - Audience branch = `{initiative_root}-{audience}` (e.g., `printing-magic-printingmagic-baseline-small`)
   - Phase branch = `{initiative_root}-{audience}-{phase}` (e.g., `printing-magic-printingmagic-baseline-small-preplan`)

   **Create PR using promote-branch script:**

   *Bash:*
   ```bash
   bash _bmad/lens-work/scripts/promote-branch.sh \
     -s "{phase_branch}" \
     -t "{audience_branch}" \
     -T "Phase: {display_name} complete — {initiative_name}" \
     -b "## Phase: {display_name}\n\nAll sub-workflows complete:\n{sub_workflow_summary}\n\nArtifacts:\n{artifact_list}"
   ```

   *PowerShell:*
   ```powershell
   .\bmad.lens.release\_bmad\lens-work\scripts\promote-branch.ps1 `
     -SourceBranch "{phase_branch}" `
     -TargetBranch "{audience_branch}" `
     -Title "Phase: {display_name} complete — {initiative_name}" `
     -Body "## Phase: {display_name}\n\nAll sub-workflows complete..."
   ```

   If no PAT is available: inform user and provide manual PR creation instructions, but still proceed to state updates.

### State Updates (Dual-Write)

6. Update `phase_status.{current_phase}: pr_pending` in both:
   - `_bmad-output/lens-work/state.yaml`
   - Initiative config file
7. Update `workflow_status: idle` in `state.yaml`
8. Append event to `_bmad-output/lens-work/event-log.jsonl`:
   ```json
   {"ts":"ISO8601","event":"phase_completion_triggered","initiative":"{id}","user":"{name}","details":{"phase":"{current_phase}","sub_workflows":{completed_summary},"pr_created":true}}
   ```
9. Commit state updates:
   ```bash
   git add _bmad-output/lens-work/state.yaml _bmad-output/lens-work/initiatives/ _bmad-output/lens-work/event-log.jsonl
   git commit -m "lens(state): {phase} phase complete — PR created"
   git push
   ```

---

## Part 3: Stop and Inform (PR Gate)

> **Important:** This skill does NOT auto-advance to the next phase. The `/next` workflow
> is the sole authority for phase transitions. After creating the PR and updating state,
> this skill stops and instructs the user to merge the PR before running `/next` again.

### Procedure

1. After Parts 1-2 complete (PR created, state set to `pr_pending`), output the stop message:

   ```
   ✅ Phase {current_phase} complete — PR created!

   🔒 A PR has been created to merge the phase branch into the audience branch.
   You MUST merge this PR before /next will advance to the next phase.

   Phase branch: {phase_branch}
   Target branch: {audience_branch}

   Next steps:
   ├── Review and merge the PR
   └── Then run @lens next to continue

   To check PR status:
   └── gh pr list --head {phase_branch}
   ```

2. **Exit the skill.** Do NOT invoke any further commands or auto-advance.

### Edge Cases

- **PR creation failed (no PAT):** Update state to `pr_pending`, inform user to create PR manually. **Do NOT proceed** to next phase — the PR merge gate in `/next` will enforce this.
- **Phase already `passed`:** Skip Parts 1-2. Output: "Phase already passed. Run `/next` to continue." Exit.
- **Phase already `pr_pending`:** Skip Parts 1-2. Output: "Phase PR is still pending. Merge the PR, then run `/next` to continue." Exit.
- **No `auto_advance_to` defined:** Phase is terminal — inform user "Phase complete. Use /next to continue."

---

## Context Resilience Notes

This skill is designed to be **loaded fresh on demand** — it does NOT depend on any prior conversation context. Everything it needs is read from:
- `state.yaml` → current_phase, active_initiative
- Initiative config file → sub_workflows, phase_status
- `lifecycle.yaml` → phase definitions, auto_advance_to, sub_workflows (required flags)

If an agent's context has been compacted and it can't remember what sub-workflows were completed, this skill will rediscover the complete state from persistent files and proceed correctly.
