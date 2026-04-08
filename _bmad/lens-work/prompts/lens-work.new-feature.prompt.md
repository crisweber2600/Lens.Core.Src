---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Create a new feature — routes to new-initiative with scope=feature"
---

# /new-feature Prompt — LENS Workbench

Routes `/new-feature` command to the init-initiative workflow.

## What This Prompt Does

Creates a new feature initiative with governance-owned metadata and feature-only 2-branch topology. Triggers the same workflow as `/new-initiative` with `scope=feature`.

## Parameters

- **feature**: Feature name (required — collect from user)
- **domain**: Derived from context (active domain)
- **service**: Derived from context (active service)

## Steps

### Step 0: Run Preflight

Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.

### Step 1: Collect Feature Name

Prompt user for feature name. The domain and service are derived from the current active context.

### Step 2: Execute Workflow

Run the init-initiative workflow at `{project-root}/lens.core/_bmad/lens-work/workflows/router/init-initiative/` with:
- `scope`: `feature`
- `feature`: The feature name collected from the user
- `domain`: Derived from context (active domain)
- `service`: Derived from context (active service)

The workflow handles:
- Slug-safe name validation
- Track selection and lifecycle.yaml validation
- Cross-initiative sensing (pre-creation)
- Governance metadata creation at `features/{domain}/{service}/{featureId}/feature.yaml`
- Parent domain/service marker creation when missing
- Feature branch topology creation (`{featureId}` and `{featureId}-plan`)
- Response formatting (Context Header -> Primary Content -> Next Step)

## Prerequisites

- User must be authenticated and onboarded (`profile.yaml` exists)
- Control repo must have a remote configured
- `lifecycle.yaml` must be accessible
- A domain and service context must be active or available