---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Create a new service — routes to new-initiative with scope=service"
---

# /new-service Prompt — LENS Workbench

Routes `/new-service` command to the init-initiative workflow.

## What This Prompt Does

Creates a new service initiative in the control repo. Triggers the same workflow as `/new-initiative` with `scope=service`.

## Parameters

- **service**: Service/repo name (required — collect from user)

## Steps

### Step 0: Run Preflight

Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.

### Step 1: Collect Service Name

Prompt user for service name. The domain is derived from context (current active domain).

### Step 2: Execute Workflow

Run the init-initiative workflow at `{project-root}/lens.core/_bmad/lens-work/workflows/router/init-initiative/` with:
- `scope`: `service`
- `service`: The service name collected from the user
- `domain`: Derived from context (active domain)

The workflow handles:
- Slug-safe name validation
- Cross-initiative sensing (pre-creation)
- Branch topology creation (root only)
- Initiative config creation and commit
- Response formatting (Context Header -> Primary Content -> Next Step)

## Prerequisites

- User must be authenticated and onboarded (`profile.yaml` exists)
- Control repo must have a remote configured
- `lifecycle.yaml` must be accessible
- A domain context must be active or available