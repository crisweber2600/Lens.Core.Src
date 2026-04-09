# Project Overview — LENS Workbench Module (lens-work)

**Generated:** 2026-04-01 | **Scan Level:** Deep | **Module Version:** 3.2.0

---

## Executive Summary

**lens-work** is the core lifecycle orchestration module for the BMAD (Build Measure Analyze Design) platform. It provides a declarative, git-native initiative management system that coordinates AI agents through structured planning phases — from initial brainstorming through sprint execution and closure.

The module is a **CLI/Toolkit** — a command-driven BMAD module with 32 slash commands, cross-platform scripts, declarative YAML contracts, and IDE adapter integration. It is deployed into "control repos" (operational workspaces) and orchestrates work across multiple target project repositories.

**Key Design Philosophy:** "Git is the only source of truth. PRs are the only gating mechanism. The control repo is an operational workspace, not a code repo."

---

## Tech Stack Summary

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| Meta-Framework | BMAD | v3.2 | AI agent orchestration platform |
| Contract Schema | YAML | 3.2 | Declarative lifecycle contract (`lifecycle.yaml`) |
| Scripts (Unix) | Bash | 4+ | Cross-platform operational scripts |
| Scripts (Windows) | PowerShell | 5+ | Cross-platform operational scripts |
| CI/CD Installer | Node.js | 16+ | `_module-installer/installer.js` (no npm deps) |
| Version Control | Git | 2.28+ | Single source of truth for all state |
| Primary Provider | GitHub REST API | v3 | PR creation, branch management (no `gh` CLI) |
| Secondary Provider | Azure DevOps REST API | — | Enterprise support, provider-agnostic adapter |
| Visualization | Mermaid | — | Gantt timelines, architecture diagrams |
| IDE Integration | VS Code / Copilot | — | Agent stubs, prompt files, skill references |

---

## Architecture Type Classification

- **Repository Type:** Monolith (single cohesive module)
- **Architecture Pattern:** Declarative contract-driven with step-file workflow decomposition
- **State Model:** Git-derived (branch existence + PR metadata + committed artifacts)
- **Agent Model:** Single primary agent (`@lens`) with 5 delegated skills and 35 workflows

---

## Repository Structure

```
lens-work/
├── agents/          # BMAD agent definitions (dual .md + .yaml)
├── skills/          # 5 core skills (git-state, git-orchestration, constitution, sensing, checklist)
├── workflows/       # 35 workflows across 4 categories (core/router/utility/governance)
├── prompts/         # 32 user-facing prompt trigger files
├── scripts/         # Cross-platform Python scripts (.py)
├── docs/            # Reference documentation (22 files)
├── tests/           # Contract test specifications (4 markdown files)
├── assets/          # Template assets
├── _module-installer/  # CI/CD installer (Node.js)
├── bmad-lens-work-setup/  # Legacy setup workflow
├── lifecycle.yaml   # THE CONTRACT — single source of truth
├── module.yaml      # Module metadata and registry
├── bmadconfig.yaml  # Runtime configuration template
└── module-help.csv  # Command index (13-column, 32 entries)
```

---

## Module Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| `core` | Required | BMAD core infrastructure (workflow framework, skill routing, agent activation) |
| `cis` | Optional | Creative Innovation Suite (agents: Mary, Winston) |
| `tea` | Optional | Test Engineering Academy |

---

## Links to Detailed Documentation

- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [Lifecycle Reference](./lifecycle-reference.md) (existing)
- [Script Integration](./script-integration.md) (existing)
- [Pipeline Source to Release](./pipeline-source-to-release.md) (existing)
- [Copilot Adapter Reference](./copilot-adapter-reference.md) (existing)
