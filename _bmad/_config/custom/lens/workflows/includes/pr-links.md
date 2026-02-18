# PR Links Reference

**Module:** lens
**Type:** Include (shared reference for workflows)

---

## Pull Request Link Generation

When a phase completes, Lens creates a pull request from the phase branch to the audience branch.

### PR Naming Convention

```
Phase {N} Complete: {initiative_id} ({audience})
```

Example: `Phase 1 Complete: my-feature (small)`

### PR Body Template

```markdown
## Phase {N} Summary

**Initiative:** {initiative_id}
**Phase:** {phase_name}
**Audience:** {audience}
**Branch:** {featureBranchRoot}-{audience}-p{N}
**Target:** {featureBranchRoot}-{audience}

### Artifacts Produced
{checklist_summary}

### Constitution Check
{constitution_result}

### Next Steps
- Merge this PR to advance to Phase {N+1}
- Phase branch will be deleted after merge
```

### PR Workflow

1. Phase workflow completes all steps
2. Git-orchestration skill creates PR with template
3. User reviews and merges
4. Git-orchestration deletes phase branch
5. State-management advances phase state
6. Event-log records phase completion

### Branch Protection Recommendations

- Require at least 1 review on audience branches
- Allow direct pushes to phase branches (workflow-managed)
- Protect root branch (merge only from audience branches)

---

_Include file created on 2026-02-17 via BMAD Module workflow_
