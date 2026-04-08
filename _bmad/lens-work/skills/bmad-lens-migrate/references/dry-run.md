# Dry Run

Preview the full migration plan without making any changes. This step is mandatory before execution.

## Outcome

A complete report of every action that would be taken — feature.yaml paths to be created, feature-index.yaml entries to be added, summary and problems stubs to be written, and any legacy state or artifacts to preserve — with no files written or modified.

## Process

For each feature in the migration plan, run with `--dry-run`:

```bash
python3 ./scripts/migrate-ops.py migrate-feature \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --username {username} \
  --source-repo {source_repo} \
  --dry-run
```

`--source-repo` is optional. When provided, the dry run also discovers documents from the source repo's `Docs/` folder and `_bmad-output/` directory.

## Output Shape

```json
{
  "status": "pass",
  "feature_id": "auth-login",
  "dry_run": true,
  "planned_actions": [
    "Create feature.yaml at {governance_repo}/features/platform/identity/auth-login/feature.yaml",
    "Update feature-index.yaml at {governance_repo}/feature-index.yaml",
    "Create summary stub at {governance_repo}/features/platform/identity/auth-login/summary.md",
    "Create problems log at {governance_repo}/features/platform/identity/auth-login/problems.md",
    "Copy document prd.md from source-docs to features/platform/identity/auth-login/docs/",
    "Copy document tech-plan.md from governance-legacy to features/platform/identity/auth-login/docs/"
  ],
  "feature_yaml_created": false,
  "index_updated": false,
  "legacy_state_path": "{governance_repo}/branches/platform-identity-auth-login/initiative-state.yaml",
  "documents_discovered": [
    {
      "source_type": "governance-legacy",
      "source_path": "branches/platform-identity-auth-login/_bmad-output/tech-plan.md",
      "relative_path": "tech-plan.md",
      "filename": "tech-plan.md"
    },
    {
      "source_type": "source-docs",
      "source_path": "/path/to/source/Docs/platform/identity/auth-login/prd.md",
      "relative_path": "prd.md",
      "filename": "prd.md"
    }
  ]
}
```

## Conflict Check

Before running the dry run for each feature, check for conflicts:

```bash
python3 ./scripts/migrate-ops.py check-conflicts \
  --governance-repo {governance_repo} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service}
```

If `"conflict": true`, surface the conflict to the user and skip that feature in the dry-run report. Do not proceed with a conflicting feature without explicit override confirmation.

## After Dry Run

Present a summary table to the user:

| Feature ID | Old Branch | Planned Actions | Conflict |
|-----------|------------|----------------|---------|
| auth-login | platform-identity-auth-login | feature.yaml, index entry, summary, 2 docs | No |

Then ask for confirmation:
- "Proceed with migration for all N features? (yes/no)"
- OR "Select features to migrate: (all/list numbers/no)"

Do not proceed without explicit confirmation.
