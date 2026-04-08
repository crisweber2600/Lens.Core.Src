# Verify Migration

Validate that a migrated feature has all expected artifacts in place before cleanup. This step is mandatory — cleanup will not proceed unless verification passes.

## Outcome

A structured verification report listing each expected artifact and whether it exists. The agent presents the results to the user for confirmation before cleanup can proceed.

## Process

Run verification for a single feature:

```bash
python3 ./scripts/migrate-ops.py verify \
  --governance-repo {governance_repo} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service}
```

## Output Shape

```json
{
  "status": "pass",
  "feature_id": "auth-login",
  "checks": [
    { "name": "feature.yaml exists", "passed": true },
    { "name": "feature-index.yaml entry", "passed": true },
    { "name": "summary.md exists", "passed": true },
    { "name": "problems.md exists", "passed": true },
    { "name": "docs/ directory exists", "passed": true }
  ]
}
```

If any check fails, `status` is `"fail"` and the failing checks have `"passed": false`.

## Checks Performed

| Check | Description |
|-------|-------------|
| feature.yaml exists | `{governance_repo}/features/{domain}/{service}/{featureId}/feature.yaml` is present |
| feature-index.yaml entry | `{governance_repo}/feature-index.yaml` contains an entry with matching `featureId` |
| summary.md exists | `{governance_repo}/features/{domain}/{service}/{featureId}/summary.md` is present |
| problems.md exists | `{governance_repo}/features/{domain}/{service}/{featureId}/problems.md` is present |
| docs/ directory exists | `{governance_repo}/features/{domain}/{service}/{featureId}/docs/` exists (may be empty if no documents were discovered) |

## Human-in-the-Loop Workflow

After running verification, present a summary table to the user:

| Check | Status |
|-------|--------|
| feature.yaml exists | ✓ |
| feature-index.yaml entry | ✓ |
| summary.md exists | ✓ |
| problems.md exists | ✓ |
| docs/ directory exists | ✓ |

Then:
- If all checks pass: "Verification passed. Proceed with cleanup? (yes/no)"
- If any check fails: "Verification failed — N checks did not pass. Fix the issues before cleanup."

Do not proceed to cleanup if verification fails. The user must resolve failures and re-run verification.

## Batch Verification

To verify all migrated features, run `verify` for each feature in the migration plan and aggregate results:

```
Verification summary:
  ✓ N features passed all checks
  ✗ N features have failing checks (listed below)
```

Only features that pass all checks are eligible for cleanup.
