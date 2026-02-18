# Migration from lens-work

Lens is the successor to lens-work. This guide covers every change between the two systems and provides a step-by-step migration procedure for existing projects.

## What Changed

### Architecture

| Aspect | lens-work | Lens |
|--------|-----------|------|
| Agents | 5 separate agents (Compass, Casey, Tracey, Scout, Scribe) | 1 unified agent (`@lens`) with 5 internal skills |
| Commands | 30+ commands and shortcodes across multiple agents | 18 commands through a single agent |
| Governance | Separate governance workflows invoked manually | Constitution-as-skill — runs automatically at every workflow boundary |
| Audiences | Global audience configuration | Per-initiative audience configuration with custom maps |
| Branch naming | Slash-separated (`{Domain}/{id}/base`) | Flat hyphen-separated (`{featureBranchRoot}`) |
| State contract | No versioning | Versioned: `lens_contract_version: "2.0"` |
| Error tracking | Silent failures | Errors tracked in `background_errors` array in state |
| Prompt prefix | `lens-work.*` | `lens.*` |
| Install path | `_bmad/lens-work/` | `_bmad/lens/` |
| Output path | `_bmad-output/lens-work/` | `_bmad-output/lens/` |

### Command Mapping

Every lens-work command maps to a Lens equivalent. Some commands were renamed for clarity, some were unified, and one is new:

| lens-work command | Lens command | Change |
|-------------------|-------------|--------|
| `/pre-plan` | `/pre-plan` | Same |
| `/spec` | `/plan` | Renamed — "plan" better describes product requirements |
| `/arch` | `/tech-plan` | Renamed — "tech-plan" covers architecture + tech decisions |
| `/stories` | `/Story-Gen` | Renamed |
| *(none)* | `/Review` | **New** — implementation readiness checks, gate validation |
| `/dev` | `/Dev` | Same |
| `/new-domain` | `/new` (type: domain) | Unified into single `/new` command |
| `/new-service` | `/new` (type: service) | Unified into single `/new` command |
| `/new-feature` | `/new` (type: feature) | Unified into single `/new` command |
| `/switch` | `/switch` | Same |
| `/status` | `/status` | Same |
| `/sync` | `/sync` | Same |
| `/fix` | `/fix` | Same |
| `/override` | `/override` | Same |
| `/resume` | `/resume` | Same |
| `/archive` | `/archive` | Same |
| `/onboard` | `/onboard` | Same |
| `/discover` | `/discover` | Same |
| `/bootstrap` | `/bootstrap` | Same |
| `/audit` | *(removed)* | Replaced by automatic constitution checks |
| `/lens` | `/lens` | Enhanced — shows full expanded context |

### Branch Naming

This is the most significant breaking change. lens-work used slash-separated branch names. Lens uses flat hyphen-separated names:

| Concept | lens-work | Lens |
|---------|-----------|------|
| Feature root | `{Domain}/{id}/base` | `{featureBranchRoot}` |
| Small audience | `{Domain}/{id}/small` | `{featureBranchRoot}-small` |
| Phase branch | `{Domain}/{id}/small-1` | `{featureBranchRoot}-small-p1` |
| Workflow branch | `{Domain}/{id}/small-1-dev` | `{featureBranchRoot}-small-p1-dev` |

Phase numbers now use a `p` prefix (`p1` instead of `1`) for clarity.

### State Schema

The `state.yaml` schema has changed:

| lens-work field | Lens field | Notes |
|----------------|------------|-------|
| `smallGroupBranchRoot` | `feature_branch_root` | Renamed and moved to initiative config |
| `phase` | `current_phase` | Renamed for clarity |
| *(none)* | `lens_contract_version` | New — enables future schema migration |
| *(none)* | `background_errors` | New — tracks errors from background workflows |
| *(none)* | `workflow_status` | New — `idle`, `running`, or error state |
| `gate_status` keys | Same key names | Same: `pre-plan`, `plan`, `tech-plan`, `story-gen`, `review`, `dev` |

The event log format (`event-log.jsonl`) is forward-compatible. Existing event entries are preserved.

## Migration Procedure

### Step 1: Install Lens

Install the Lens module alongside your existing lens-work installation. They use different paths and do not conflict:

- lens-work lives at `_bmad/lens-work/`, outputs to `_bmad-output/lens-work/`
- Lens lives at `_bmad/lens/`, outputs to `_bmad-output/lens/`

### Step 2: Run Onboard

```text
@lens /onboard
```

Lens detects your git identity and scans the workspace. This creates a fresh profile and repo inventory — it does not read lens-work data.

### Step 3: Migrate State

For each active initiative in lens-work, create a new initiative in Lens:

```text
@lens /new
```

Provide the same hierarchy (domain, service, feature) and audience configuration. Lens creates the new branch topology using flat naming.

If you have existing work on lens-work branches, you need to manually migrate the content:

1. Check out the lens-work branch with your artifacts
2. Copy planning artifacts to the new Lens branch structure
3. Commit on the new Lens branch

### Step 4: Migrate Branches

Lens does not use slash-separated branches. You have two options:

**Option A: Start fresh** — Create new branches with `/new` and copy artifacts over. This is the cleanest approach.

**Option B: Rename existing branches** — Rename branches from `{Domain}/{id}/base` to `{featureBranchRoot}` format. This requires manual git operations:

```bash
# Example: rename slash-based to flat
git branch -m "Payment/auth-flow/base" "payment-gateway-auth-flow"
git branch -m "Payment/auth-flow/small" "payment-gateway-auth-flow-small"
git branch -m "Payment/auth-flow/medium" "payment-gateway-auth-flow-medium"
git branch -m "Payment/auth-flow/large" "payment-gateway-auth-flow-large"

# Update remote
git push origin --delete "Payment/auth-flow/base"
git push -u origin "payment-gateway-auth-flow"
# ... repeat for each branch
```

### Step 5: Verify

Run `/status` and `/lens` to confirm:

- Initiative is active and correctly configured
- Gate statuses reflect your progress
- Branches exist on the remote
- No background errors

```text
@lens /status
@lens /lens
```

### Step 6: Uninstall lens-work

Once migration is verified, remove the old installation:

1. Delete `_bmad/lens-work/` directory
2. Optionally archive `_bmad-output/lens-work/` for reference
3. Remove any `.github/copilot-instructions.md` entries referencing lens-work agents

## Compatibility Notes

- **Event log** — lens-work `event-log.jsonl` entries are forward-compatible. You can copy the old event log to `_bmad-output/lens/event-log.jsonl` if you want to preserve history.
- **Slash-based branches** — Lens does not read or create slash-based branches. If old branches remain on the remote, they are ignored.
- **Manual `/audit`** — lens-work's `/audit` command has no direct replacement. Constitution checks now run automatically at every workflow boundary. Use `/lens` to see current compliance status.
- **Background errors** — lens-work silently dropped background workflow errors. Lens tracks them in `state.yaml`'s `background_errors` array and surfaces them in `/status` output.

## Related Documentation

- [Getting Started](getting-started.md) — Walk through the Lens workflow from scratch
- [Branch Topology](branch-topology.md) — Full flat naming convention
- [API Reference](api-reference.md) — New state schema and event types
- [Troubleshooting](troubleshooting.md) — Common post-migration issues
