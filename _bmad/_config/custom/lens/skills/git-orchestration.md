# Skill: git-orchestration

**Module:** lens
**Owner:** @lens agent
**Type:** Internal delegation skill

---

## Purpose

Manages all git branch operations for the Lens lifecycle. Handles branch creation, targeted commits, pushes, and topology validation. Replaces the Casey agent from lens-work.

## Responsibilities

1. **Branch creation** — Create initiative root, audience, and phase branches
2. **Branch validation** — Verify topology matches expected patterns
3. **Targeted commits** — Commit only relevant files per workflow
4. **Push management** — Push branches at workflow boundaries
5. **PR preparation** — Set up pull request metadata

## Branch Patterns

```yaml
domain: "{domain_prefix}"
service: "{domain_prefix}-{service_prefix}"
root: "{featureBranchRoot}"
audience: "{featureBranchRoot}-{audience}"
phase: "{featureBranchRoot}-{audience}-p{N}"
workflow: "{featureBranchRoot}-{audience}-p{N}-{workflow}"
```

## Trigger Conditions

- Initiative creation (`/new`) — create root + audience branches
- Phase start — create phase branch
- Workflow start — create workflow branch (optional)
- Workflow end — commit, push
- Phase end — PR, merge, delete phase branch, checkout next

## Git Discipline Rules

1. Clean working directory before any branch operation
2. Targeted commits (only files relevant to current workflow)
3. Push branches at workflow end, not mid-workflow
4. Never force-push without explicit user confirmation
5. Use `{default_git_remote}` from config for all remote operations

## Error Handling

| Error | Recovery |
|-------|----------|
| Branch exists | Check if it's the expected branch, use it or error |
| Dirty working directory | Prompt user to commit or stash |
| Push rejected | Suggest pull + merge or /sync |
| Branch topology drift | Report mismatch, suggest /fix |

## State Fields Touched

- `active_initiative.current_phase_branch`
- `active_initiative.feature_branch_root`
- `active_initiative.audiences`

---

_Skill spec created on 2026-02-17 via BMAD Module workflow_
