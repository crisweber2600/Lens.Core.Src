# Copilot Instructions — BMAD Control Repos with LENS Workbench

This document provides comprehensive guidance for using Copilot in BMAD control repositories that leverage the LENS Workbench module.

---

## 👥 Audience & Prerequisites

**Who should read this?**

This guide is written for:
- **BMAD newcomers** — New to the framework, want to understand the big picture
- **Control repo maintainers** — Setting up or managing a BMAD control repo
- **Feature developers** — Building code within a BMAD-orchestrated initiative
- **Copilot users** — Want to work effectively with Copilot Chat agents in BMAD repos

**What prior knowledge is helpful?**

- **None required** — This guide is self-contained
- **Helpful but optional:**
  - Understanding of git workflows (branches, commits, PRs)
  - Familiarity with CI/CD and lifecycle phases (planning → implementation)
  - Basic knowledge of markdown and YAML formats

**How to use this guide:**

1. **Quick start:** Read "LENS Workbench Commands" and "Using Copilot Effectively" sections
2. **Deep dive:** Work through "Repository Architecture" and "File Conventions" for full context
3. **Reference:** Jump to specific sections as needed when questions arise

---

## Repository Architecture

A BMAD control repo orchestrates planning, discovery, and lifecycle management for multiple target projects using the BMAD Method v6 framework. The control repo dogfoods its own tooling through the lens-work module.

**Typical structure:**

```
{control-repo-name}/
├── _bmad/                    ← BMAD framework: modules, agents, workflows
│   ├── _config/              ← Installation manifest, agent/workflow/file manifests
│   ├── _memory/              ← Agent memory (tech-writer sidecar, storyteller, etc.)
│   ├── core/                 ← Core platform (bmad-master, tasks, resources)
│   ├── bmm/                  ← BMAD Method Module (planning → implementation)
│   ├── bmb/                  ← BMAD Builder Module (create agents, modules)
│   ├── cis/                  ← Creative Intelligence Suite
│   ├── gds/                  ← Game Dev Studio
│   ├── tea/                  ← Test Engineering Academy
│   └── lens-work/            ← LENS Workbench (INSTALLED from source)
├── _bmad-output/             ← Runtime state, logs, planning artifacts
├── .github/agents/           ← Copilot Chat agent stubs
├── .github/prompts/          ← Reusable prompt files
├── TargetProjects/           ← Cloned repos managed by lens-work
│   ├── {DOMAIN}/{SERVICE}/   ← Domain-organized projects
│   └── ...
└── docs/                     ← Discovery scans and documentation
```

## Critical Operating Rules

### Control-Plane Separation

**All BMAD commands execute from the control repo root.** Never `cd` into TargetProjects repos to run BMAD operations. Repository operations use programmatic paths from `_bmad/lens-work/service-map.yaml`.

**Commands originate from:** The control repo's `_bmad-output/lens-work/` context.
**Operations affect:** Target repos listed in service-map.yaml, but are orchestrated from the control plane.

### Dogfooding Discipline

The `lens-work` module follows a strict dogfooding pattern:

1. **Source:** `TargetProjects/{DOMAIN}/{SERVICE}/BMAD.{MODULE}/src/modules/lens-work/`
2. **Installed copy:** `_bmad/lens-work/` (DO NOT edit directly)
3. **Changes flow:** Through **module-builder agent** in the source repo
4. **Reinstall:** After source changes, run installer to sync into control repo

**Never edit the installed copy directly** — changes will be overwritten on reinstall.

## BMAD Agent System

Agents are persona-driven AI assistants with command menus, custom behaviors, and contextual expertise.

### Agent Activation Pattern

GitHub Copilot Chat agent stubs in `.github/agents/` use this pattern:

```markdown
---
name: '{agent-name}'
disable-model-invocation: true
---
<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from {project-root}/_bmad/{module}/agents/{agent}.md
2. READ its entire contents
3. FOLLOW every step in the <activation> section precisely
</agent-activation>
```

Agent definition files are loaded **at runtime, never pre-loaded**. This enables:
- Dynamic context resolution
- Lazy loading of resources from manifests
- Per-session customization via `_config/agents/{module}-{agent}.customize.yaml`

### Key Agents by Module

**Core Platform:**
- `bmad-master` — Master executor, runtime resource management

**BMAD Method Module (bmm):**
- `analyst` — Research and discovery
- `architect` — Solution design
- `pm` — Program management
- `dev` — Feature development
- `sm` — Scrum/sprint master
- `quinn` — QA and testing
- `quick-flow-solo-dev` — Single-person workflow acceleration
- `tech-writer` — Documentation specialist
- `ux-designer` — User experience design

**BMAD Builder Module (bmb):**
- `agent-builder` — Create new agents
- `module-builder` — Create/edit BMAD modules
- `workflow-builder` — Create/edit workflows

**LENS Workbench:**
- `compass` — Phase router for `/pre-plan`, `/spec`, `/plan`, `/review`, `/dev`
- `casey` — Git branch orchestration
- `tracey` — State management and recovery
- `scout` — Bootstrap and discovery

## BMAD Lifecycle Phases

The planning-to-implementation lifecycle follows ordered sequential phases:

1. **Analysis** (Phase 1, P1)
   - Brainstorm → Research → Product Brief
   - Focus: Understanding the problem space

2. **Planning** (Phase 2, P2)
   - PRD → UX Design
   - Focus: Solution strategy and specifications

3. **Solutioning** (Phase 3, P3)
   - Architecture → Epics & Stories → Implementation Readiness Check
   - Focus: Detailed solution design and readiness validation

4. **Implementation** (Phase 4, P4)
   - Sprint Planning → Create Story → Dev Story → Code Review → Retrospective
   - Focus: Execution and delivery

**Artifacts flow to:**
- Analysis/Planning: `_bmad-output/planning-artifacts/`
- Implementation: `_bmad-output/implementation-artifacts/`

## LENS Workbench Commands

### Phase Router Commands (via Compass)

LENS Workbench provides guided phase navigation through Compass:

| Command | Phase | Function |
|---------|-------|----------|
| `/pre-plan` | P1 | Pre-flight check, bootstrap, discovery |
| `/spec` | P1-P2 | Specification review and refinement |
| `/plan` | P2 | Planning and design |
| `/review` | P3 | Architecture and readiness review |
| `/dev` | P4 | Development and implementation |

### Initiative Commands

Create and manage initiatives:

| Command | Function |
|---------|----------|
| `#new-domain` | Create domain-scoped initiative |
| `#new-service` | Create service within domain |
| `#new-feature` | Create feature initiative |
| `#fix-story` | Create hotfix or bug story |

### Supporting Files

Command guidance and templates:
- Location: `.github/prompts/`
- Format: `lens-work.{command}.prompt.md`
- Updated by: lens-work module installer

## File and Resource Conventions

### Agent Definitions
- Format: Markdown (`.md`) with YAML frontmatter or `.agent.yaml` files
- Location: `_bmad/{module}/agents/`
- Customization: `_bmad/_config/agents/{module}-{agent}.customize.yaml`

### Workflows
- Format: Markdown (`.md` with step guidance) or YAML (`.yaml` structured config)
- Location: `_bmad/{module}/workflows/`
- Pattern: Lazy load from manifests at runtime

### Manifests
- Format: CSV for flat registries
- Files: `agent-manifest.csv`, `workflow-manifest.csv`, `files-manifest.csv`, `task-manifest.csv`, `tool-manifest.csv`
- Location: `_bmad/_config/`
- Use: Fast lookup, dependency validation, installation

### Runtime State (LENS Workbench)
- Location: `_bmad-output/lens-work/`
- Files:
  - `state.yaml` — Current initiative, phase, size, gate status
  - `event-log.jsonl` — Append-only audit trail
- Management: Read by Tracey (state manager), written by all workflows

### Module Configuration
- Format: YAML
- Location: `_bmad/{module}/bmadconfig.yaml`
- Content: User settings, output paths, language, features

### Path Tokens
- Format: `{project-root}` for absolute paths in configs and files
- Resolution: At runtime by the BMAD framework
- Use: Enable cross-platform, portable configurations

## Key Architectural Patterns

### Lazy Loading
- Agents, workflows, and resources are loaded **at runtime, not pre-loaded**
- Enables dynamic context resolution and per-session customization
- Improves startup performance and flexibility

### Numbered Menus
- All agent interactions present **numbered option lists** for user selection
- Supports fuzzy matching and command abbreviations
- Consistent UX across all agents

### CSV Registries
- `_config/*.csv` files are the **authoritative index** of agents, workflows, tasks, and files
- Used by installer, manifest validation, and dependency checks
- Single source of truth for system composition

### Module Independence
- Each module (`bmm`, `bmb`, `cis`, `tea`, `gds`, `lens-work`) is **self-contained**
- Own `bmadconfig.yaml`, `agents/`, `workflows/`, `data/`, `teams/` directories
- Can be installed, updated, or removed independently

### Custom Layer
- User overrides: `_bmad/_config/custom/`
- Agent customization: `_bmad/_config/agents/*.customize.yaml`
- Extends behavior without modifying source, enabling clean upgrades

## Working with Target Projects

### Service Map

The `_bmad/lens-work/service-map.yaml` maintains the canonical registry of target repos:

```yaml
domains:
  {DOMAIN}:
    services:
      {SERVICE}:
        repos:
          - name: {REPO_NAME}
            path: TargetProjects/{DOMAIN}/{SERVICE}/{REPO_NAME}
            type: application|framework|module
```

Each repo operation is programmatically resolved using this map.

### Repository Organization

**Recommended structure:**

```
TargetProjects/
├── {DOMAIN_1}/
│   ├── {SERVICE_A}/
│   │   ├── app-name/
│   │   └── BMAD.module-name/  (if module source)
│   └── {SERVICE_B}/
└── {DOMAIN_2}/
    └── {SERVICE}/
```

Enables:
- Domain-scoped initiatives via lens-work
- Service-oriented organization
- Clear ownership and boundaries
- Multi-tenant planning discipline

### Documentation Output

Generated canonical documentation:
- **Source:** Discovery scans from target repos
- **Processing:** By Scout (discovery agent)
- **Output location:** `_bmad-output/lens-work/docs/`
- **Sync location:** `docs/lens-sync/` (reference copies)

Discovery docs:
- Location: `docs/discovery/`
- Content: Deep scans of repo structure, dependencies, architecture
- Owned by: Scout agent, manual updates

## LENS Workbench Git Discipline

The LENS Workbench enforces strict git-based workflow control:

### Branch Topology

Branches mirror the BMAD lifecycle phases and sizes:

**Domain-layer (single branch):**
```
main
└── {domain_prefix}                                    ← Domain organizational branch (only branch)
```

Domain-layer initiatives create only the `{domain_prefix}` branch with Domain.yaml and .gitkeep scaffolding in `initiatives/`, `TargetProjects/`, and `Docs/`. No audience/phase/workflow branches.

**Service-layer (single branch):**
```
main
└── {domain_prefix}-{service_prefix}               ← Service organizational branch
```

**Feature/Microservice layers (full topology):**
```
main
└── {featureBranchRoot}                            ← Initiative root
    ├── {featureBranchRoot}-small                  ← Small review audience
    │   └── {featureBranchRoot}-small-p1           ← Phase 1 (Analysis)
    │       └── ...-small-p1-{workflow}            ← Workflow branch
    ├── {featureBranchRoot}-medium                 ← Medium review audience
    │   └── {featureBranchRoot}-medium-p2          ← Phase 2 (Planning)
    └── {featureBranchRoot}-large                  ← Large review audience
        ├── {featureBranchRoot}-large-p3           ← Phase 3 (Solutioning)
        └── {featureBranchRoot}-large-p4           ← Phase 4 (Implementation)
```

All branches use flat hyphen-separated naming (no `/` separators). All branches pushed to remote immediately on creation.

**Design principle:** The entire project lifecycle can be reconstructed from `git log` alone.

### Workflow Git Discipline

All lens-work workflows enforce:

1. **Start:** Verify clean state → checkout correct branch → pull latest
2. **End:** Stage changes → create targeted commit → push to origin

Example commit message:
```
{type}({initiative_id}): description of changes
```

## Using Copilot Effectively in BMAD Repos

### When to Ask Copilot

✅ **DO ask for:**
- BMAD architecture explanations
- Agent behavior clarification
- Workflow routing decisions
- File location and structure questions
- Module installation troubleshooting
- Git workflow discipline questions

❌ **DON'T ask for:**
- Edits to the installed `_bmad/` copy (route through module-builder instead)
- Target project operations (use lens-work agents from control repo)
- Removing or modifying manifests without understanding implications

### Effective Prompts

**Bad:** "How do I edit lens-work?"
**Good:** "I need to add a new workflow to lens-work. Should I edit the source in BMAD.Lens and then reinstall, or edit directly in _bmad/lens-work/?"

**Bad:** "Create a new feature in chatting."
**Good:** "I want to start a new feature initiative for real-time messaging in the chat service. Which Compass command should I use?"

### Copilot Agent Collaboration

Copilot works alongside BMAD agents:

- **You (Copilot):** Technical architecture, code explanations, refactoring
- **Compass:** Phase routing, workflow sequencing, initiative flow
- **Casey:** Git operations, branch orchestration, merge strategies
- **Scout:** Discovery, documentation, repo inventory
- **Tracey:** State recovery, audit trail analysis, gate progression

## Next Steps

To get started with a BMAD control repo using LENS Workbench:

1. **Load Compass agent:** `@compass` in GitHub Copilot Chat
2. **Run preflight:** `/pre-plan` to bootstrap and discover repos
3. **Start first initiative:** `#new-feature` or `#new-domain` via Compass
4. **Follow phase routing:** Use `/spec`, `/plan`, `/review`, `/dev` as needed

For questions about specific agents or workflows, ask Copilot directly with context about what you're trying to accomplish.
