# Cleanup

Remove legacy source locations after migration has been verified. This is a destructive operation gated by verification and explicit user confirmation.

## Outcome

Legacy branches, source repo documents, _bmad-output initiative directories, and optionally remote git branches are deleted for verified features. Only sources that were migrated are cleaned up.

## Safety Gate

Cleanup will **refuse to run** unless verification passes first. The script runs `verify` internally and aborts if any check fails.

Hard rules:
- **NEVER** run cleanup without verification passing
- **NEVER** run cleanup without explicit user confirmation
- **NEVER** clean up features that were skipped or failed during migration
- Always offer `--dry-run` first to preview what will be deleted

## Process

### Dry Run (preview what will be deleted)

```bash
python3 ./scripts/migrate-ops.py cleanup \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --source-repo {source_repo} \
  --dry-run
```

To also preview remote branch deletions:

```bash
python3 ./scripts/migrate-ops.py cleanup \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --source-repo {source_repo} \
  --delete-remote-branches \
  --dry-run
```

### Execute Cleanup

```bash
python3 ./scripts/migrate-ops.py cleanup \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --source-repo {source_repo}
```

To also delete remote branches:

```bash
python3 ./scripts/migrate-ops.py cleanup \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --source-repo {source_repo} \
  --delete-remote-branches
```

`--source-repo` is optional. When omitted, only governance-legacy cleanup is performed.

`--delete-remote-branches` is opt-in for safety. When set, legacy remote branches are discovered and deleted in both governance and source repos (base branch + milestone branches).

## Output Shape

```json
{
  "status": "pass",
  "feature_id": "auth-login",
  "dry_run": false,
  "cleaned": [
    {
      "path": "{governance_repo}/branches/platform-identity-auth-login/",
      "type": "directory",
      "source": "governance-legacy-branch"
    }
  ],
  "branches_deleted": [
    {
      "branch": "platform-identity-auth-login",
      "repo_label": "governance",
      "command": "git -C ... push origin --delete platform-identity-auth-login"
    }
  ]
}
```

In dry-run mode, `cleaned` becomes `planned_deletions`, `branches_deleted` becomes `planned_branch_deletions`, and `dry_run` is `true`.

`branches_deleted` / `planned_branch_deletions` only appear when `--delete-remote-branches` is set and branches are found.

## Sources Cleaned

| Source | Path Pattern | When Cleaned |
|--------|-------------|--------------|
| Governance legacy branch | `{governance_repo}/branches/{old_id}/` | Always (if exists) |
| Source repo Docs | `{source_repo}/Docs/{domain}/{service}/{featureId}/` | When `--source-repo` provided and path exists |
| Source repo _bmad-output | `{source_repo}/_bmad-output/lens-work/initiatives/{domain}/{service}/` | When `--source-repo` provided and path exists |
| Remote branches (governance) | `origin/{old_id}`, `origin/{old_id}-{milestone}` | When `--delete-remote-branches` set and branch exists |
| Remote branches (source) | `origin/{old_id}`, `origin/{old_id}-{milestone}` | When `--delete-remote-branches` and `--source-repo` set and branch exists |

Paths that do not exist are silently skipped.

## Agent Workflow

1. Run `cleanup --dry-run` and present the deletion list to the user
2. If the feature has remote legacy branches, re-run with `--delete-remote-branches --dry-run` to include branch deletions
3. Ask for confirmation: "The following paths/branches will be permanently deleted. Proceed? (yes/no)"
4. If confirmed, run `cleanup` (live, with `--delete-remote-branches` if applicable) and show the result
5. If declined, stop — do not re-prompt

## After Cleanup

Present a completion summary:

```
Cleanup complete:
  ✓ N sources deleted
  - N sources skipped (not found)
  ⚠ N warnings (see above)
```
