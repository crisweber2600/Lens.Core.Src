# Cleanup

Remove legacy source locations after migration has been verified. This is a destructive operation gated by verification and explicit user confirmation.

## Outcome

Legacy branches, source repo documents, and _bmad-output initiative directories are deleted for verified features. Only sources that were migrated are cleaned up.

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

`--source-repo` is optional. When omitted, only governance-legacy cleanup is performed.

## Output Shape

```json
{
  "status": "pass",
  "feature_id": "auth-login",
  "dry_run": false,
  "deleted": [
    "{governance_repo}/branches/platform-identity-auth-login/",
    "{source_repo}/Docs/platform/identity/auth-login/",
    "{source_repo}/_bmad-output/lens-work/initiatives/platform/identity/"
  ],
  "skipped": [],
  "warnings": []
}
```

In dry-run mode, `deleted` shows what **would** be deleted and `dry_run` is `true`.

## Sources Cleaned

| Source | Path Pattern | When Cleaned |
|--------|-------------|--------------|
| Governance legacy branch | `{governance_repo}/branches/{old_id}/` | Always (if exists) |
| Source repo Docs | `{source_repo}/Docs/{domain}/{service}/{featureId}/` | When `--source-repo` provided and path exists |
| Source repo _bmad-output | `{source_repo}/_bmad-output/lens-work/initiatives/{domain}/{service}/` | When `--source-repo` provided and path exists |

Paths that do not exist are added to `skipped` with a note.

## Agent Workflow

1. Run `cleanup --dry-run` and present the deletion list to the user
2. Ask for confirmation: "The following paths will be permanently deleted. Proceed? (yes/no)"
3. If confirmed, run `cleanup` (live) and show the result
4. If declined, stop — do not re-prompt

## After Cleanup

Present a completion summary:

```
Cleanup complete:
  ✓ N sources deleted
  - N sources skipped (not found)
  ⚠ N warnings (see above)
```
