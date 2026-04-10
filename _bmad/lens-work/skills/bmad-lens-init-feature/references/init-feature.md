# Init Feature Flow

Initialize a new feature with 2-branch topology in the control repo, feature.yaml, governance index entry, and track-aware planning PR behavior.

## Outcome

After this flow completes:

- Branches `{featureId}` and `{featureId}-plan` exist in the control repo
- Parent governance markers exist at `features/{domain}/domain.yaml` and `features/{domain}/{service}/service.yaml` when they were previously missing
- `feature.yaml` exists at `{governance-repo}/features/{domain}/{service}/{featureId}/feature.yaml` on `main`
- `feature-index.yaml` on `main` has a new entry for `{featureId}`
- `summary.md` stub exists at `{governance-repo}/features/{domain}/{service}/{featureId}/summary.md` on `main`
- All governance artifacts are committed directly to `main` — the governance repo never leaves `main`
- A PR exists from `{featureId}-plan` → `{featureId}` titled "Planning: {feature name}" when the selected track creates a planning PR immediately
- For the `express` track, the plan branch is created but the planning PR is deferred until planning artifacts exist

## Process

### Step 1: Gather Inputs

Prompt for (if not already provided):

1. **Feature name** — human-readable, used to derive featureId (e.g., "Auth Token Refresh" → `auth-refresh`)
2. **Domain** — organizational domain (e.g., `platform`, `commerce`)
3. **Service** — service within the domain (e.g., `identity`, `payments`)
4. **Track** — present the lifecycle track choices explicitly and require the user to choose one before creation. If `{default_track}` exists, label it as the preferred track only; do not apply it without explicit confirmation.

Derive:

- **featureId** — slugify the feature name: lowercase, replace spaces with `-`, strip non-alphanumeric
- **username** — from `{username}` resolved on activation

Confirm the derived featureId and the explicitly chosen track with the user before proceeding.

### Step 2: Validate with Dry Run

```bash
python3 ./scripts/init-feature-ops.py create \
  --governance-repo {governance_repo} \
  --control-repo {control_repo} \
  --feature-id {featureId} \
  --domain {domain} \
  --service {service} \
  --name "{feature name}" \
  --track {track} \
  --username {username} \
  --dry-run
```

If validation fails, report the error and prompt for correction. Do not proceed until validation passes.

### Step 3: Create Files and Get Git Commands

```bash
python3 ./scripts/init-feature-ops.py create \
  --governance-repo {governance_repo} \
  --control-repo {control_repo} \
  --feature-id {featureId} \
  --domain {domain} \
  --service {service} \
  --name "{feature name}" \
  --track {track} \
  --username {username}
```

The script:

1. Creates parent governance markers at `features/{domain}/domain.yaml` and `features/{domain}/{service}/service.yaml` when they are missing
2. Creates `feature.yaml` at `{governance-repo}/features/{domain}/{service}/{featureId}/feature.yaml`
3. Adds an entry to `{governance-repo}/feature-index.yaml` (creates if absent)
4. Creates `{governance-repo}/features/{domain}/{service}/{featureId}/summary.md` stub
5. Returns `git_commands` and `gh_commands` arrays in the JSON output, plus `planning_pr_created` to indicate whether a PR should be opened immediately

### Step 4: Execute Git and GitHub Commands

Execute the `git_commands` returned by the script in sequence, then the `gh_commands` when present:

```bash
# Each command in git_commands runs in order
# Example output sequence:
# git -C {control_repo} checkout -b {featureId}
# git -C {control_repo} checkout -b {featureId}-plan
# git -C {governance_repo} pull --rebase origin main
# git -C {governance_repo} add features/{domain}/{service}/{featureId}/feature.yaml feature-index.yaml features/{domain}/{service}/{featureId}/summary.md [container markers...]
# git -C {governance_repo} commit -m "feat({domain}/{service}): init {featureId}"
# git -C {governance_repo} push origin main

# Then gh_commands when `planning_pr_created == true`
# (PR is in the control repo, not governance):
# gh pr create --repo {control_repo} --head {featureId}-plan --base {featureId} ...
```

> **Note:** The governance repo stays on `main` throughout — no feature branches are created there. The 2-branch topology (`{featureId}` + `{featureId}-plan`) exists only in the control repo.

### Step 5: Confirm Initialization

Present the initialization summary to the user:

| Field | Value |
|-------|-------|
| Feature ID | `{featureId}` |
| Feature Branch | `{featureId}` (control repo) |
| Plan Branch | `{featureId}-plan` (control repo) |
| Domain Marker | `features/{domain}/domain.yaml` ✓ |
| Service Marker | `features/{domain}/{service}/service.yaml` ✓ |
| Feature YAML | `features/{domain}/{service}/{featureId}/feature.yaml` (governance `main`) |
| PR | Immediate planning PR for non-express tracks; deferred for `express` until planning artifacts exist |
| Index | `feature-index.yaml` (governance `main`) ✓ |
| Summary | `features/{domain}/{service}/{featureId}/summary.md` (governance `main`) ✓ |

Offer to run **Auto-Context Pull** to load domain context before handing off to planning.
