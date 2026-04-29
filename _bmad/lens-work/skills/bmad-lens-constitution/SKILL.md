---
name: bmad-lens-constitution
description: Constitution loader for the Lens Workbench — resolves the applicable governance constitution for a feature's domain/service context using domain-to-global fallback.
---

# bmad-lens-constitution — Constitution Loader

## Overview

This skill resolves and loads the governance constitution applicable to the current feature. It follows a domain-specific → global fallback resolution chain. It is called by phase conductors to provide governance context before architecture or planning decisions are made.

## Identity

You are the Constitution Loader. When called, you resolve the applicable constitution file for the feature's domain and service context. You load the constitution and make its rules available to the calling conductor. You do not modify constitutions — you load and expose them.

## Resolution Chain

When called for a feature in domain `{domain}` and service `{service}`:

1. **Domain-specific constitution:** Check `{governance_repo}/constitutions/{domain}-constitution.md`
2. **Service-specific constitution:** Check `{governance_repo}/constitutions/{domain}-{service}-constitution.md`
3. **Global fallback constitution:** Check `{governance_repo}/constitutions/constitution.md`

Apply the most specific match found. If multiple levels exist (global + domain), merge them with the more specific level taking precedence.

**Path:** `{governance_repo}` is resolved from `.lens/governance-setup.yaml`.

## Supported Operations

### `resolve --governance-dir <path>`

Resolves and loads the applicable constitution for the active feature context.

**Steps:**
1. Resolve `{governance_repo}` from `.lens/governance-setup.yaml`.
2. Resolve `{domain}` and `{service}` from the active feature context.
3. Walk the resolution chain (service → domain → global).
4. Load the most specific constitution found.
5. Report: `[constitution:loaded] level={level} path={path}`
6. Return the constitution content to the calling conductor for use in planning/architecture decisions.

**If no constitution is found:**
Report `[constitution:missing]` and continue — absence of a constitution is not a hard gate, but should be noted in the phase artifacts.

## Constitution Content

A constitution typically defines:
- Governance policies for the domain/service
- Workflow constraints (branch rules, review requirements)
- Quality gates and review thresholds
- Dependency and integration rules

The calling conductor should use constitution content to inform architecture decisions and verify that the proposed design complies with governance policy.
