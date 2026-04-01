# Preflight Pull Strategy

## Branch-Aware Freshness Windows

The preflight pull strategy uses different freshness windows depending on the current branch to balance synchronization frequency against developer flow:

| Branch | Window | Rationale |
|--------|--------|-----------|
| `alpha` | 1 hour | Pre-release branch with frequent changes from multiple contributors. Short window ensures governance, workflows, and adapter files stay current during rapid iteration. |
| `beta` | 3 hours | Stabilization branch with fewer changes. Moderate window avoids disrupting focused testing/validation sessions while keeping authority repos reasonably fresh. |
| All others | Daily | Development and feature branches change infrequently in authority repos. Daily cadence prevents unnecessary network calls while guaranteeing daily sync. |

## Full vs. Partial Preflight

- **Full preflight:** Pulls all authority repos, syncs `.github/` and agent entry points, verifies IDE adapters, and updates the preflight timestamp.
- **Partial preflight (cache hit):** Skips pulls but still runs presence checks and `.github/` sync to catch local deletions or manual modifications.

## Timestamp Mechanism

The timestamp file (`_bmad-output/lens-work/personal/.preflight-timestamp`) stores the last successful full preflight time as an ISO 8601 UTC datetime. This file is local-only (not committed) and lives in the personal output directory to avoid cross-developer interference.
