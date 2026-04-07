---
name: log-problem
description: Log a problem to the initiative's problems.md file following the lifecycle.yaml problem_logging convention
agent: "@lens"
trigger: /log-problem command
aliases: [/lp]
category: utility
phase_name: utility
display_name: Log Problem
entryStep: './steps/step-01-log.md'
---

# /log-problem - Log Initiative Problem

**Goal:** Capture a problem encountered during initiative work, append it to the initiative's problems.md file using the schema defined in lifecycle.yaml, and commit the entry.

**Your Role:** Collect the problem details from the user, format according to the problem_logging convention, and append to the correct problems.md file.

---

## WORKFLOW ARCHITECTURE

This is a lightweight single-step utility workflow:

- Step 1 loads initiative context, collects problem details from the user, appends to problems.md, and commits.

State persists through `initiative_state`, `initiative_root`, `problem_log_path`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-log.md` - Collect and log the problem
