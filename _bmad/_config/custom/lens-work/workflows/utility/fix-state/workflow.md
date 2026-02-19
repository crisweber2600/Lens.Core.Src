---
name: fix-state
description: Reconstruct state from event log or git scan
agent: tracey
trigger: "@tracey FIX"
category: utility
---

# Fix State Workflow

**Purpose:** Reconstruct state.yaml when it's corrupted or out of sync.

---

## Execution Sequence

### 1. Assess Damage

```yaml
state_exists = file_exists("_bmad-output/lens-work/state.yaml")
event_log_exists = file_exists("_bmad-output/lens-work/event-log.jsonl")

output: |
  🔧 State Recovery Assessment
  
  State file: ${state_exists ? "exists" : "missing"}
  Event log: ${event_log_exists ? "exists" : "missing"}
```

### 2. Choose Recovery Strategy

```yaml
if event_log_exists:
  strategy = "event_log"  # Primary: rebuild from authoritative history
else:
  strategy = "git_scan"   # Fallback: infer from git branches
```

### 3A. Recovery from Event Log

```yaml
if strategy == "event_log":
  events = load_all("_bmad-output/lens-work/event-log.jsonl")
  
  # Replay events to reconstruct state
  reconstructed_state = {
    version: 1,
    initiative: null,
    current: {},
    branches: {},
    gates: []
  }
  
  for event in events:
    apply_event_to_state(reconstructed_state, event)
  
  output: "📜 Reconstructed state from ${events.length} events"
```

### 3B. Recovery from Git Scan

```yaml
if strategy == "git_scan":
  # Find lens branches
  lens_branches = git_branch_list("lens/*")
  
  if lens_branches.length == 0:
    output: "No lens branches found. Cannot recover."
    exit: 1
  
  # Parse most recent initiative from branches
  latest_initiative = parse_initiative_from_branches(lens_branches)
  
  # Infer current state from branch structure
  reconstructed_state = infer_state_from_branches(latest_initiative, lens_branches)
  
  output: "🔍 Reconstructed state from git branches"
```

### 4. Validate Reconstruction

```yaml
# Cross-check with git reality
for gate in reconstructed_state.gates:
  actual_status = check_gate_status(gate)
  if actual_status != gate.status:
    output: "⚠️ Gate ${gate.name}: adjusted ${gate.status} → ${actual_status}"
    gate.status = actual_status
```

### 5. Save Reconstructed State

```yaml
save(reconstructed_state, "_bmad-output/lens-work/state.yaml")

# Log recovery event
append_event({
  ts: now(),
  event: "fix-state",
  strategy: strategy,
  recovered_initiative: reconstructed_state.initiative.id
})
```

### 6. Output Summary

```
🔧 State Recovery Complete

Strategy: ${strategy}
Initiative: ${reconstructed_state.initiative.id}
Current phase: ${reconstructed_state.current.phase}
Gates recovered: ${reconstructed_state.gates.length}

${if warnings.length > 0}
⚠️ Warnings:
${for w in warnings}
├── ${w}
${endfor}
${endif}

State saved to: _bmad-output/lens-work/state.yaml

Verify with: @tracey ST
```
