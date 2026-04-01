---
name: 'step-05-dev-ready'
description: 'Mark initiative as dev-ready and output developer handoff summary'
---

# Step 5: Dev-Ready and Developer Handoff

**Goal:** Mark the initiative as dev-ready in initiative-state.yaml, commit the final state, and present a developer handoff summary. No milestone branch or PR is created — express track works entirely on the initiative root branch.

---

## EXECUTION SEQUENCE

### 1. Update Initiative State

```yaml
# Mark expressplan phase complete and initiative as dev-ready
invoke: git-orchestration.update-phase-complete
params:
  phase: expressplan

invoke: git-orchestration.update-milestone
params:
  milestone: dev-ready
  method: direct  # No PR — express track bypasses milestone branch creation

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${initiative_state.state_path}
  phase: "PHASE:EXPRESSPLAN:COMPLETE"
  initiative: ${initiative_root}
  description: "expressplan phase complete — initiative is dev-ready (express track, no PRs)"
```

### 2. Generate Developer Handoff Summary

```
🚀 Express Plan Complete — Dev Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Initiative:  ${initiative_root}
Track:       express
Status:      dev-ready
Branch:      ${initiative_root}

📦 Artifacts Produced:
   ✓ Product Brief   → ${docs_path}/product-brief.md
   ✓ PRD             → ${docs_path}/prd.md
   ✓ Architecture    → ${docs_path}/architecture.md
   ✓ Review Report   → ${docs_path}/review-report.md
   ✓ Epics           → ${docs_path}/epics.md
   ✓ Stories          → ${docs_path}/stories.md
   ✓ Sprint Status   → ${docs_path}/sprint-status.yaml
   ✓ Story Files     → ${docs_path}/{story-key}.md (×{story_count})

📊 Summary:
   Epics:   {epic_count}
   Stories: {story_count}
   Points:  {total_points}

🔀 Branching Model:
   Planning: Single branch (${initiative_root}) — no milestone branches created
   PRs:      None created — express track bypasses PR gates
   Target:   Use /dev to delegate story implementation to target project agents

⏭️ Next Steps:
   1. Run /dev to delegate implementation to target project agents
   2. Stories will be assigned to target repos based on architecture
   3. Run /retrospective when the feature is complete
   4. Run /close --completed to formally end the initiative
```

### 3. Suggest Next Action

Present the user with:
- `/dev` — Start delegating stories to implementation agents
- `/status` — Review the current state
- `/retrospective` — (after implementation) Review what happened
- `/close` — (after implementation) Formally close the initiative

---

## WORKFLOW COMPLETE
