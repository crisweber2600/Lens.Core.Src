---
name: override
description: Bypass merge validation with logged reason
agent: tracey
trigger: "@tracey OVERRIDE"
category: utility
requires_reason: true
---

# Override Workflow

**Purpose:** Bypass a merge gate with a logged reason. Use sparingly.

---

## Execution Sequence

### 1. Identify Blocked Gate

```yaml
state = load("_bmad-output/lens-work/state.yaml")

blocked_gates = filter(state.gates, g => g.status == "blocked")

if blocked_gates.length == 0:
  output: "No blocked gates to override."
  exit: 0

output: |
  🚫 Blocked Gates:
  ${for i, gate in blocked_gates}
  [${i+1}] ${gate.name} — ${gate.block_reason}
  ${endfor}
  
  Which gate to override? [1-${blocked_gates.length}]
```

### 2. Require Reason

```yaml
output: |
  ⚠️ Override requires a reason (min 10 characters).
  
  Why are you bypassing this gate?

reason = prompt_user()

if reason.length < 10:
  output: "Reason too short. Override cancelled."
  exit: 1
```

### 3. Confirm Override

```yaml
output: |
  ⚠️ Confirm Override
  
  Gate: ${selected_gate.name}
  Reason: ${reason}
  
  This will:
  - Mark the gate as "overridden" (not "passed")
  - Log the override with your reason
  - Allow progression to next step
  - ⚠️ Flag in ALL future status reports
  
  Proceed? [Y]es / [N]o
```

### 4. Apply Override

```yaml
if confirmed:
  # Update gate status
  selected_gate.status = "overridden"
  selected_gate.override_reason = reason
  selected_gate.override_at = now()
  selected_gate.override_by = config.user_name
  
  save(state, "_bmad-output/lens-work/state.yaml")
  
  # Log override event
  append_event({
    ts: now(),
    event: "override",
    gate: selected_gate.name,
    reason: reason,
    user: config.user_name
  })
```

### 5. Output Confirmation

```
⚠️ Override Applied

Gate: ${selected_gate.name}
Status: overridden
Reason: ${reason}
By: ${config.user_name}
At: ${now()}

This override is logged and will appear in all status reports.

You may now proceed to the next step.
```

---

## Override Visibility

Overridden gates are flagged in:
- `@tracey ST` status reports
- Phase completion summaries
- Final initiative archive

Format: `⚠️ ${gate.name} — OVERRIDDEN: ${reason}`
