---
name: docs-path
description: Canonical documentation paths, naming conventions, and version control rules for lens-work artifacts
type: include
---

# Documentation Paths Reference

This document defines the canonical directory structure, file naming conventions, and version control rules for all artifacts produced by lens-work workflows.

---

## Docs Path Resolution Logic

### Usage
Include this in any workflow that needs to resolve initiative docs paths.

### Resolution Algorithm

```pseudocode
function resolve_docs_path(initiative):
  if initiative.docs and initiative.docs.path:
    docs_path = initiative.docs.path
    repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"
  else:
    # Legacy fallback
    docs_path = "_bmad-output/planning-artifacts/"
    repo_docs_path = null
    emit_warning("⚠️ DEPRECATED: Initiative missing docs.path. Using legacy path.")
  
  return { docs_path, repo_docs_path }
```

### Repo Docs Allowlist
The `repo_docs_path` enables loading context from the target repository's own docs folder.
Valid doc types from repo: `README.md`, `CONTRIBUTING.md`, `SETUP.md`, `ARCHITECTURE.md`, `API.md`

Only load repo docs if:
1. `repo_docs_path` is resolved (not null)
2. The file exists at the resolved path
3. The file is in the allowlist above

### Migration Note
Initiatives created before context enhancement will not have a `docs.path` block.
The fallback ensures backward compatibility while surfacing deprecation warnings.

---

## Directory Structure

```
{project-root}/
├── _bmad-output/
│   ├── lens-work/
│   │   ├── state.yaml                          # Active initiative state
│   │   ├── event-log.jsonl                      # Lifecycle event log
│   │   ├── repo-inventory.yaml                  # Discovered repo metadata
│   │   ├── bootstrap-report.md                  # Bootstrap output
│   │   ├── initiatives/                         # Per-initiative state (future)
│   │   │   └── {initiative_id}.yaml
│   │   └── docs/                                # Canonical generated docs
│   │       └── {repo_name}/
│   │           ├── api-reference.md
│   │           ├── architecture-overview.md
│   │           └── component-map.md
│   ├── planning-artifacts/                      # Planning phase outputs
│   │   └── {initiative_id}/
│   │       ├── preplan-product-brief.md
│   │       ├── preplan-research-notes.md
│   │       ├── preplan-brainstorm-notes.md
│   │       ├── businessplan-prd.md
│   │       ├── businessplan-ux-design.md
│   │       ├── techplan-architecture.md
│   │       ├── techplan-tech-decisions.md
│   │       ├── techplan-api-contracts.md
│   │       ├── devproposal-epics.md
│   │       ├── devproposal-readiness-checklist.md
│   │       ├── devproposal-stories/
│   │       │   ├── story-001.md
│   │       │   ├── story-002.md
│   │       │   └── ...
│   │       ├── stories.csv
│   │       └── epics.csv
│   └── implementation-artifacts/                # Implementation phase outputs
│       └── {initiative_id}/
│           ├── sprintplan-sprint-plan.md
│           ├── dev-stories/
│           │   ├── dev-story-001.md
│           │   ├── dev-story-002.md
│           │   └── ...
│           ├── dev-review-notes.md
│           └── dev-retro.md
├── docs/
│   ├── discovery/                               # Discovery scan outputs
│   │   ├── initial-discovery-report.md
│   │   ├── deep-scan-{repo_name}.md
│   │   └── deep-scan-summary.md
│   ├── {domain}/                                 # Batch-mode phase docs
│   │   └── {service}/
│   │       └── {repo}/
│   │           └── {initiative_id}/
│   │               ├── preplan-analysis-questions.md
│   │               ├── preplan-review.md
│   │               ├── businessplan-planning-questions.md
│   │               ├── businessplan-review.md
│   │               ├── devproposal-solutioning-questions.md
│   │               ├── devproposal-review.md
│   │               ├── dev-implementation-questions.md
│   │               └── dev-review.md
│   └── lens-sync/                               # Synced repo documentation
│       └── {repo_name}/
│           └── ...
```

---

## Path Patterns

### Planning Artifacts

```
_bmad-output/planning-artifacts/{initiative_id}/
```

All planning artifacts are stored here. Files are prefixed with the phase name.

| Phase | File | Path |
|-------|------|------|
| PrePlan | Product Brief | `_bmad-output/planning-artifacts/{id}/preplan-product-brief.md` |
| PrePlan | Research Notes | `_bmad-output/planning-artifacts/{id}/preplan-research-notes.md` |
| PrePlan | Brainstorm Notes | `_bmad-output/planning-artifacts/{id}/preplan-brainstorm-notes.md` |
| BusinessPlan | PRD | `_bmad-output/planning-artifacts/{id}/businessplan-prd.md` |
| BusinessPlan | UX Design | `_bmad-output/planning-artifacts/{id}/businessplan-ux-design.md` |
| TechPlan | Architecture | `_bmad-output/planning-artifacts/{id}/techplan-architecture.md` |
| TechPlan | Tech Decisions | `_bmad-output/planning-artifacts/{id}/techplan-tech-decisions.md` |
| TechPlan | API Contracts | `_bmad-output/planning-artifacts/{id}/techplan-api-contracts.md` |
| DevProposal | Epics | `_bmad-output/planning-artifacts/{id}/devproposal-epics.md` |
| DevProposal | Stories (dir) | `_bmad-output/planning-artifacts/{id}/devproposal-stories/` |
| DevProposal | Readiness Checklist | `_bmad-output/planning-artifacts/{id}/devproposal-readiness-checklist.md` |
| DevProposal | Stories CSV | `_bmad-output/planning-artifacts/{id}/stories.csv` |
| DevProposal | Epics CSV | `_bmad-output/planning-artifacts/{id}/epics.csv` |

### Implementation Artifacts

```
_bmad-output/implementation-artifacts/{initiative_id}/
```

All implementation artifacts are stored here. Files are prefixed with the phase name.

| Phase | File | Path |
|-------|------|------|
| SprintPlan | Sprint Plan | `_bmad-output/implementation-artifacts/{id}/sprintplan-sprint-plan.md` |
| Dev | Dev Stories (dir) | `_bmad-output/implementation-artifacts/{id}/dev-stories/` |
| Dev | Review Notes | `_bmad-output/implementation-artifacts/{id}/dev-review-notes.md` |
| Dev | Retrospective | `_bmad-output/implementation-artifacts/{id}/dev-retro.md` |

### Canonical Docs

```
_bmad-output/lens-work/docs/{repo_name}/
```

Generated documentation for discovered repos. Produced by `repo-document` workflow.

### Discovery Docs

```
docs/discovery/
```

### Batch Question Docs

```
docs/{domain}/{service}/{repo}/{initiative_id}/
```

Batch question files and party-mode review outputs live here. The resolved path is stored in `initiatives/{id}.yaml` as `docs.path`.

Output from `repo-discover` and deep-scan workflows. Committed to main branch.

### Lens Sync

```
docs/lens-sync/{repo_name}/
```

Synced documentation from target repos via `sync` workflow.

---

## Naming Conventions

### File Names

- **Format:** `kebab-case` with phase name prefix
- **Pattern:** `{phase}-{artifact-name}.md`
- **Examples:**
  - `preplan-product-brief.md`
  - `techplan-architecture.md`
  - `devproposal-readiness-checklist.md`
  - `dev-retro.md`

### Directory Names

- **Format:** `kebab-case` with phase name prefix
- **Pattern:** `{phase}-{collection-name}/`
- **Examples:**
  - `devproposal-stories/`
  - `dev-stories/`

### Story Files

- **Individual stories:** `story-{NNN}.md` (zero-padded 3 digits)
- **Dev stories:** `dev-story-{NNN}.md`
- **CSV tracking:** `stories.csv`, `epics.csv` (no phase prefix)

### Initiative ID in Paths

- Initiative IDs appear in directory names, not file names
- Pattern: `{sanitized_name}-{6char_hex}`
- Example: `rate-limit-x7k2m9`

---

## Version Control Rules

### Artifact Commit Rules

| File Type | Committed To | When |
|-----------|-------------|------|
| Planning artifacts | Initiative phase branch | During workflow execution |
| Implementation artifacts | Initiative phase branch | During workflow execution |
| `state.yaml` | Active branch | Every workflow start/finish |
| `event-log.jsonl` | Active branch | Every event |
| Discovery docs | `main` branch | After discovery workflow |
| Canonical docs | `main` branch | After repo-document workflow |
| Lens sync docs | `main` branch | After sync workflow |
| Batch question docs | Phase branch | During batch-mode processing |

### Git Add Patterns

```bash
# Planning artifacts for current initiative
git add "_bmad-output/planning-artifacts/${initiative_id}/"

# Implementation artifacts for current initiative
git add "_bmad-output/implementation-artifacts/${initiative_id}/"

# State and event log (always)
git add "_bmad-output/lens-work/state.yaml"
git add "_bmad-output/lens-work/event-log.jsonl"

# Discovery docs (main branch only)
git add "docs/discovery/"

# Canonical docs (main branch only)
git add "_bmad-output/lens-work/docs/"

# Batch question docs (phase branch)
git add "docs/${domain}/${service}/${repo}/${initiative_id}/"
```

### Commit Message Patterns

| Context | Message Format |
|---------|----------------|
| Workflow artifact | `workflow({workflow_name}): {description} ({initiative_id})` |
| Phase start | `phase({phase_name}): Start {phase_name} ({initiative_id})` |
| Phase finish | `phase({phase_name}): Finish {phase_name} ({initiative_id})` |
| Discovery | `discovery: {scan_type} for {repo_name}` |
| State update | `state: Update {field} ({initiative_id})` |

---

## Path Resolution

### Token Substitution

All path patterns use these tokens:

| Token | Resolves To | Source |
|-------|------------|--------|
| `{project-root}` | Absolute path to BMAD control repo | Runtime |
| `{initiative_id}` | Current initiative ID | `state.yaml` |
| `{repo_name}` | Target repository name | `service-map.yaml` |
| `{id}` | Shorthand for `{initiative_id}` | `state.yaml` |
| `{domain}` | Initiative domain segment | `initiatives/{id}.yaml` (`docs.domain`) |
| `{service}` | Initiative service segment | `initiatives/{id}.yaml` (`docs.service`) |
| `{repo}` | Initiative repo segment | `initiatives/{id}.yaml` (`docs.repo`) |

### Example Resolution

```
Template: _bmad-output/planning-artifacts/{initiative_id}/businessplan-prd.md
Resolved: _bmad-output/planning-artifacts/rate-limit-x7k2m9/businessplan-prd.md
```

---

## Related Includes

- **artifact-validator.md** — Validates artifacts at these paths
- **jira-integration.md** — CSV files stored in planning-artifacts
- **size-topology.md** — Branch structure artifacts are committed to
