# LENS Workbench Module — Documentation Index

**Module:** lens-work v4.0.0 | **Type:** CLI / Toolkit | **Last Updated:** 2026-04-01

---

## Quick Reference

| Need to... | Go to |
|------------|-------|
| **Get started fast** | [**Getting Started**](./GETTING-STARTED.md) |
| Understand your workspace | [Understanding Your LENS Workspace](./understanding-your-workspace.md) |
| Follow the setup checklist | [Onboarding Checklist](./onboarding-checklist.md) |
| See example configurations | [Configuration Examples](./configuration-examples.md) |
| Understand the project | [Project Overview](./project-overview.md) |
| Understand the source repo behind this release | [Source Project Guide](./source-project/index.md) |
| See the architecture | [Architecture](./architecture.md) |
| Browse the file tree | [Source Tree Analysis](./source-tree-analysis.md) |
| Find a skill/workflow/script | [Component Inventory](./component-inventory.md) |
| Set up for development | [Development Guide](./development-guide.md) |
| Understand the lifecycle | [Lifecycle Reference](./lifecycle-reference.md) |
| See the lifecycle visually | [Lifecycle Visual Guide](./lifecycle-visual-guide.md) |
| Understand CI/CD pipeline | [Pipeline: Source to Release](./pipeline-source-to-release.md) |
| Run express planning (no PRs) | `/expressplan` — [Workflow](../workflows/router/expressplan/workflow.md) |
| Run a retrospective | `/retrospective` — [Workflow](../workflows/router/retrospective/workflow.md) |
| Log a problem | `/log-problem` — [Workflow](../workflows/utility/log-problem/workflow.md) |
| Move a feature across domains | `/move-feature` — [Workflow](../workflows/utility/move-feature/workflow.md) |
| Split a feature into children | `/split-feature` — [Workflow](../workflows/utility/split-feature/workflow.md) |
| Check PR approval state | `/approval-status` — [Workflow](../workflows/utility/approval-status/workflow.md) |
| Pause an active epic | `/pause-epic` — [Workflow](../workflows/utility/pause-epic/workflow.md) |
| Resume a paused epic | `/resume-epic` — [Workflow](../workflows/utility/resume-epic/workflow.md) |
| Revert to previous phase | `/rollback-phase` — [Workflow](../workflows/utility/rollback-phase/workflow.md) |
| Manage user profile | `/profile` — [Workflow](../workflows/utility/profile/workflow.md) |
| View multi-initiative dashboard | `/dashboard` — [Workflow](../workflows/utility/dashboard/workflow.md) |
| Audit all active initiatives | `/audit-all` — [Workflow](../workflows/governance/audit-all/workflow.md) |

---

## Generated Documentation (Deep Scan — 2026-04-01)

| Document | Description | Status |
|----------|-------------|--------|
| [Getting Started](./GETTING-STARTED.md) | Elevator pitch, 3-step quick start, track overview, decision flowchart | ✅ Generated |
| [Onboarding Checklist](./onboarding-checklist.md) | Linear step-by-step checklist from zero to running initiative | ✅ Generated |
| [Configuration Examples](./configuration-examples.md) | Sample bmadconfig.yaml for solo, team, enterprise, multi-IDE, GitLab, Azure DevOps | ✅ Generated |
| [Project Overview](./project-overview.md) | High-level project summary, tech stack, architecture classification | ✅ Generated |
| [Architecture](./architecture.md) | Design axioms, patterns, workflow/skills architecture, deployment | ✅ Generated |
| [Source Tree Analysis](./source-tree-analysis.md) | Full annotated directory tree with critical folder descriptions | ✅ Generated |
| [Component Inventory](./component-inventory.md) | Complete inventory: 34 skills, 35 workflows, 76 prompts, 15 script pairs, 1 agent | ✅ Generated |
| [Development Guide](./development-guide.md) | Prerequisites, installation, environment setup, scripts reference, testing | ✅ Generated |

---

## Source Project Documentation (Exhaustive Scan — 2026-04-15)

| Document | Description | Status |
|----------|-------------|--------|
| [Source Project Guide](./source-project/index.md) | Entry point for the Lens.Core.Src source-project scan bundle | ✅ Embedded |
| [Source Project Overview](./source-project/project-overview.md) | What the editable source repo is and how it differs from the release payload | ✅ Embedded |
| [Source Project Contribution Guide](./source-project/contribution-guide.md) | Source-of-truth boundaries, validation expectations, and release impact | ✅ Embedded |

---

## Existing Documentation (Pre-Scan)

| Document | Description | Lines |
|----------|-------------|-------|
| [Lifecycle Reference](./lifecycle-reference.md) | Complete lifecycle.yaml contract reference | ~400 |
| [Lifecycle Visual Guide](./lifecycle-visual-guide.md) | Mermaid diagrams for lifecycle flow | ~200 |
| [Understanding Your LENS Workspace](./understanding-your-workspace.md) | End-user guide to the control repo, `TargetProjects/`, governance, and `lens.core/` | — |
| [Pipeline: Source to Release](./pipeline-source-to-release.md) | CI/CD pipeline documentation | 171 |
| [Copilot Adapter Reference](./copilot-adapter-reference.md) | GitHub Copilot IDE adapter details | — |
| [Copilot Adapter Templates](./copilot-adapter-templates.md) | Template definitions for adapter generation | — |
| [Copilot Instructions](./copilot-instructions.md) | Generated copilot-instructions.md reference | — |
| [Copilot Repo Instructions](./copilot-repo-instructions.md) | Repository-level instruction patterns | — |
| [Script Integration](./script-integration.md) | Script execution patterns and provider adapters | — |
| [Lex Persona](./lex-persona.md) | Constitutional governance voice definition | — |
| [What's New (v2.0 → v3.2)](./whats-new.md) | Full changelog from v2.0 through v3.2 | ~300 |
| [v3.1 Improvements](./v3.1-improvements.md) | Detailed changelog for schema v3.1 | ~420 |

---

## State & Metadata

| File | Purpose |
|------|---------|
| [project-scan-report.json](./project-scan-report.json) | Scan state, progress tracking, resume data |

---

## Module Key Files (Outside docs/)

| File | Purpose |
|------|---------|
| `lifecycle.yaml` | **THE CONTRACT** — phases, audiences, tracks, validation rules |
| `module.yaml` | Module registry — version, skills, workflows |
| `bmadconfig.yaml` | Runtime configuration template |
| `module-help.csv` | Command index (89 entries, 13 columns) |
| `README.md` | Module overview with design axioms |
| `TODO.md` | Development checklist |
| `agents/lens.agent.md` | Agent persona and 28-item menu |
| `agents/lens.agent.yaml` | Agent YAML companion for validation |
