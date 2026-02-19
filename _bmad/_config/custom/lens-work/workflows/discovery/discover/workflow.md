---
name: discover
description: Discover target structure and generate lens-ready documentation
nextStep: './steps-c/step-00-preflight.md'
web_bundle: true
installed_path: '{project-root}/_bmad/lens-work/workflows/discover'
---

# Discover Workflow (Create-Only)

**Goal:** Perform initial brownfield discovery, then hand off to SCOUT for deep analysis.

## Step Sequence

1. **step-00-preflight** - Validate environment and prerequisites
2. **step-01-select-target** - Choose discovery targets
3. **step-02-extract-context** - Extract codebase context
4. **step-03-analyze-codebase** - Perform initial analysis
5. **step-04-generate-docs** - Generate discovery documentation
6. **step-05-handoff-scout** - **CRITICAL: Present deep scan prompt**

## Important

**DO NOT skip step-05-handoff-scout.** After initial discovery completes (step-04), you MUST:
1. Present the discovery summary
2. Ask the user if they want to run a deep scan
3. Offer [DEEP] and [SKIP] options
4. Only proceed based on user choice

Follow the steps in order. When a step is complete, load the next step file.
