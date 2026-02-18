---
name: 'step-01-scan'
description: 'Scan for missing branches'
nextStepFile: './step-02-recreate.md'
---

# Step 1: Scan for missing branches

## Goal
Scan for missing branches.

## Instructions
- Load `_bmad-output/lens-work/initiatives/{id}.yaml` for branch topology context.
- Compare expected branch list to local/remote branches.
- Identify missing branches.

## Output
- `missing_branches`
