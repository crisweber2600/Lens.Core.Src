---
name: status
description: Display current initiative state, phase, and checklist
agent: lens
trigger: /status command
category: utility
read_only: true
---

# /status — Status Display

**Purpose:** Show current initiative state, phase, branches, checklist summary, and any errors.

---

## Execution (Read-Only)

### 1. Read State

```yaml
state = load_if_exists("_bmad-output/lens/state.yaml")

if state == null:
  output: |
    🔭 Lens Status: No state found
    └── Run /onboard or /new to get started
  exit: 0

if state.active_initiative == null:
  output: |
    🔭 Lens Status: No active initiative
    └── Run /new to create an initiative or /switch to select one
  exit: 0

initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")
```

### 2. Branch Status

```yaml
current_branch = skill: git-orchestration.get-current-branch()
branch_status = skill: git-orchestration.branch-status()
```

### 3. Checklist Summary

```yaml
checklist_summary = skill: checklist.compact-display(state.active_initiative.checklist)
```

### 4. Format & Display

```yaml
output: |
  🔭 Lens Status
  ═══════════════════════════════════════════════════
  
  Initiative: ${initiative.name} (${initiative.id})
  Type: ${initiative.type}
  Created: ${initiative.created_at}
  
  Current Position
  ├── Phase: ${initiative.current_phase || "not started"}
  ├── Branch: ${current_branch}
  │   └── ${branch_status.clean ? "✅ clean" : "⚠️ ${branch_status.uncommitted} uncommitted"}
  │       ${branch_status.ahead > 0 ? "↑ ${branch_status.ahead} ahead" : ""}
  │       ${branch_status.behind > 0 ? "↓ ${branch_status.behind} behind" : ""}
  └── Workflow: ${state.workflow_status}
  
  Phase Gates
  ├── ${gate_icon(state, "pre-plan")} Pre-Plan
  ├── ${gate_icon(state, "plan")} Plan
  ├── ${gate_icon(state, "tech-plan")} Tech Plan
  ├── ${gate_icon(state, "story-gen")} Story-Gen
  ├── ${gate_icon(state, "review")} Review
  └── ${gate_icon(state, "dev")} Dev
  
  Checklist: ${checklist_summary}
  
  ${state.background_errors.length > 0 ? "⚠️ Errors: ${state.background_errors.length} (run /fix to investigate)" : ""}
  
  Next: ${suggest_next_command(state)}
  ═══════════════════════════════════════════════════

# Helper: gate_icon
# "passed" → "✅", "in-progress" → "🔄", "not-started" → "⬜", "blocked" → "🚫"
```

---

## No State Mutation

This workflow is read-only. It does not modify state, event log, or branches.
