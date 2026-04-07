---
name: move-feature
description: Move a feature to a different domain/service, updating folder paths, initiative-state.yaml, and features.yaml
agent: "@lens"
trigger: /move-feature command
category: utility
phase_name: utility
display_name: Move Feature
entryStep: './steps/step-01-move.md'
---

# /move-feature - Reclassify Feature Across Domains/Services

**Goal:** Move a feature initiative from one domain/service classification to another. Updates folder structure, initiative-state.yaml, and features.yaml registry. If using feature-only branch naming, no branch rename is needed.

**Your Role:** Validate the move is safe (no conflicts), execute the folder move, update all references, and commit.

---

## WORKFLOW ARCHITECTURE

Single-step utility workflow:

- Step 1 validates the move, relocates files, updates state, and commits.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-move.md` - Validate, move, update, commit
