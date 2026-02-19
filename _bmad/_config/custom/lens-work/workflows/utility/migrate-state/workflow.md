---
name: migrate-state
description: Migrate from single-file state to two-file state architecture
agent: tracey
trigger: "@tracey migrate"
category: utility
---

# Migrate State Workflow

**Purpose:** Migrate from the legacy single-file `state.yaml` format to the new two-file state architecture (personal state + initiative config).

---

## Background

The original state architecture stored everything in a single `state.yaml`:

```yaml
# OLD FORMAT (single-file)
version: 1
initiative:
  id: my-init-abc123
  name: "My Initiative"
  layer: feature
  target_repo: bmad-chat  # or target_repos: [...]
  created_at: "2026-01-15T10:00:00Z"
current:
  phase: p2
  phase_name: "Planning"
  workflow: prd
  workflow_status: in_progress
  size: small
branches:
  base: "{Domain}/my-init-abc123/base"
  active: "{Domain}/my-init-abc123/small-2"
gates: [...]
blocks: [...]
```

The new architecture splits this into:
1. **Personal state** (`state.yaml`) — git-ignored, tracks user's current position
2. **Initiative config** (`initiatives/{id}.yaml`) — git-committed, shared initiative definition

---

## Execution Sequence

### 0. Pre-flight Checks

```bash
# Ensure we're in BMAD control repo
if [ ! -d ".git" ] || [ ! -d "_bmad" ]; then
  error "Must run from BMAD control repo root"
  exit 1
fi

# Ensure clean working directory
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before migration."
  exit 1
fi
```

### 1. Load Old State

```yaml
old_state = load("_bmad-output/lens-work/state.yaml")

# Detect format
if old_state == null:
  output: "No state.yaml found. Nothing to migrate."
  exit: 0

if old_state.active_initiative != null:
  output: "State is already in two-file format. No migration needed."
  exit: 0

if old_state.initiative == null:
  output: "State file exists but has no initiative data. Nothing to migrate."
  exit: 0

# We have old format — initiative key exists at top level
initiative_id = old_state.initiative.id
initiative_name = old_state.initiative.name
initiative_layer = old_state.initiative.layer
```

### 2. Extract Initiative Data

```yaml
# Pull all initiative-level data from old state
migration_data:
  id: ${old_state.initiative.id}
  name: "${old_state.initiative.name}"
  layer: ${old_state.initiative.layer}
  
  # Handle both old single-repo and newer multi-repo formats
  target_repos: ${old_state.initiative.target_repos || [old_state.initiative.target_repo]}
  
  created_at: "${old_state.initiative.created_at}"
  created_by: "${old_state.initiative.created_by || git_user}"
  
  # Domain/service may not exist in old format
  domain: ${old_state.initiative.domain || null}
  service: ${old_state.initiative.service || null}

  # Size now lives in shared initiative config (reads legacy "size" field from old state)
  size: ${old_state.current.size || old_state.initiative.size || "small"}
  
  # Gates and blocks from old state
  gates: ${old_state.gates || []}
  blocks: ${old_state.blocks || []}
  
  # Branch info from old state
  branches:
    base: "${old_state.branches.base}"
    active: "${old_state.branches.active}"
  
  # Current position from old state
  current:
    phase: ${old_state.current.phase}
    phase_name: "${old_state.current.phase_name}"
    workflow: ${old_state.current.workflow}
    workflow_status: ${old_state.current.workflow_status}
```

### 3. Create Initiatives Directory

```bash
mkdir -p "_bmad-output/lens-work/initiatives"
```

### 4. Write Initiative Config

Write to `_bmad-output/lens-work/initiatives/${migration_data.id}.yaml`:

```yaml
id: ${migration_data.id}
name: "${migration_data.name}"
layer: ${migration_data.layer}
domain: ${migration_data.domain}
service: ${migration_data.service}
size: ${migration_data.size}
created_at: "${migration_data.created_at}"
created_by: ${migration_data.created_by}
target_repos:
${for repo in migration_data.target_repos}
  - ${repo}
${endfor}
gates:
${for gate in migration_data.gates}
  - name: ${gate.name}
    status: ${gate.status}
${endfor}
${if migration_data.gates.length == 0}
  - name: tests-pass
    status: open
${endif}
blocks:
${for block in migration_data.blocks}
  - ${block}
${endfor}
branches:
  base: "${migration_data.branches.base}"
  active: "${migration_data.branches.active}"
```

### 5. Backup Old State

```bash
cp "_bmad-output/lens-work/state.yaml" "_bmad-output/lens-work/state.yaml.backup"
echo "Backup created: state.yaml.backup"
```

### 6. Write New Personal State

Overwrite `_bmad-output/lens-work/state.yaml`:

```yaml
active_initiative: ${migration_data.id}
current:
  phase: ${migration_data.current.phase}
  phase_name: "${migration_data.current.phase_name}"
  workflow: ${migration_data.current.workflow}
  workflow_status: ${migration_data.current.workflow_status}
```

### 7. Log Migration Event

Append to `_bmad-output/lens-work/event-log.jsonl`:

```json
{"ts":"${ISO_TIMESTAMP}","event":"migrate-state","id":"${migration_data.id}","from_format":"single-file","to_format":"two-file","phase":"${migration_data.current.phase}","workflow":"${migration_data.current.workflow}"}
```

### 8. Output Commit Instructions

```
✅ State Migration Complete

**Initiative:** ${migration_data.id} (${migration_data.name})
**Layer:** ${migration_data.layer}

**Files created/modified:**
├── 📄 initiatives/${migration_data.id}.yaml (NEW — commit this)
├── 📄 state.yaml (REWRITTEN — git-ignored)
├── 📄 state.yaml.backup (backup of old format)
└── 📄 event-log.jsonl (migration event appended)

**Next steps:**

1. Ensure state.yaml is git-ignored:
   ```bash
   echo "_bmad-output/lens-work/state.yaml" >> .gitignore
   ```

2. Commit the initiative config:
   ```bash
   git add _bmad-output/lens-work/initiatives/${migration_data.id}.yaml
   git add _bmad-output/lens-work/event-log.jsonl
   git add .gitignore
   git commit -m "migrate(${migration_data.id}): Convert to two-file state architecture

   Migrates initiative '${migration_data.name}' from single-file state.yaml
   to two-file architecture:
   - initiatives/${migration_data.id}.yaml (shared, committed)
   - state.yaml (personal, git-ignored)

   Current position preserved: ${migration_data.current.phase} / ${migration_data.current.workflow}"
   git push
   ```

3. Verify with: @tracey ST

**State loading pattern (all workflows):**
  state = load("_bmad-output/lens-work/state.yaml")
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
```

---

## Rollback

If migration fails or produces incorrect results:

```bash
# Restore old state format
cp "_bmad-output/lens-work/state.yaml.backup" "_bmad-output/lens-work/state.yaml"

# Remove initiative config
rm "_bmad-output/lens-work/initiatives/${initiative_id}.yaml"

# Remove initiatives dir if empty
rmdir "_bmad-output/lens-work/initiatives" 2>/dev/null
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| state.yaml not found | Output: "No state to migrate." Exit cleanly. |
| Already in two-file format | Output: "Already migrated." Exit cleanly. |
| initiatives/ dir creation failed | Check filesystem permissions on _bmad-output/ |
| initiative.id missing in old state | Error: "Corrupted state — no initiative ID. Manual repair needed." |
| Backup failed | Abort migration, do not overwrite state.yaml |
| target_repo vs target_repos mismatch | Normalize: wrap single target_repo in array |

---

## Post-Conditions

- [ ] Old state.yaml backed up to state.yaml.backup
- [ ] Initiative config written to initiatives/{id}.yaml
- [ ] Personal state rewritten with active_initiative pointer
- [ ] Migration event logged to event-log.jsonl
- [ ] Commit instructions displayed to user
- [ ] State loading pattern documented in output
