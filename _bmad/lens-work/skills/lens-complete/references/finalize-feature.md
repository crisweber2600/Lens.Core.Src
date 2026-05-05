# Finalize Feature

Archive the feature atomically: update feature.yaml to `complete`, update feature-index.yaml to `archived`, write the final summary, and commit to main.

## Outcome

The feature is permanently archived. feature.yaml phase is `complete`, feature-index.yaml status is `archived`, `summary.md` is written to the feature directory, and all changes are committed to main.

## Pre-conditions

Before calling finalize, confirm all of the following:

- [ ] `check-preconditions` returned status `pass` or `warn` (not `fail`)
- [ ] `retrospective.md` exists in the feature directory with `status: approved`
- [ ] Project documentation captured via `lens-document-project`
- [ ] Target repo feature branches are merged to their default base branch
- [ ] Control repo feature branches (`{featureId}` and `{featureId}-plan`) have all commits that should land in `develop`
- [ ] User has explicitly confirmed finalize (this is irreversible)

## Confirmation Gate

Always display this confirmation before executing:

```
┌─────────────────────────────────────────────┐
│  FINALIZE FEATURE — THIS IS IRREVERSIBLE     │
│                                              │
│  Feature:  {featureId}                       │
│  Phase:    dev → complete                    │
│  Index:    {status} → archived               │
│                                              │
│  Archive will include:                       │
│  ✓ retrospective.md                          │
│  ✓ project documentation captured via        │
│    lens-document-project                │
│  ✓ summary.md (will be written now)          │
│                                              │
│  Confirm? (yes/no)                           │
└─────────────────────────────────────────────┘
```

Only proceed on explicit `yes`.

## Process

Run the finalize operation:

```bash
uv run --script ./scripts/complete-ops.py finalize \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --control-repo {control_repo} \
  --confirm
```

For dry-run preview (show what would change without writing):

```bash
uv run --script ./scripts/complete-ops.py finalize \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --control-repo {control_repo} \
  --dry-run
```

## What the Script Does

1. Reads current feature.yaml
2. Validates `retrospective.md` exists and has `status: approved`
3. Updates `phase` to `complete` and sets `completed_at` to current UTC ISO timestamp
4. Reads `{governance-repo}/feature-index.yaml` and updates the matching entry's `status` to `archived` and `updated_at` to current UTC ISO timestamp
5. Writes `{feature-dir}/summary.md` with the archive summary
6. When `--control-repo` is provided, checks out the shared control `dev` branch, pushes it, creates a PR from `dev` to `main`, and merges it
7. All writes are atomic (temp file + rename)

## Post-Script Git Sync

After the script returns `status: pass`, sync the governance repo:

```bash
git -C {governance_repo} pull --rebase origin main
git -C {governance_repo} add -A
git -C {governance_repo} commit -m "chore: archive {featureId}"
git -C {governance_repo} push origin main
```

If `git push` fails (e.g., concurrent write conflict), report the error and instruct the user to resolve the conflict manually before retrying the push. Do NOT re-run the finalize script.

## Post-Script Control Repo Branch Merge

When `--control-repo` is passed, the script switches the control repo to the shared `dev` branch, pushes it, creates a PR from `dev` to `main`, and merges it through GitHub CLI. Merge failure is returned as a warning because governance archival has already succeeded.

```bash
git -C {control_repo} checkout dev
git -C {control_repo} pull --ff-only origin dev
git -C {control_repo} push -u origin dev
gh pr create --head dev --base main --title "[complete] {featureId} - docs delivery to main" --body "..."
gh pr merge <pr-url> --merge
```

> **Note:** After this step, `dev` remains the working branch. If the PR merge cannot complete, do not roll back governance archive files; surface the returned warning.

## Output

```json
{
  "status": "pass",
  "feature_id": "my-feature",
  "archived_at": "2026-04-06T02:03:34Z",
  "feature_yaml_path": "{governance-repo}/features/{domain}/{service}/{featureId}/feature.yaml",
  "index_updated": true
}
```

## Post-Finalize Confirmation

After successful finalize, display the complete archive manifest:

```
Feature archived successfully.

Archive: {governance-repo}/features/{domain}/{service}/{featureId}/

Planning artifacts:
  feature.yaml          ← phase: complete
  brief.md (if present)
  specs/ (if present)

Problems captured:
  problems/ (if present)

Retrospective:
  retrospective.md

Project documentation:
  docs/                  ← captured via lens-document-project
  governance-facing documentation artifacts mirrored into the feature archive

Archive record:
  summary.md            ← written at {archived_at}

Feature index:
  feature-index.yaml    ← status: archived
```

## Error Handling

If finalize fails midway (e.g., disk error after writing feature.yaml but before updating feature-index):

- The script uses atomic writes — incomplete states are not written to disk
- If the index fails to update, report the error and provide the manual fix command:

```bash
# Manual index update if script failed:
uv run --script ./scripts/complete-ops.py finalize \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --control-repo {control_repo} \
  --confirm
```
