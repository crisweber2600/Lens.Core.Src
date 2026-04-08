---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Create a new domain — routes to new-initiative with scope=domain"
---

# /new-domain Prompt — LENS Workbench

Routes `/new-domain` command to the init-initiative workflow.

## What This Prompt Does

Creates a new domain container scaffold in the control repo. Triggers the same workflow as `/new-initiative` with `scope=domain`.

## Parameters

- **domain**: Domain name (required — collect from user)

## Steps

### Step 0: Run Preflight

Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.

### Step 1: Collect Domain Name

Prompt user for domain name.

### Step 2: Execute Workflow

Run the init-initiative workflow at `{project-root}/lens.core/_bmad/lens-work/workflows/router/init-initiative/` with:
- `scope`: `domain`
- `domain`: The domain name collected from the user

The workflow handles:
- Slug-safe name validation
- Cross-initiative sensing (pre-creation)
- Local scaffold creation (no lifecycle branch creation)
- Initiative config creation and commit on the current branch
- Response formatting (Context Header -> Primary Content -> Next Step)

## Prerequisites

- User must be authenticated and onboarded (`profile.yaml` exists)
- Control repo must have a remote configured
- `lifecycle.yaml` must be accessible