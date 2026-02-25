---
name: resume
description: Rehydrate from state.yaml, explain context
agent: "@lens/state-management"
trigger: "@lens RS"
category: utility
---

# Resume Workflow

**Purpose:** Rehydrate session from state.yaml and explain current context.

---

## Execution Sequence

### 1. Load State (Two-File Architecture)

```yaml
# Load personal state
state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  output: "No state found. Nothing to resume."
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
else:
  output: "No initiative data in state. Nothing to resume."
  exit: 0
```

### 2. Load Event History

```yaml
events = load_last_n("_bmad-output/lens-work/event-log.jsonl", 10)
last_event = events[0]
```

### 3. Analyze Context

```yaml
context:
  initiative: initiative.name
  initiative_id: initiative.id
  layer: initiative.layer
  target_repos: initiative.target_repos || [initiative.target_repo]
  current_phase: state.current.phase_name
  current_workflow: state.current.workflow
  last_action: last_event.event
  last_action_time: last_event.ts
  time_since: calculate_duration(last_event.ts, now())
  gates: initiative.gates || []
  blocks: initiative.blocks || []
```

### 4. Output Context Summary

```
🔄 Resuming lens-work Session
${if legacy_warning}
⚠️  Legacy state format detected. Run @lens migrate to upgrade to two-file architecture.
${endif}

**Initiative:** ${context.initiative} (${context.initiative_id})
**Layer:** ${context.layer}
**Target Repos:** ${context.target_repos}

**Where you left off:**
├── Phase: ${context.current_phase}
├── Workflow: ${context.current_workflow}
├── Last action: ${context.last_action}
└── Time since: ${context.time_since}

**Gate Status:**
${for gate in context.gates}
├── ${gate_icon(gate.status)} ${gate.name} — ${gate.status}
${endfor}
${if context.gates.length == 0}
├── No gates configured
${endif}

**Blocks:** ${context.blocks.length > 0 ? context.blocks : "None"}

**What was happening:**
${describe_last_action(last_event)}

**What you can do now:**
${if state.current.workflow_status == "in_progress"}
├── Continue working on ${state.current.workflow}
├── Or finish with: @lens done
${else}
├── Continue to next phase with: @lens /${next_phase_command}
├── Check full status with: @lens ST
${endif}
└── Get help with: @lens H

State files:
├── Personal: _bmad-output/lens-work/state.yaml
└── Initiative: _bmad-output/lens-work/initiatives/${context.initiative_id}.yaml

Ready to continue?
```

---

## Time-Based Context

| Time Since | Message |
|------------|---------|
| < 1 hour | "Picking up where you left off..." |
| 1-24 hours | "Welcome back! Here's where you were..." |
| > 24 hours | "It's been a while. Let me remind you..." |
| > 7 days | "Resuming after extended break. Full context below..." |
