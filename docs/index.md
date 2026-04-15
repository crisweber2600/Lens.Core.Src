# Lens.Core.Src Documentation Index

**Type:** monolith
**Primary Language:** YAML, Markdown, Python
**Architecture:** source-authoritative module plus adapter overlay
**Last Updated:** 2026-04-15
**Scan Mode:** full_rescan / exhaustive

## Project Overview

Lens.Core.Src is the source-of-truth project for the LENS Workbench release payload. It combines the checked-in GitHub adapter assets under `.github/` with the publishable `lens-work` BMAD module under `_bmad/lens-work/`.

## Start Here

- [Project Overview](./project-overview.md) - What this source project is and how it is organized
- [Contribution Guide](./contribution-guide.md) - Source-of-truth boundaries, validation expectations, and release impact
- [Development Guide](./development-guide.md) - Day-to-day contributor workflow
- [Deployment Guide](./deployment-guide.md) - Promotion and downstream sync flow

## Quick Reference

- **Tech Stack:** YAML contracts, Markdown skills and prompts, Python scripts, Node.js installer, GitHub Actions promotion
- **Primary Entry Points:** `.github/prompts/`, `_bmad/lens-work/module.yaml`, `_bmad/lens-work/lifecycle.yaml`
- **Architecture Pattern:** source module with release packaging and downstream pull-based consumption
- **State Model:** git and checked-in manifests rather than database-backed runtime state
- **Observed Inventory:** 28 `.github` prompt stubs, 58 module prompts, 43 skill directories, 17 scripts, 21 module docs, 11 templates

## Parent-Level Docs

- [Project Overview](./project-overview.md) - Parent-level summary of the source project
- [Architecture](./architecture.md) - How the source wrapper, module core, and release pipeline fit together
- [Source Tree Analysis](./source-tree-analysis.md) - Annotated structure of the parent project
- [Component Inventory](./component-inventory.md) - Catalog of source-facing components and packaging surfaces
- [Development Guide](./development-guide.md) - Contributor workflow for the source project
- [Deployment Guide](./deployment-guide.md) - Promotion and release-publishing flow
- [Contribution Guide](./contribution-guide.md) - Working rules, review expectations, and source-of-truth boundaries

## Choose a Route

- **Changing prompts or adapter files:** start with [Contribution Guide](./contribution-guide.md), then inspect [../.github/lens-work-instructions.md](../.github/lens-work-instructions.md) and [../_bmad/lens-work/docs/copilot-adapter-reference.md](../_bmad/lens-work/docs/copilot-adapter-reference.md)
- **Changing lifecycle, skills, or module behavior:** start with [Architecture](./architecture.md), then continue into [../_bmad/lens-work/docs/architecture.md](../_bmad/lens-work/docs/architecture.md) and [../_bmad/lens-work/docs/lifecycle-reference.md](../_bmad/lens-work/docs/lifecycle-reference.md)
- **Changing scripts or validation:** start with [Development Guide](./development-guide.md), then use [../_bmad/lens-work/scripts/README.md](../_bmad/lens-work/scripts/README.md) and [../_bmad/lens-work/docs/script-integration.md](../_bmad/lens-work/docs/script-integration.md)
- **Changing packaging or release flow:** start with [Deployment Guide](./deployment-guide.md), then use [../_bmad/lens-work/docs/pipeline-source-to-release.md](../_bmad/lens-work/docs/pipeline-source-to-release.md)

## Embedded Module Reference

- [../_bmad/lens-work/docs/index.md](../_bmad/lens-work/docs/index.md) - Module-level documentation hub
- [../_bmad/lens-work/README.md](../_bmad/lens-work/README.md) - Module overview and design principles
- [../_bmad/lens-work/docs/GETTING-STARTED.md](../_bmad/lens-work/docs/GETTING-STARTED.md) - Onboarding and first-use guide
- [../_bmad/lens-work/docs/project-overview.md](../_bmad/lens-work/docs/project-overview.md) - Existing lens-work overview
- [../_bmad/lens-work/docs/architecture.md](../_bmad/lens-work/docs/architecture.md) - Existing lens-work architecture detail
- [../_bmad/lens-work/docs/component-inventory.md](../_bmad/lens-work/docs/component-inventory.md) - Embedded component map
- [../_bmad/lens-work/docs/source-tree-analysis.md](../_bmad/lens-work/docs/source-tree-analysis.md) - Existing module tree analysis
- [../_bmad/lens-work/docs/development-guide.md](../_bmad/lens-work/docs/development-guide.md) - Existing module development guide
- [../_bmad/lens-work/docs/configuration-examples.md](../_bmad/lens-work/docs/configuration-examples.md) - Config examples and setup patterns
- [../_bmad/lens-work/docs/copilot-instructions.md](../_bmad/lens-work/docs/copilot-instructions.md) - Embedded Copilot instructions
- [../_bmad/lens-work/docs/copilot-repo-instructions.md](../_bmad/lens-work/docs/copilot-repo-instructions.md) - Repo-specific Copilot guidance
- [../_bmad/lens-work/docs/pipeline-source-to-release.md](../_bmad/lens-work/docs/pipeline-source-to-release.md) - Release pipeline details
- [../_bmad/lens-work/docs/copilot-adapter-reference.md](../_bmad/lens-work/docs/copilot-adapter-reference.md) - Adapter generation and structure
- [../_bmad/lens-work/docs/copilot-adapter-templates.md](../_bmad/lens-work/docs/copilot-adapter-templates.md) - Adapter template definitions
- [../_bmad/lens-work/docs/lifecycle-reference.md](../_bmad/lens-work/docs/lifecycle-reference.md) - Lifecycle rules and phase reference
- [../_bmad/lens-work/docs/lifecycle-visual-guide.md](../_bmad/lens-work/docs/lifecycle-visual-guide.md) - Visual flow guide
- [../_bmad/lens-work/docs/onboarding-checklist.md](../_bmad/lens-work/docs/onboarding-checklist.md) - Setup checklist for control repos
- [../_bmad/lens-work/docs/preflight-strategy.md](../_bmad/lens-work/docs/preflight-strategy.md) - Preflight design and validation strategy
- [../_bmad/lens-work/docs/script-integration.md](../_bmad/lens-work/docs/script-integration.md) - Script entry points and integration notes
- [../_bmad/lens-work/docs/lex-persona.md](../_bmad/lens-work/docs/lex-persona.md) - Lens persona definition
- [../_bmad/lens-work/docs/whats-new.md](../_bmad/lens-work/docs/whats-new.md) - Release notes
- [../_bmad/lens-work/docs/v3.1-improvements.md](../_bmad/lens-work/docs/v3.1-improvements.md) - Historical improvement notes
- [../_bmad/lens-work/docs/project-scan-report.json](../_bmad/lens-work/docs/project-scan-report.json) - Module-level machine-readable scan state
- [../_bmad/lens-work/scripts/README.md](../_bmad/lens-work/scripts/README.md) - Script usage and control-repo bootstrap

## Source Adapter Reference

- [../.github/copilot-instructions.md](../.github/copilot-instructions.md) - Copilot workspace instructions for the source tree
- [../.github/lens-work-instructions.md](../.github/lens-work-instructions.md) - Additional Lens-work adapter guidance

## Not Generated Intentionally

- **API Contracts:** not generated because Lens.Core.Src is not an HTTP service.
- **Data Models:** not generated because project state is git and manifest based, not database backed.
- **UI Component Catalog:** not generated because the project does not ship a frontend UI.

## Getting Started

From the Lens.Core.Src project root:

```bash
uv run _bmad/lens-work/scripts/install.py --dry-run
uv run _bmad/lens-work/scripts/validate-lens-bmad-registry.py
uv run --with pytest pytest _bmad/lens-work/scripts/tests/test-install.py -q
```

After promotion succeeds in the outer control repo:

```bash
git -C lens.core pull
uv run ./lens.core/_bmad/lens-work/scripts/preflight.py
```

## For AI-Assisted Development

- For prompt or adapter work, start with `.github/` plus the parent docs in this folder.
- For lifecycle, skill, or contract work, continue into the existing `_bmad/lens-work/docs/` set.
- For packaging issues, inspect the deployment guide here and the existing pipeline reference under `_bmad/lens-work/docs/`.
- For contributor workflow and source-of-truth rules, read [./contribution-guide.md](./contribution-guide.md).

---

_Documentation generated for the Lens.Core.Src source project using the BMAD `document-project` workflow pattern._