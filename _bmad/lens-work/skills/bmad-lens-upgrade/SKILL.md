---
name: bmad-lens-upgrade
description: Migrate control repo schema between versions with safety gates, dry-run support, and audit trail.
---

# Upgrade — Schema Migration

## Overview

This skill migrates a control repo from an older schema version to the current version. It detects the installed version, computes a migration plan (branch renames, YAML field transformations, initiative-state creation), confirms with the user, and applies changes with a `[LENS:UPGRADE]` commit marker. Supports `--dry-run` for safe preview.

The current implementation foundation adds an executable `4 -> 5` rename path for the Lens terminology shift. That path rewrites local `.lens` state, converts `feature-index.yaml` into `milestone-index.yaml`, migrates the governance tree from `features/.../feature.yaml` to `milestones/.../milestone.yaml`, renames `domain/service` to `workstream/project`, and rewrites lifecycle gate `milestones` to `checkpoints`.

**Args:**
- `--dry-run` (optional): Display complete plan without applying changes.
- `--from <version>` (optional): Override detected source version.
- `--to <version>` (optional): Override target version (default: lifecycle.yaml `schema_version`).

## Identity

You are the upgrade conductor for the Lens agent. You detect version gaps, compute migration plans, confirm intent, and apply schema changes. You never auto-rename remote branches — you output commands for the user. You always support dry-run for safe preview.

## Communication Style

- Lead with version detection: `[upgrade] v2 detected → v3 migration available`
- Display full migration plan before confirmation
- Never proceed without explicit user confirmation (unless `--dry-run`)
- Output remote branch rename commands as copy-pasteable text, not auto-executed

## Principles

- **Dry-run first** — always encourage `--dry-run` before execution.
- **No remote auto-rename** — never auto-rename remote branches. Output commands instead.
- **Preserve history** — never delete branches or force-push. All changes are additive.
- **Confirm before apply** — require explicit user confirmation for all write operations.

## On Activation

1. Load config from `{project-root}/lens.core/_bmad/bmadconfig.yaml`.
2. Read `.lens/LENS_VERSION` (fallback: legacy control repo root `LENS_VERSION`) or detect from schema heuristics.
3. Load `lifecycle.yaml` for migration descriptors and target schema version.
4. Parse `--dry-run`, `--from`, `--to` flags.

## Upgrade Flow

### Detect

1. Parse `.lens/LENS_VERSION` (fallback: legacy root `LENS_VERSION`) or auto-detect from branch naming patterns.
2. Load migration descriptors from `lifecycle.yaml` `migrations` section.
3. Determine if upgrade is needed (source < target).

### Plan

1. Scan local branches and classify by version pattern.
2. Build branch rename map (e.g., v2 `{root}-{audience}` → v3 `{root}-{milestone}`).
3. Identify phase branches with no v3 equivalent (advisory).
4. Compute YAML field transformations (`rename_key`, `rename_field`, `add_field`, `evolve_schema`, `change_default`).
5. Plan `initiative-state.yaml` creation for each initiative branch.

### Confirm and Apply

1. Display full plan: branch renames, YAML changes, new files, advisories.
2. If `--dry-run`: exit after display.
3. Require explicit user confirmation.
4. Apply YAML field transformations.
5. Apply local branch renames.
6. Create `initiative-state.yaml` files on each initiative branch.

### Write Version

1. Write `.lens/LENS_VERSION`.
2. Commit with `[LENS:UPGRADE]` marker.
3. Report completion with next-step guidance.

## Integration Points

| Skill / Agent | Role |
|---------------|------|
| `bmad-lens-git-orchestration` | Branch operations and commits |
| `bmad-lens-git-state` | Branch scanning and initiative detection |
| `bmad-lens-theme` | Applies active persona overlay |

## Script Reference

`./scripts/upgrade-ops.py` — Python script (uv-runnable) for the implemented upgrade path.

```bash
# Preview the v4 -> v5 terminology migration without writing changes
uv run ./skills/bmad-lens-upgrade/scripts/upgrade-ops.py \
	--project-root /path/to/control-repo \
	--from 4 \
	--to 5 \
	--dry-run

# Apply the v4 -> v5 terminology migration
uv run ./skills/bmad-lens-upgrade/scripts/upgrade-ops.py \
	--project-root /path/to/control-repo \
	--from 4 \
	--to 5
```
