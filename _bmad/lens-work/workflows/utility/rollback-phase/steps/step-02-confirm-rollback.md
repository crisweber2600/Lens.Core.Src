---
name: 'step-02-confirm-rollback'
description: 'Present rollback options and confirm with user'
nextStepFile: './step-03-execute-rollback.md'
---

# Step 2: Confirm Rollback Target

**Goal:** Show the user which phases they can roll back to and get explicit confirmation.

---

## EXECUTION SEQUENCE

### 1. Determine Target

```yaml
if inputs.target_phase != "":
  if inputs.target_phase not in available_targets:
    output: |
      ⛔ Cannot roll back to **${inputs.target_phase}**.
      Available targets: ${available_targets | join(", ")}
    STOP
  target_phase = inputs.target_phase
else:
  # Default to previous phase
  target_phase = available_targets[-1]
```

### 2. Show Rollback Plan

```yaml
output: |
  ## 🔄 Phase Rollback Plan

  | Field | Value |
  |-------|-------|
  | Initiative | ${current_initiative_root} |
  | Current Phase | ${current_phase} |
  | Target Phase | ${target_phase} |
  | Milestone | ${current_milestone} (unchanged) |

  ### What will happen:
  - `initiative-state.yaml` updated: `phase` → `${target_phase}`
  - All existing branches preserved (no deletions)
  - All existing artifacts preserved in `_bmad-output/`
  - You will re-enter the ${target_phase} phase workflow

  ### What will NOT happen:
  - No branch deletions
  - No artifact deletion
  - No PR modifications

  **Confirm rollback?** (yes/no)
```

### 3. Wait For Confirmation

```yaml
confirmation = await_user_input()
if confirmation not in ["yes", "y"]:
  output: "Rollback cancelled."
  STOP
```

---

## OUTPUT CONTRACT

```yaml
output:
  target_phase: string
  confirmed: true
```

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
