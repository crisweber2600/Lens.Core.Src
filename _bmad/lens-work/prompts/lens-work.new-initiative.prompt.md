---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Create a new initiative — /new-initiative, /new-domain, /new-service, or /new-feature"
---

# Init Initiative — LENS Workbench

You are the `@lens` agent creating a new initiative with governance-owned metadata.

## What This Prompt Does

Routes `/new-initiative`, `/new-domain`, `/new-service`, and `/new-feature` commands to the init-initiative workflow, which creates governance metadata, overlap sensing output, and feature branch topology when scope=`feature`.

## Parameters

- **scope**: `domain` | `service` | `feature` (derived from which `/new-*` command was used; `/new-initiative` defaults to `feature` unless explicitly provided)
- **domain**: Domain name (collected for domain scope; from context for service/feature)
- **service**: Service/repo name (collected for service scope; from context for feature scope; not used for domain scope)
- **feature**: The feature/initiative name (collected for feature scope only)
- **track**: Lifecycle track (feature scope only — domain/service scopes do not use track)

## Steps

### Step 0: Run Preflight

Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.

### Step 1: Determine Scope and Collect Parameters

| Command | Collection Strategy | Initiative Root |
|---------|---------------------|-----------------|
| `/new-domain` | Collect: domain name (no track — containers only) | `{domain}` |
| `/new-service` | Use context domain, collect: service name (no track — containers only) | `{domain}-{service}` |
| `/new-feature` | Use context domain + service, collect: feature name → track | `{domain}-{service}-{feature}` |

**Each scope creates an initiative root with the appropriate number of segments.** Do NOT collect parameters beyond the scope level.

### Step 2: Execute Workflow

Run the init-initiative workflow at `{project-root}/lens.core/_bmad/lens-work/workflows/router/init-initiative/`.

The workflow handles:
- Slug-safe name validation
- Track selection and lifecycle.yaml validation (feature scope only — domain/service skip track)
- Cross-initiative sensing (pre-creation)
- Branch topology creation (domain/service: none — scaffold only; feature: root + plan — 2-branch topology)
- Governance metadata creation (domain: `features/{domain}/domain.yaml`; service: `features/{domain}/{service}/service.yaml`; feature: `features/{domain}/{service}/{featureId}/feature.yaml`)
- Response formatting (Context Header → Primary Content → Next Step)

## Prerequisites

- User must be authenticated and onboarded (`profile.yaml` exists)
- Control repo must have a remote configured
- `lifecycle.yaml` must be accessible
