# LENS Workbench (lens-work)

**Guided lifecycle router with git-orchestrated discipline for BMAD workflows.**

---

## Overview

LENS Workbench transforms BMAD from a "large framework you must learn" into a **guided system people can use immediately**. It acts as the front door to BMAD by providing:

- **Phase Router Commands** — `/pre-plan`, `/spec`, `/plan`, `/review`, `/dev`
- **Automated Git Orchestration** — Branch topology mirrors BMAD phases
- **Layer-Aware Context** — Auto-detects domain/service/microservice/feature layers
- **Repo Discovery & Documentation** — Inventories and documents repos before planning
- **Lifecycle Telemetry** — Tracks phase progress with dashboard visibility
- **Context Switching** — Seamlessly move between initiatives, lenses, and phases

**The architectural differentiator:** Git history becomes the process tracker — branch topology mirrors BMAD phases, so you can see where you are just by looking at branches.

---

## Copilot Integration

LENS Workbench is designed for **GitHub Copilot Chat integration** in BMAD control repos. When installed, the module includes comprehensive Copilot guidance:

- **Documentation:** [Copilot Instructions](docs/copilot-instructions.md) — How to work effectively with Copilot in BMAD repos
- **Agent Loading:** Copilot loads LENS agents (Compass, Casey, Tracey, Scout) from `.github/agents/` stubs
- **Workflow Guidance:** Copilot provides context for phase routing, git operations, and state management
- **Command Reference:** See `.github/prompts/` for prompt files used by Compass routing commands

**Start here:** Load Compass in Copilot Chat (`@compass`) and run `/pre-plan` to bootstrap your repository.

---

## Stub Prompts & Settings System

When the installer runs it:

1. **Creates `settings.json`** at `_bmad-output/lens-work/settings.json` with `github.repo` (the control repository URL), `github.branch`, and user preferences.
2. **Generates `.github/stubPrompts/`** — one stub file per prompt. Each stub says "load and execute `.github/prompts/<name>`" and links to the GitHub source. Stubs are regenerated on every install.
3. **Onboarding syncs stubs** — `@scout onboard` reads `settings.json`, sparse-clones the control repo, and copies the latest stubs into the workspace.

Implementation files:
- `_module-installer/installer.js` — `generateStubPrompts()` and `createSettings()`
- `workflows/utility/onboarding/workflow.md` — Section 2a (clone logic)
- `_bmad-output/lens-work/settings.json` — runtime config (gitignored)

---

## Architecture

### Two-File State Architecture

LENS Workbench maintains all runtime state in exactly two files — no database, no external services:

```
_bmad-output/lens-work/
├── state.yaml          ← Current initiative context, phase, size, gate status
└── event-log.jsonl     ← Append-only audit trail of every lifecycle event
```

**`state.yaml`** is the single source of truth for "where are we now?" — active initiative, current phase, size, workflow status, and gate progression. Every workflow reads it at start and writes it at end.

**`event-log.jsonl`** is the immutable history. Each line is a timestamped JSON event recording what happened, who did it, and what changed. Used for recovery, auditing, and telemetry dashboards.

### Branch Topology

Git branches mirror the BMAD lifecycle. See `workflows/includes/size-topology.md` for the full specification.

**Domain-Layer (single branch):**
```
main
└── {domain_prefix}                               ← Domain organizational branch (only branch)
    (Domain.yaml, .gitkeep in initiatives/, TargetProjects/, Docs/)
```

Domain-layer initiatives create only the `{domain_prefix}` branch. No audience, phase, or workflow branches. Service/feature initiatives within this domain create their own topology.

**Service-Layer (single branch):**
```
main
└── {domain_prefix}-{service_prefix}              ← Service organizational branch (only branch)
    (Service.yaml, .gitkeep in initiatives/, TargetProjects/, Docs/)
```

**Feature/Microservice Layers (full topology):**
```
main
└── {featureBranchRoot}                           ← Initiative root (final merge target)
    ├── {featureBranchRoot}-small                 ← Small audience group
    │   └── {featureBranchRoot}-small-p1          ← Phase 1 (Analysis)
    │       └── ...-small-p1-{workflow}           ← Workflow branch
    ├── {featureBranchRoot}-medium                ← Medium audience group
    │   └── {featureBranchRoot}-medium-p2         ← Phase 2 (Planning)
    └── {featureBranchRoot}-large                 ← Large audience group
        ├── {featureBranchRoot}-large-p3          ← Phase 3 (Solutioning)
        └── {featureBranchRoot}-large-p4          ← Phase 4 (Implementation)
```

Where `{featureBranchRoot}` = `{domain_prefix}-{service_prefix}-{initiative_id}` (service parent) or `{domain_prefix}-{initiative_id}` (domain parent).

All branches use flat hyphen-separated names (no `/` separators). All branches pushed to remote immediately on creation. Phase branches (e.g., `-small-p1`) created by phase routers, not at init.

**Key design principle:** You can reconstruct the entire project lifecycle from the git log alone.

### Agent Responsibility Matrix

| Agent | Role | Trigger | Responsibility |
|-------|------|---------|----------------|
| **Compass** | Phase Router | User commands | Routes `/pre-plan` through `/dev`, detects layers, manages context switches, enforces role gates |
| **Casey** | Git Conductor | Auto-triggered | Creates/validates branches, commits state, pushes to remote — never invoked directly by users |
| **Tracey** | State Manager | User shortcodes | Reads/writes `state.yaml`, manages recovery, provides status, handles overrides and archival |
| **Scout** | Discovery Lead | User commands | Bootstraps repos, runs discovery scans, generates canonical docs, reconciles repo inventory |

---

## Lifecycle

### Phase Flow

The BMAD lifecycle progresses through five phases, each gated by explicit progression criteria:

```
P0 (Bootstrap)  →  P1 (Analysis)  →  P2 (Planning)  →  P3 (Solutioning)  →  P4 (Implementation)
   Scout               Compass           Compass            Compass              Compass
   onboard             /pre-plan          /spec              /plan                /dev
                                                             /review (gate)
```

| Phase | Name | Key Artifacts | Gate |
|-------|------|---------------|------|
| **P0** | Bootstrap | repo-inventory.yaml, bootstrap-report.md | Repos discovered & profiled |
| **P1** | Analysis | brainstorm-notes.md, product-brief.md | Product brief approved |
| **P2** | Planning | PRD, UX design docs | PRD approved |
| **P3** | Solutioning | Architecture doc, epics & stories | Implementation readiness check passed |
| **P4** | Implementation | Code, tests, deployments | Story acceptance criteria met |

### Gate Progression

Gates enforce quality and authorization between phases:

1. **Large Review** (`open-large-review`) — PO/Architect reviews phase artifacts before transition
2. **Final PBR** (`open-final-pbr`) — Full team review at solutioning completion
3. **Phase Transition** (`phase-transition`) — Automated state update when gate passes

### Review Audience Groups

| Audience | Phase | Branch Pattern | Reviewers |
|----------|-------|----------------|-----------|
| **small** | P1 (Analysis) | `{featureBranchRoot}-small` | Solo dev, 1 reviewer |
| **medium** | P2 (Planning) | `{featureBranchRoot}-medium` | Small team, 2-3 reviewers |
| **large** | P3/P4 (Solutioning/Implementation) | `{featureBranchRoot}-large` | Full team, formal gates |

Audience groups are created at `init-initiative` for feature/microservice layers. Phase branches (e.g., `-small-p1`) are created by phase routers.

> **Note:** Domain and service layers do not use audience groups. Domain creates only `{domain_prefix}`, service creates only `{domain_prefix}-{service_prefix}`.

---

## Commands

### Complete Command Reference

#### Phase Router Commands (Compass)

| Command | Agent | Description |
|---------|-------|-------------|
| `/pre-plan` | Compass | Launch Analysis phase (P1) — brainstorm, research, product brief |
| `/spec` | Compass | Launch Planning phase (P2) — PRD, UX design |
| `/plan` | Compass | Complete Solutioning (P3) — architecture, epics, stories |
| `/review` | Compass | Implementation readiness gate — SM/lead approval required |
| `/dev` | Compass | Implementation loop (P4) — sprint planning, story dev, code review |

#### Context Commands (Compass)

| Command | Agent | Description |
|---------|-------|-------------|
| `/switch` | Compass | Switch context — initiative, lens, phase, or size |
| `/context` | Compass | Display current context (active initiative, phase, size, workflow) |
| `/constitution` | Compass | Display operating rules and compliance constraints |
| `/lens` | Compass | Show or change the current lens focus |

#### Initiative Commands (Compass)

| Command | Agent | Description |
|---------|-------|-------------|
| `/new-domain` | Compass | Create domain-level initiative (multi-service, org-wide) |
| `/new-service` | Compass | Create service-level initiative (single service/API) |
| `/new-feature` | Compass | Create feature-level initiative (single feature within a service) |
| `#fix-story` | Compass | Correction loop — fix a story that failed review or has defects |

#### State & Recovery Commands (Tracey)

| Command | Agent | Description |
|---------|-------|-------------|
| `?` | Tracey | Quick status — one-line summary of current state |
| `ST` | Tracey | Full status — detailed initiative, phase, gate, and branch info |
| `RS` | Tracey | Resume — pick up where you left off after interruption |
| `SY` | Tracey | Sync — reconcile state.yaml with actual git branch state |
| `FX` | Tracey | Fix state — repair corrupted or inconsistent state |
| `OR` | Tracey | Override — manually set state values (advanced, use with caution) |
| `AR` | Tracey | Archive — archive completed or abandoned initiatives |

#### Discovery Commands (Scout)

| Command | Agent | Description |
|---------|-------|-------------|
| `onboard` | Scout | First-time setup — create profile, bootstrap target repos |
| `bootstrap` | Scout | Re-run bootstrap for new or changed repos |
| `discover` | Scout | Deep scan repos for tech stack, structure, patterns |
| `document` | Scout | Generate canonical docs from discovery data |
| `reconcile` | Scout | Reconcile repo inventory with service-map |
| `repo-status` | Scout | Check health/status of all managed repos |

### Role Gating

| Phase | Authorized Roles |
|-------|------------------|
| `#new-*` through `/plan` | PO, Architect, Tech Lead |
| `/review` | Scrum Master (gate owner) |
| `/dev` | Developer (post-review only) |

---

## Examples

### Starting a New Feature

```
# 1. Create the initiative
#new-feature "rate-limiting"

# Compass auto-detects layer, Casey creates and pushes 4 branches:
#   bmaddomain-lens-rate-limit-x7k2m9         (root)
#   bmaddomain-lens-rate-limit-x7k2m9-small   (small audience)
#   bmaddomain-lens-rate-limit-x7k2m9-medium  (medium audience)
#   bmaddomain-lens-rate-limit-x7k2m9-large   (large audience)

# 2. Begin analysis
/pre-plan
# → Creates and pushes -small-p1 phase branch
# → Guided through brainstorming, research, product brief
# → At end: PR from -small-p1 → -small, delete -small-p1, checkout -small

# 3. Move to planning
/spec
# → PRD creation, UX design

# 4. Complete solutioning
/plan
# → Architecture doc, epics & stories, implementation readiness

# 5. Gate review
/review
# → SM reviews artifacts, approves for implementation

# 6. Implement
/dev
# → Sprint planning, story development, code review cycles
```

### Switching Contexts

```
# Switch to a different initiative
/switch

# Compass presents active initiatives:
#   1. rate-limit-x7k2m9  (P3 - Solutioning)
#   2. auth-refactor-b3j1  (P1 - Analysis)
# Select: 2

# You're now in auth-refactor context
/context
# → Initiative: auth-refactor-b3j1 | Phase: P1 | Size: small
```

### Checking Status

```
# Quick check
@tracey ?
# → rate-limit-x7k2m9 | P3/Solutioning | small | architecture-doc in progress

# Full status
@tracey ST
# → Detailed breakdown with branch state, gate status, recent events

# Something looks wrong? Sync state with git
@tracey SY
```

### Full Lifecycle Walkthrough

```
# Bootstrap (first time only)
@scout onboard

# Discovery — learn about the repos
@scout discover
@scout document

# New initiative
#new-domain "payment-platform"
# → Sets up domain branch (payment-platform), creates Domain.yaml,
#   scaffolds domain folders (initiatives/, TargetProjects/, Docs/)
#   Only one branch created — no base/small/large/p1 branches

# Phase progression
/pre-plan     # P1: Analysis — brainstorm, research, brief
/spec         # P2: Planning — PRD, UX
/plan         # P3: Solutioning — architecture, stories
/review       # Gate: SM approval
/dev          # P4: Implementation — sprint loop

# When done
@tracey AR    # Archive the completed initiative
```

---

## Installation

```bash
bmad install lens-work
```

### Configuration

During installation, you'll be prompted for:

| Setting | Description | Default |
|---------|-------------|---------|
| `target_projects_path` | Path to TargetProjects folder | `../TargetProjects` |
| `docs_output_path` | Path for canonical docs | `Docs` |
| `enable_telemetry` | Enable dashboards | `true` |
| `default_git_remote` | Git remote type | `github` |

---

## Operating Rules

### Control-Plane Rule

**All lens-work commands execute from the BMAD directory (control repo).**

- Users never `cd` into TargetProjects repos
- Repo operations run against TargetProjects paths programmatically
- Planning artifacts remain in the BMAD control repo

### Git Discipline

Every workflow that mutates state enforces:

1. **Step 0 (START):** Verify clean working directory → checkout correct branch → pull from origin
2. **Final Step (END):** Stage changes → targeted commit with initiative/phase/workflow context → push

This ensures clean audit trails and prevents uncommitted state drift.

---

## Migration

For upgrading from earlier lens-work versions, see `docs/migration-guide.md`. The migration guide covers:

- State file format changes
- Branch topology updates
- New workflow registration
- Prompt file additions

---

## File Structure

```
lens-work/
├── module.yaml                          # Module configuration & registry
├── README.md                            # This file
├── service-map.yaml                     # Target repo mapping
│
├── agents/
│   ├── compass.agent.yaml               # Phase router agent
│   ├── casey.agent.yaml                 # Git conductor agent
│   ├── tracey.agent.yaml               # State manager agent
│   └── scout.agent.yaml                # Discovery & bootstrap agent
│
├── workflows/
│   ├── core/                            # Auto-triggered lifecycle operations
│   │   ├── init-initiative/             # Initialize new initiative
│   │   ├── start-workflow/              # Begin a workflow within a phase
│   │   ├── finish-workflow/             # Complete a workflow
│   │   ├── detect-layer/               # Auto-detect initiative layer
│   │   ├── phase-transition/           # Transition between phases
│   │   ├── start-phase/                # Begin a new phase
│   │   ├── finish-phase/               # Complete a phase
│   │   ├── open-large-review/           # Open large review gate
│   │   └── open-final-pbr/             # Open final PBR gate
│   │
│   ├── router/                          # Phase router commands (user-facing)
│   │   ├── pre-plan/                    # /pre-plan → P1 Analysis
│   │   ├── spec/                        # /spec → P2 Planning
│   │   ├── plan/                        # /plan → P3 Solutioning
│   │   ├── review/                      # /review → Gate
│   │   ├── dev/                         # /dev → P4 Implementation
│   │   └── init-initiative/             # Router-level initiative init
│   │
│   ├── discovery/                       # Repo discovery & documentation
│   │   ├── repo-discover/               # Deep scan repos
│   │   ├── repo-document/               # Generate canonical docs
│   │   ├── repo-reconcile/              # Reconcile inventory
│   │   └── repo-status/                 # Check repo health
│   │
│   ├── utility/                         # Manual/support workflows
│   │   ├── status/                      # ST — full status
│   │   ├── resume/                      # RS — resume workflow
│   │   ├── sync/                        # SY — sync state
│   │   ├── fix-state/                   # FX — fix corrupted state
│   │   ├── override/                    # OR — manual override
│   │   ├── archive/                     # AR — archive initiative
│   │   ├── bootstrap/                   # Bootstrap repos
│   │   ├── onboarding/                  # First-time setup
│   │   ├── setup-rollback/              # Rollback setup
│   │   ├── fix-story/                   # Correction loop
│   │   ├── switch/                      # Context switching
│   │   ├── check-repos/                 # Validate repo state
│   │   └── migrate-state/              # Migrate state format
│   │
│   └── includes/                        # Shared reference files
│       ├── size-topology.md             # Size & branch rules
│       ├── jira-integration.md          # Jira workflow mapping
│       ├── gate-event-template.md       # Gate event format
│       ├── pr-links.md                  # PR linking conventions
│       ├── docs-path.md                 # Documentation path rules
│       └── artifact-validator.md        # Artifact validation rules
│
├── prompts/                             # Entry-point prompt files
│   ├── lens-work.start.prompt.md
│   ├── lens-work.compass.prompt.md
│   ├── lens-work.pre-plan.prompt.md
│   ├── lens-work.spec.prompt.md
│   ├── lens-work.plan.prompt.md
│   ├── lens-work.review.prompt.md
│   ├── lens-work.dev.prompt.md
│   ├── lens-work.new-domain.prompt.md
│   ├── lens-work.new-service.prompt.md
│   ├── lens-work.new-feature.prompt.md
│   ├── lens-work.fix-story.prompt.md
│   ├── lens-work.switch.prompt.md
│   ├── lens-work.context.prompt.md
│   ├── lens-work.constitution.prompt.md
│   ├── lens-work.compliance.prompt.md
│   ├── lens-work.focus.prompt.md
│   ├── lens-work.lens.prompt.md
│   ├── lens-work.status.prompt.md
│   ├── lens-work.resume.prompt.md
│   ├── lens-work.sync.prompt.md
│   ├── lens-work.fix.prompt.md
│   ├── lens-work.override.prompt.md
│   ├── lens-work.archive.prompt.md
│   ├── lens-work.onboard.prompt.md
│   ├── lens-work.bootstrap.prompt.md
│   ├── lens-work.discover.prompt.md
│   ├── lens-work.document.prompt.md
│   ├── lens-work.reconcile.prompt.md
│   ├── lens-work.repo-status.prompt.md
│   └── lens-work.rollback.prompt.md
│
├── docs/                                # Documentation
│   ├── migration-guide.md
│   ├── branch-protection.md
│   ├── ci-integration.md
│   ├── hotfix-release-strategy.md
│   └── multi-repo-initiatives.md
│
├── tests/                               # Test specifications
│   └── lens-work-tests.spec.md
│
├── scripts/                             # Validation & utility scripts
│   ├── validate-lens-work.ps1
│   └── sync-prompts.ps1
│
└── _module-installer/                   # BMAD module installer
    └── installer.js
```

---

## Outputs

### State & Logs

| File | Purpose |
|------|---------|
| `_bmad-output/lens-work/settings.json` | Centralized configuration — GitHub repo, user preferences, system state |
| `_bmad-output/lens-work/state.yaml` | Current initiative context and phase state |
| `_bmad-output/lens-work/event-log.jsonl` | Append-only lifecycle event audit trail |
| `_bmad-output/lens-work/repo-inventory.yaml` | Discovered repo metadata |
| `_bmad-output/lens-work/bootstrap-report.md` | Bootstrap scan results |
| `_bmad-output/lens-work/initiatives/` | Per-initiative artifacts and state |
| `_bmad-output/lens-work/initiatives/{domain}/Domain.yaml` | Domain-layer initiative config (domain-layer only) |
| `_bmad-output/lens-work/dashboards/` | Telemetry dashboard data |
| `_bmad-output/personal/profile.yaml` | User profile and preferences |

### Canonical Docs

```
Docs/{domain}/{service}/{repo}/
├── project-context.md
└── current-state.tech-spec.md
```

---

## Dependencies

**Required:**
- **BMM** — Core workflow execution (planning → implementation lifecycle)
- **BMAD Core** — Infrastructure, resource management, task library

**Optional:**
- **CIS** — Creative Innovation Suite (brainstorming, research, design thinking)
- **TEA** — Test Engineering Academy (test planning, QA strategy)

---

## Author

Created via BMAD Module workflow on 2026-02-03.

---

_lens-work — Guided lifecycle orchestration for BMAD_
