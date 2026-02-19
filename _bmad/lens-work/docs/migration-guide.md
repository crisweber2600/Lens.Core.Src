# Migration Guide: State Architecture v2

## Overview

lens-work v2 splits `state.yaml` into two files:

- **Personal state** (`state.yaml`) — git-ignored, tracks your active position (phase, lane, workflow)
- **Initiative config** (`initiatives/{id}.yaml`) — git-committed, shared team config (initiative metadata, gates, blocks)

### Why the Split?

In v1, everything lived in a single `state.yaml` that was git-committed. This caused:

- **Merge conflicts** when multiple team members worked on the same initiative
- **Leaked personal position** — your cursor (active phase/workflow) was shared with everyone
- **No concurrent initiatives** — only one initiative could be active at a time

v2 separates _shared truth_ (initiative config) from _personal context_ (where you are right now).

## File Layout

```
_bmad-output/lens-work/
├── state.yaml                  # Personal state (git-ignored)
├── event-log.jsonl             # Event audit trail
└── initiatives/
    ├── rate-limit-x7k2m9.yaml  # Shared initiative config
    └── auth-refac-p3q8w1.yaml  # Another initiative
```

## Prerequisites

- Clean working directory (no uncommitted changes)
- Access to existing `_bmad-output/lens-work/state.yaml`
- Current branch should be the active initiative branch

## Migration Steps

### Automatic (Recommended)

```
@tracey migrate-state
```

This will:

1. Detect old v1 format (initiative data embedded in `state.yaml`)
2. Extract initiative data (id, name, layer, target_repos, gates, blocks)
3. Create `initiatives/` directory under `_bmad-output/lens-work/`
4. Write initiative config file (`initiatives/{id}.yaml`)
5. Backup old `state.yaml` → `state.yaml.backup`
6. Write new personal-only `state.yaml`
7. Display commit instructions for the initiative file

### Manual

If you prefer to migrate by hand:

#### Step 1: Create the initiatives directory

```bash
mkdir -p _bmad-output/lens-work/initiatives
```

#### Step 2: Extract initiative config

Copy these fields from `state.yaml` into `initiatives/{id}.yaml`:

```yaml
# initiatives/{id}.yaml — git committed, shared with team
id: rate-limit-x7k2m9
name: "Rate Limiting Feature"
layer: feature
domain: null
target_repos:
  - "api-gateway"
created_at: "2026-01-15T10:30:00-06:00"
gates:
  - name: "p1/w/brainstorm"
    status: completed
    completed_at: "2026-01-16T14:00:00-06:00"
blocks: []
```

#### Step 3: Rewrite personal state

Replace `state.yaml` with personal-only content:

```yaml
# state.yaml — git-ignored, personal position
version: 2
active_initiative: rate-limit-x7k2m9
current:
  phase: p2
  phase_name: "Planning"
  lane: small
  workflow: null
  workflow_status: pending
```

#### Step 4: Update .gitignore

```bash
echo "_bmad-output/lens-work/state.yaml" >> .gitignore
```

#### Step 5: Commit initiative config

```bash
git add _bmad-output/lens-work/initiatives/
git add .gitignore
git commit -m "[lens-work] Migrate state to v2: split personal state from initiative config"
```

## Rollback

If something goes wrong, restore from the backup:

```bash
cp _bmad-output/lens-work/state.yaml.backup _bmad-output/lens-work/state.yaml
rm -rf _bmad-output/lens-work/initiatives/
# Remove the .gitignore entry for state.yaml
git checkout -- .gitignore
```

## Verification

Run Tracey's status command:

```
@tracey ST
```

Expected output should show:

- **State version:** 2
- **Active initiative** loaded from `initiatives/{id}.yaml`
- **Personal position** loaded from `state.yaml`
- Both files parsed without errors

## FAQ

**Q: What happens to my event-log.jsonl?**
A: No changes. The event log format is unchanged and remains a single append-only file.

**Q: Can I have multiple active initiatives?**
A: Yes — that's a key benefit of v2. `state.yaml` tracks your current `active_initiative`; switch with `@tracey switch-initiative {id}`.

**Q: Do I need to re-run init-initiative for existing initiatives?**
A: No. Migration preserves all initiative data. New initiatives created after migration will use the v2 format automatically.
