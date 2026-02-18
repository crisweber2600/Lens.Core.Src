---
name: switch-context
description: Switch between active initiatives
agent: lens
trigger: /switch command
category: initiative
---

# /switch — Switch Initiative Context

**Purpose:** Switch the active initiative, updating state and checking out the appropriate branch.

---

## Execution Sequence

### 1. List Available Initiatives

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")

# Scan initiatives directory
initiatives = list_files("_bmad-output/lens/initiatives/*.yaml")

if initiatives.length == 0:
  error: "No initiatives found. Run /new to create one."

if initiatives.length == 1:
  warning: "Only one initiative exists. Already active."
  exit: 0

output: |
  🔭 /switch — Switch Initiative
  
  Current: ${state.active_initiative.id || "none"}
  
  Available initiatives:
  ${initiatives.map((init, i) => `  [${i+1}] ${init.id} (${init.type}) — ${init.name}`).join("\n")}
  
  Select initiative: [number]
```

### 2. Load Selected Initiative

```yaml
selected = initiatives[user_selection]
initiative = load("_bmad-output/lens/initiatives/${selected.id}.yaml")
```

### 3. Determine Target Branch

```yaml
if initiative.type == "domain":
  target_branch = initiative.domain_prefix

elif initiative.type == "service":
  target_branch = "${initiative.domain_prefix}-${initiative.service_prefix}"

elif initiative.type == "feature":
  # Resume at the last known position
  if initiative.current_phase != null:
    # Use the audience branch for the current phase
    audience = initiative.review_audience_map[initiative.current_phase]
    target_branch = "${initiative.feature_branch_root}-${audience}"
  else:
    # No phase started yet — use root
    target_branch = initiative.feature_branch_root
```

### 4. Switch Branch

```yaml
skill: git-orchestration.checkout-branch(target_branch)
```

### 5. Update State

```yaml
skill: state-management.update
params:
  active_initiative:
    id: ${initiative.id}
    type: ${initiative.type}
    phase: ${initiative.current_phase}
    feature_branch_root: ${initiative.feature_branch_root}
    audiences: ${initiative.audiences}
    current_audience: ${audience || null}
    current_phase_branch: ${target_branch}
    gate_status: ${initiative.gate_status}
    checklist: ${initiative.checklist || {}}
  workflow_status: "idle"
```

### 6. Log Event

```yaml
skill: state-management.log-event("context_switch", {
  from: ${state.active_initiative.id || "none"},
  to: ${initiative.id},
  branch: ${target_branch}
})
```

### 7. Confirm

```yaml
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/state.yaml", "_bmad-output/lens/event-log.jsonl"]
  message: "[lens] /switch: ${initiative.id}"
  branch: ${target_branch}

output: |
  ✅ Switched to: ${initiative.name}
  ├── Type: ${initiative.type}
  ├── Phase: ${initiative.current_phase || "not started"}
  ├── Branch: ${target_branch}
  └── Next: ${initiative.current_phase ? "Continue with /${next_phase_command}" : "Run /pre-plan to begin"}
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No initiatives | Run /new first |
| Dirty working directory | Commit or stash first |
| Branch missing | Suggest /fix or /sync |
| Target initiative missing | Initiative was archived or deleted |

## Post-Conditions

- [ ] state.yaml updated with new active_initiative
- [ ] Checked out to appropriate branch
- [ ] event-log.jsonl entry appended
