# Skill: git-orchestration

**Module:** lens-work
**Skill of:** `@lens` agent
**Type:** Internal delegation skill

---

## Purpose

Manages all git branch operations for the lens-work lifecycle. Handles branch creation, targeted commits, pushes, and topology validation. Formalizes the git-orchestration skill's API contract.

## Responsibilities

1. **Branch creation** — Create initiative root, audience, and phase branches
2. **Branch validation** — Verify topology matches expected patterns
3. **Targeted commits** — Commit only relevant files per workflow
4. **Push management** — Push branches at workflow boundaries
5. **PR preparation** — Set up pull request metadata

## Branch Patterns (v2 — Lifecycle Contract)

```yaml
domain: "{domain_prefix}"
service: "{domain_prefix}-{service_prefix}"
root: "{initiative_root}"
audience: "{initiative_root}-{audience}"
phase: "{initiative_root}-{audience}-{phase_name}"
workflow: "{initiative_root}-{audience}-{phase_name}-{workflow}"

# Branch patterns use named phases only (v2.0.0)
```

> Named phases: preplan, businessplan, techplan, devproposal, sprintplan
> Audiences: small (IC creation), medium (lead review), large (stakeholder), base (initiative root)

## Trigger Conditions

- Initiative creation (`/new-*`) — create root + audience branches (track-aware)
- Phase start — create named phase branch from audience
- Workflow start — create workflow branch from phase
- Workflow end — commit, push
- Phase end — PR into audience branch, delete phase branch
- Audience promotion — PR from one audience to next (with gate validation)

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

- `state.current_phase` (v2: named phase — preplan|businessplan|techplan|devproposal|sprintplan)
- `state.phase_status` (v2: named phase keys)
- `state.audience_status` (v2: promotion tracking — small_to_medium|medium_to_large|large_to_base)
- `initiative.initiative_root` (v2: replaces featureBranchRoot)
- `initiative.active_phases` (v2: derived from track)
- `initiative.audiences` (v2: derived from track)

---

_Skill spec backported from lens module on 2026-02-17_
