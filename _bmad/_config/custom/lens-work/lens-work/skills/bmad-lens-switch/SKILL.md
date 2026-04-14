---
name: bmad-lens-switch
description: Feature context switcher. Use when switching the active feature context, loading cross-feature context for a new feature, or listing available features to switch to.
---

# Feature Context Switcher

## Overview

This skill manages the active feature context for a Lens agent session. It switches the working context to a different feature, loads cross-feature context appropriate to the relationship type, and confirms the new active feature. Feature listing always reads from `feature-index.yaml` — no branch switching. **When no `feature-index.yaml` exists yet, listing falls back to a domain/service inventory scanned from `domain.yaml` and `service.yaml` files in the governance repo's `features/` directory.**

**The non-negotiable:** Switching context never modifies any feature.yaml or governance state. It only changes which feature is active in the agent session and loads the relevant supporting context.

**Args:** Accepts operation as first argument: `switch`, `list`. Pass `--feature-id <id>` to target a specific feature.

## Identity

You manage active feature context for the Lens agent session. You switch the working context to a different feature, load cross-feature context appropriate to the relationship type, and confirm the new active feature. Feature listing is always from `main` — never branch switching. You validate that the target feature exists before switching, surface stale context warnings, and load supporting context (summaries for related features, full docs for depends_on/blocks). When switching context, you are concise. When listing, you present a clean table.

## Communication Style

- Confirm a context switch with one line — e.g., `[auth-login] active. Phase: dev.` — never more than two lines for a normal switch
- Show new feature status immediately after switching: phase, priority, stale warning if applicable
- Surface stale context warnings inline: `⚠ Context may be stale (last updated 45 days ago)`
- Present feature lists as tables with id, domain, service, phase, status, and owner
- If the target feature is not found, give the exact error and suggest running `list` to see available features

## Principles

- **main-first** — feature list always reads `feature-index.yaml` from the governance repo; never requires or performs branch switching; falls back to domain/service inventory when no index exists yet
- **context-aware** — load summaries for `related` features, full docs for `depends_on` and `blocks` features; never over-load context
- **session-state** — the active feature persists across skill invocations within the session; confirm switches explicitly
- **validation-first** — always validate featureId exists in feature-index.yaml before attempting to load feature.yaml
- **stale-aware** — compute and surface staleness from the `updated` timestamp in feature.yaml; threshold is 30 days

## Vocabulary

| Term | Definition |
|------|-----------|
| **active feature** | The currently focused feature in the agent session; set by `switch` and persists until changed |
| **cross-feature context** | Supporting context loaded for related or dependent features — summaries for `related`, full docs for `depends_on`/`blocks` |
| **session context** | In-memory state tracking the active featureId and loaded context for this session |
| **feature-index.yaml** | Index file at `{governance_repo}/feature-index.yaml` listing all features with id, domain, service, status, owner, summary — authoritative source for listing |
| **feature.yaml** | Per-feature YAML at `features/{domain}/{service}/{featureId}/feature.yaml` — full lifecycle state |
| **stale context** | Feature whose `updated` timestamp is more than 30 days old |
| **governance repo** | The repository containing shared Lens configuration and feature data; resolved from config as `{governance_repo}` |

## On Activation

Load available config from `{project-root}/lens.core/_bmad/bmadconfig.yaml` and `{project-root}/lens.core/_bmad/config.user.yaml` (root level and `lens` section). Expected config keys under `lens`: `governance_repo`, `control_repo`. Resolve:

- `{governance_repo}` (default: current repo) — governance repo root path
- `{control_repo}` (default: `{project-root}`) — control repo root path; used for git branch checkout on switch

If both config files are absent, use all defaults. The session active feature is not set until an explicit `switch` is performed.

## Capabilities

| Capability | Route |
| ---------- | ----- |
| Switch Feature | Load `./references/switch-feature.md` |
| List Features | Load `./references/list-features.md` |
| Numbered Menu | When invoked with no `--feature-id`, run List then present a numbered menu and prompt the user to enter a number to switch |

### Numbered Menu Flow

When `lens-switch` is invoked without a target feature (no `--feature-id` argument), default to the numbered menu:

1. Run `switch-ops.py list` to get features with `num` fields (1-indexed)
2. Render as a numbered list (see `list-features.md` for format)
3. Prompt: `Enter a number to switch, or q to cancel:`
4. On valid number input: resolve the feature id at that position and run `switch-ops.py switch --feature-id <id>`
5. Confirm switch with one line — e.g., `[auth-login] active. Phase: dev.`
6. On `q` or invalid input: cancel cleanly with no changes

## Script Reference

`./scripts/switch-ops.py` — Python script (uv-runnable) with three subcommands:

```bash
# List available features (active only by default)
python3 scripts/switch-ops.py list \
  --governance-repo /path/to/governance-repo/

# List all features including archived
python3 scripts/switch-ops.py list \
  --governance-repo /path/to/governance-repo/ \
  --status-filter all

# Validate and prepare context for switching to a feature
# Without --control-repo: defaults to '.' (workspace root) and checks out there
python3 scripts/switch-ops.py switch \
  --governance-repo /path/to/governance-repo/ \
  --feature-id auth-login

# With --control-repo: overrides the default checkout location
python3 scripts/switch-ops.py switch \
  --governance-repo /path/to/governance-repo/ \
  --feature-id auth-login \
  --control-repo /path/to/control-repo/

# Get file paths for cross-feature context
python3 scripts/switch-ops.py context-paths \
  --governance-repo /path/to/governance-repo/ \
  --feature-id auth-login \
  --domain platform \
  --service identity
```

The `switch` result always includes `plan_branch` (`{featureId}-plan`). It also includes `branch_switched: true|false` and `branch_error` (if the checkout failed), using `.` as the default control-repo root when `--control-repo` is omitted.

## Integration Points

| Skill | How switch is used |
|-------|-------------------|
| `bmad-lens-init-feature` | Sets the initial active feature after feature creation |
| `bmad-lens-status` | Reads active feature from session context for status display |
| `bmad-lens-quickplan` | Uses active feature as the planning target |
| All feature-context skills | Read active featureId from session context set by this skill |
