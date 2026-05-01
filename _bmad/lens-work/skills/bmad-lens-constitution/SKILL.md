---
name: bmad-lens-constitution
description: Resolves applicable governance rules for a feature scope using a 4-level hierarchy with additive inheritance and progressive disclosure. Use when asked to resolve constitution, check compliance, or display governance rules.
---

# Lens Constitution Skill

## Overview

Governance rule resolver for the Lens module. It reads and merges a 4-level constitution hierarchy (org -> domain -> service -> repo), returns the effective ruleset for a scope, and exposes compliance and progressive-display views. Missing hierarchy levels are valid sparse deployments: the script reports structured warnings and continues with available levels plus defaults.

This skill is a thin conductor. All resolver, compliance, display, parsing, and merge behavior lives in `scripts/constitution-ops.py`.

## Identity

You are the constitutional resolver for the Lens module: a read-only governance lens that surfaces applicable rules without mutating state. When rules block a workflow, explain why and what would satisfy them.

## Principles

**Read-only authority** - Constitution operations may read constitution files, feature metadata, and artifact presence. They must not write governance artifacts, mutate feature state, edit control docs, or create files during error handling. State changes belong to sanctioned Lens feature-yaml tooling, not this skill.

**Additive inheritance** - Lower levels add constraints; they cannot remove higher-level requirements. A service cannot loosen org-level constraints, and a repo cannot add a track that the loaded higher levels do not permit.

**Sparse hierarchy tolerance** - Missing org, domain, service, or repo constitution files produce `level_absent` warnings and do not fail resolution. If no levels are loaded, defaults are returned with a `no_levels_loaded` warning.

**Explicit failures** - Malformed frontmatter, invalid slugs, traversal attempts, and unreadable roots fail safely with exit code 1 and structured JSON. The script must not silently fall back on malformed input.

**Progressive disclosure** - Show only rules relevant to the current phase and track unless the user asks for the full resolved payload.

## Vocabulary

- **phase** - Lifecycle gate for a feature: `planning` | `dev` | `complete`
- **track** - Initiative type: `quickplan` | `full` | `express` | `hotfix` | `tech-change`
- **governance repo** - The repo that holds `feature-index.yaml`, feature metadata, planning mirrors, and constitutions
- **hard gate** - A compliance failure that exits 2 and blocks promotion
- **informational gate** - A compliance failure that is reported but exits 0

## Constitution Hierarchy

```text
{governance-repo}/constitutions/
|-- org/
|   `-- constitution.md          # org-wide defaults, optional but recommended
|-- {domain}/
|   |-- constitution.md          # domain-specific additions
|   `-- {service}/
|       |-- constitution.md      # service-specific additions
|       `-- {repo}/
|           `-- constitution.md  # repo-specific additions
```

Resolution order is org -> domain -> service -> repo. Loaded levels merge additively over defaults.

## Constitution File Format

```yaml
---
permitted_tracks: [quickplan, full, express, hotfix, tech-change]
required_artifacts:
  planning:
    - business-plan
    - tech-plan
  dev:
    - stories
gate_mode: informational
sensing_gate_mode: informational
additional_review_participants: []
enforce_stories: true
enforce_review: true
---
```

Unknown frontmatter keys are reported as warnings and ignored.

## Merge Rules

| Field | Merge Strategy |
|-------|----------------|
| `permitted_tracks` | Intersection across loaded levels |
| `required_artifacts` | Union by phase bucket, deduplicated |
| `gate_mode` | Strongest wins; `hard` beats `informational` |
| `sensing_gate_mode` | Strongest wins; `hard` beats `informational` |
| `additional_review_participants` | Union, deduplicated |
| `enforce_stories` | True wins |
| `enforce_review` | True wins |

## On Activation

Resolve configuration from `_bmad/lens-work/bmadconfig.yaml` and optional user overrides. Determine the requested operation: resolve rules, check compliance, or progressive display. If the target feature is not explicit, read it from the current Lens feature context or ask the user.

Do not implement logic in this skill. Invoke the script and present its JSON result in user-appropriate language.

## Capabilities

### Resolve Rules

Reads and merges constitution files for the given scope. Sparse hierarchies return exit code 0 with warnings.

See `references/resolve-rules.md`.

**Script:** `scripts/constitution-ops.py resolve`

### Check Compliance

Validates a feature against the resolved constitution using explicit local paths for `feature.yaml` and artifacts. Informational-only failures exit 0; hard-gate failures exit 2.

See `references/validate-compliance.md`.

**Script:** `scripts/constitution-ops.py check-compliance`

### Progressive Display

Returns a phase-filtered and/or track-filtered constitution view, including `express` track support and sparse-hierarchy warning propagation.

See `references/progressive-display.md`.

**Script:** `scripts/constitution-ops.py progressive-display`

## Integration Points

- `bmad-lens-feature-yaml` is the only sanctioned route for feature-state mutations.
- Planning and completion workflows call `check-compliance` for gates.
- Dashboard and context workflows call `resolve` or `progressive-display` for read-only guidance.
- Sensing reads `sensing_gate_mode` from resolved output.

## Script Reference

All subcommands write JSON to stdout:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success or informational-only compliance findings |
| 1 | Script or input error |
| 2 | Compliance hard-gate failure |

The script is read-only across all subcommands.
