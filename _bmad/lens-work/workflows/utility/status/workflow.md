---
name: status
description: Display current state, blocks, topology, next steps
agent: "@lens/state-management"
trigger: "@lens ST"
category: utility
---

# Status Workflow

**Purpose:** Display comprehensive status report for current initiative.

---

## Execution Sequence

### 1. Load State (Two-File Architecture)

```yaml
# Load personal state
state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  output: |
    📍 lens-work Status
    
    No active initiative.
    
    To start:
    └── Run #new-domain, #new-service, or #new-feature
  exit: 0

# Detect state format (legacy single-file vs two-file)
if state.active_initiative != null:
  # NEW two-file format — load initiative config separately
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  if initiative == null:
    error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
    hint: "Run @lens migrate to convert legacy state, or check initiatives/ directory."
    exit: 1
else if state.initiative != null:
  # LEGACY single-file format — use inline initiative data
  initiative = state.initiative
  legacy_warning: true
  hint: "Run @lens migrate to upgrade to two-file state architecture."
else:
  output: |
    📍 lens-work Status
    
    No active initiative found in state.
    
    To start:
    └── Run #new-domain, #new-service, or #new-feature
  exit: 0
```

### 2. Load Recent Events

```yaml
events = load_last_n("_bmad-output/lens-work/event-log.jsonl", 5)
```

### 3. Check Git State

```bash
current_branch=$(git branch --show-current)
uncommitted=$(git status --porcelain | wc -l)
```

### 4. Generate Report

```
📍 lens-work Status Report
═══════════════════════════════════════════════════
${if legacy_warning}
⚠️  Legacy state format detected. Run @lens migrate to upgrade.
${endif}

Initiative: ${initiative.id}
Name: ${initiative.name}
Layer: ${initiative.layer}
${if initiative.domain}Domain: ${initiative.domain}${endif}
Target Repos: ${initiative.target_repos || [initiative.target_repo]}
Created: ${initiative.created_at}
${if initiative.created_by}Created By: ${initiative.created_by}${endif}

Current Position (from personal state)
├── Phase: ${state.current.phase} (${state.current.phase_name})
├── Workflow: ${state.current.workflow} (${state.current.workflow_status})
├── Size: ${initiative.size}
└── Branch: ${initiative.branches.active}

Git State
├── Current branch: ${current_branch}
├── Uncommitted changes: ${uncommitted}
└── Remote sync: ${sync_status}

Merge Gates (from initiative config)
${for gate in initiative.gates}
├── ${gate_icon(gate.status)} ${gate.name} — ${gate.status}
${endfor}
${if initiative.gates.length == 0}
├── No gates configured
${endif}

Blocks: ${initiative.blocks.length > 0 ? initiative.blocks : "None"}

Recent Events
${for event in events}
├── ${event.ts}: ${event.event}
${endfor}

Next Steps
├── ${next_step_1}
├── ${next_step_2}
└── ${next_step_3}

State Architecture
├── Personal: _bmad-output/lens-work/state.yaml (git-ignored)
└── Initiative: _bmad-output/lens-work/initiatives/${initiative.id}.yaml (committed)

═══════════════════════════════════════════════════
```

---

## Status Icons

| Status | Icon |
|--------|------|
| completed | ✅ |
| in_progress | 🔄 |
| pending | ⏳ |
| blocked | 🚫 |
| overridden | ⚠️ |
