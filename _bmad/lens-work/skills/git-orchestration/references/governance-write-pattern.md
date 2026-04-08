# Canonical Governance Repo Write Pattern

## Rule

Whenever lens-work writes to the governance repo, always follow this 4-step sequence:

```
pull → write → commit → push
```

Never commit to the governance repo without pulling first, and never leave a commit without pushing it.

## Pattern

```bash
# 1. Pull latest to avoid conflicts
git -C {governance_repo} pull --rebase origin main

# 2. Write files (via script, LLM output, or direct copy)
#    ... write operations here ...

# 3. Commit the changes
git -C {governance_repo} add <files>
git -C {governance_repo} commit -m "<message>"

# 4. Push immediately
git -C {governance_repo} push origin <branch>
```

For feature branches (e.g., `{featureId}-plan`), substitute the branch name in steps 1 and 4.

## Rationale

The governance repo is a shared, authoritative store. Multiple contributors or sequential operations can write to it within a session. Skipping the pull risks commit conflicts. Skipping the push leaves local state that is invisible to other contributors and to preflight health checks.

## Internal References

These operations already implement this pattern correctly — use them as working examples:

| Operation | File |
|---|---|
| `publish-to-governance` | `skills/git-orchestration/SKILL.md` — line ~395 |
| `publish-tombstone` | `skills/git-orchestration/SKILL.md` — line ~478 |
| `build_container_git_commands` | `skills/bmad-lens-init-feature/scripts/init-feature-ops.py` — line ~268 |

## Deviation Policy

If a pull or push cannot complete (e.g., offline, no remote configured):

- **Pull failure**: Log a warning and continue only if the governance repo is known to be in a clean state (e.g., first onboard, no concurrent writers). Do NOT silently skip.
- **Push failure**: Log the error with the exact failed command. Do NOT retry automatically. Instruct the user to resolve and push manually.

Never hard-fail the entire operation on a governance push failure — governance writes are non-blocking. The local write is still valid; the push is the sync step.

## Scope

This pattern applies to all operations that write to the governance repo on any branch:

- Feature initialization (`bmad-lens-init-feature`)
- Feature finalization / archive (`bmad-lens-complete`)
- User config write during onboarding (`bmad-lens-onboard`)
- Milestone artifact publication (`git-orchestration.publish-to-governance`)
- Lifecycle tombstone publication (`git-orchestration.publish-tombstone`)
- Any future operation that writes governance files
