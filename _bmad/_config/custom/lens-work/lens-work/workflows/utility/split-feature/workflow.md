---
name: split-feature
description: Split a feature initiative into two or more child features, preserving artifacts and marking the original as superseded
agent: "@lens"
trigger: /split-feature command
category: utility
phase_name: utility
display_name: Split Feature
entryStep: './steps/step-01-split.md'
---

# /split-feature - Split Feature Into Multiple Initiatives

**Goal:** Split a feature into two or more child features. Copies relevant artifacts to each child, creates new initiative entries, and marks the original as superseded.

**Your Role:** Collect the split parameters, create child initiatives, copy artifacts intelligently, and mark the parent as superseded.

---

## WORKFLOW ARCHITECTURE

Single-step utility workflow:

- Step 1 collects split parameters, creates children, copies artifacts, and supersedes parent.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-split.md` - Collect, create, copy, supersede
