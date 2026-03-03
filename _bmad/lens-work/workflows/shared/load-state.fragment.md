---
name: shared.load-state
description: "Two-file state load with legacy single-file fallback and null-state exit"
include_as: invoke
---

# SHARED: Two-File State Load

**Include with:** `invoke: shared.load-state`

**Pre-conditions:** None. Safe to call as first operation in any utility workflow.

**Post-conditions:**
- `state` — personal state object (`state.yaml`)
- `initiative` — initiative config (loaded from `initiatives/{id}.yaml` or inline from legacy state)
- `legacy_warning` — `true` if legacy single-file format detected, `false` otherwise

Exits cleanly (no error) if no state exists or no active initiative is set.

---

```yaml
# Load personal state file
state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  output: |
    📍 No active context found.
    
    No lens-work state exists yet.
    
    To get started:
    └── Run /new-domain, /new-service, or /new-feature to create an initiative
  exit: 0

# FAST PATH: Two-file format confirmed — skip legacy detection
if state.active_initiative != null:
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  if initiative == null:
    error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
    hint: "Run @lens migrate to convert legacy state, or check the initiatives/ directory."
    exit: 1
  legacy_warning: false

# LEGACY PATH: Single-file format (pre-v2 state)
else if state.initiative != null:
  initiative    = state.initiative
  legacy_warning: true
  hint: "Run @lens migrate to upgrade to the two-file state architecture."

# MALFORMED STATE
else:
  output: |
    📍 No active initiative found in state.
    
    To start:
    └── Run #new-domain, #new-service, or #new-feature
  exit: 0
```

---

**Note:** This fragment replaces the state-loading block (Step 1 in `status`, Step 1 in `next`, Step 1 in `switch`) that previously appeared identically in all three utility workflows. The fast-path branch is intentional: once `active_initiative` is confirmed non-null, legacy branches are unreachable during normal operation.
