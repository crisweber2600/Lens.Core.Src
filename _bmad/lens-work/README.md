# LENS Workbench (lens-work)

**Version 2.0.0** — Lifecycle Contract with Named Phases

**Guided lifecycle router with git-orchestrated discipline for BMAD workflows.**

---

## Overview

LENS Workbench transforms BMAD from a "large framework you must learn" into a **guided system people can use immediately**. It acts as the front door to BMAD by providing:

- **Phase Router Commands** — `/preplan`, `/businessplan`, `/techplan`, `/devproposal`, `/sprintplan`, `/dev`
- **Automated Git Orchestration** — Branch topology mirrors lifecycle phases and audiences
- **Layer-Aware Context** — Auto-detects org/domain/service/repo layers
- **Repo Discovery & Documentation** — Inventories and documents repos before planning
- **Lifecycle Telemetry** — Tracks phase progress with dashboard visibility
- **Context Switching** — Seamlessly move between initiatives, lenses, and phases

**The architectural differentiator:** Git history becomes the process tracker — branch topology mirrors BMAD phases, so you can see where you are just by looking at branches.

---

## Copilot Integration

LENS Workbench is designed for **GitHub Copilot Chat integration** in BMAD control repos. When installed, the module includes comprehensive Copilot guidance:

- **Documentation:** [Copilot Instructions](docs/copilot-instructions.md) — How to work effectively with Copilot in BMAD repos
- **Agent Loading:** Copilot loads the unified `@lens` agent, which delegates to internal skills (git-orchestration, state-management, discovery, constitution, checklist)
- **Workflow Guidance:** Copilot provides context for phase routing, git operations, and state management
- **Command Reference:** See `.github/prompts/` for prompt files used by phase routing commands

**Start here:** Load LENS in Copilot Chat (`@lens`) and run `/preplan` to bootstrap your repository.

---

## Architecture

### Two-File State Architecture

LENS Workbench maintains all runtime state in exactly two files — no database, no external services:

```
_bmad-output/lens-work/
├── state.yaml          ← Current initiative context, phase, audience, track, gate status
└── event-log.jsonl     ← Append-only audit trail of every lifecycle event
```

**`state.yaml`** is the single source of truth for "where are we now?" — active initiative, current phase, audience, track, workflow status, and gate progression. Every workflow reads it at start and writes it at end.

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

**Feature/Repo Layers (full topology):**
```
main
└── {initiative_root}                              ← Initiative root
    ├── {initiative_root}-small                    ← Small audience (IC creation)
    │   ├── {initiative_root}-small-preplan        ← PrePlan phase
    │   │   └── ...-small-preplan-{workflow}       ← Workflow branch
    │   ├── {initiative_root}-small-businessplan   ← BusinessPlan phase
    │   └── {initiative_root}-small-techplan       ← TechPlan phase
    ├── {initiative_root}-medium                   ← Medium audience (lead review)
    │   └── {initiative_root}-medium-devproposal   ← DevProposal phase
    ├── {initiative_root}-large                    ← Large audience (stakeholder)
    │   └── {initiative_root}-large-sprintplan     ← SprintPlan phase
    └── base                                       ← Execution target
```

Where `{initiative_root}` = `{domain_prefix}-{service_prefix}-{initiative_id}` (service parent) or `{domain_prefix}-{initiative_id}` (domain parent).

All branches use flat hyphen-separated names (no `/` separators). All branches pushed to remote immediately on creation. Phase branches (e.g., `-small-preplan`) created by phase routers, not at init.

**Key design principle:** You can reconstruct the entire project lifecycle from the git log alone.

### Skill Responsibility Matrix

The unified `@lens` agent delegates to internal skills:

| Skill | Role | Trigger | Responsibility |
|-------|------|---------|----------------|
| **@lens** (router) | Phase Router | User commands | Routes `/preplan` through `/dev`, manages tracks, context switches, audience promotions |
| **git-orchestration** | Git Conductor | Auto-triggered | Creates/validates branches, commits state, pushes to remote — never invoked directly by users |
| **state-management** | State Manager | User shortcodes | Reads/writes `state.yaml`, manages recovery, provides status, handles overrides and archival |
| **discovery** | Discovery Lead | User commands | Bootstraps repos, runs discovery scans, generates canonical docs, reconciles repo inventory |
| **constitution** | Constitutional Guardian | Auto-triggered | 4-level governance (org/domain/service/repo), track enforcement, compliance checks |

---

## Lifecycle

### Phase Flow

The lifecycle uses named phases grouped by audience level, with promotion gates between audiences:

```
Small Audience (IC creation):
  PrePlan (Mary) → BusinessPlan (John+Sally) → TechPlan (Winston)
         ↓ [adversarial review gate — party mode]
Medium Audience (lead review):
  DevProposal (John)
         ↓ [stakeholder approval gate]
Large Audience (stakeholder):
  SprintPlan (Bob)
         ↓ [constitution gate — @lens]
Base (execution):
  Dev → Code Review → Retro
```

| Phase | Agent | Audience | Key Artifacts | Promotion Gate |
|-------|-------|----------|---------------|----------------|
| **PrePlan** | Mary/Analyst | small | brainstorm-notes, product-brief | — |
| **BusinessPlan** | John/PM + Sally/UX | small | PRD, UX design | — |
| **TechPlan** | Winston/Architect | small | Architecture, tech decisions, API contracts | adversarial review (→medium) |
| **DevProposal** | John/PM | medium | Epics, stories, readiness checklist | stakeholder approval (→large) |
| **SprintPlan** | Bob/SM | large | Sprint plan, story assignments | constitution gate (→base) |
| **Dev** | Dev Team | base | Code, tests, deployments | — |

### Initiative Tracks

Tracks control which phases are required (defined in `lifecycle.yaml`):

| Track | Phases | Use Case |
|-------|--------|----------|
| `full` | preplan → businessplan → techplan → devproposal → sprintplan | New product/major initiative |
| `feature` | businessplan → techplan → devproposal → sprintplan | Feature addition |
| `tech-change` | techplan → sprintplan | Technical migration/upgrade |
| `hotfix` | techplan only | Critical bug fix |
| `spike` | preplan only | Research/exploration |
| `quickdev` | techplan → devproposal | Rapid execution with parity verification (small → medium) |

### Audience Promotion Gates

| Promotion | Gate Type | Mechanism |
|-----------|-----------|-----------|
| small → medium | Adversarial Review | Party-mode cross-agent review |
| medium → large | Stakeholder Approval | PR approval from stakeholders |
| large → base | Constitution Gate | Constitution skill compliance check (4-level) |

Audience branches are created at `init-initiative`. Phase branches (e.g., `-small-preplan`) are created by phase routers.

> **Note:** Domain and service layers do not use audience groups. Domain creates only `{domain_prefix}`, service creates only `{domain_prefix}-{service_prefix}`.

---

## Commands

### Complete Command Reference

#### Phase Router Commands (@lens)

| Command | Phase | Audience | Agent | Description |
|---------|-------|----------|-------|-------------|
| `/preplan` | PrePlan | small | Mary/Analyst | Brainstorm, research, product brief |
| `/businessplan` | BusinessPlan | small | John/PM + Sally/UX | PRD, UX design |
| `/techplan` | TechPlan | small | Winston/Architect | Architecture, tech decisions, API contracts |
| `/promote` | — | — | @lens | Audience promotion gate |
| `/devproposal` | DevProposal | medium | John/PM | Epics, stories, readiness checklist |
| `/sprintplan` | SprintPlan | large | Bob/SM | Sprint planning, story selection |
| `/dev` | Dev | base | Dev Team | Sprint execution, code review, retro |

**Aliases:** `/pre-plan`→`/preplan`, `/spec`→`/businessplan`, `/tech-plan`→`/techplan`, `/plan`→`/devproposal`, `/review`→`/sprintplan`

#### Context Commands (@lens)

| Command | Agent | Description |
|---------|-------|-------------|
| `/switch` | @lens | Switch context — initiative, lens, phase, or size |
| `/context` | @lens | Display current context (active initiative, phase, size, workflow) |
| `/constitution` | @lens | Display operating rules and compliance constraints |
| `/lens` | @lens | Show or change the current lens focus |

#### Initiative Commands (@lens)

| Command | Agent | Description |
|---------|-------|-------------|
| `/new-domain` | @lens | Create domain-level initiative (multi-service, org-wide) |
| `/new-service` | @lens | Create service-level initiative (single service/API) |
| `/new-feature` | @lens | Create feature-level initiative (single feature within a service) |
| `#fix-story` | @lens | Correction loop — fix a story that failed review or has defects |

#### State & Recovery Commands (@lens)

| Command | Skill | Description |
|---------|-------|-------------|
| `?` | state-management | Quick status — one-line summary of current state |
| `ST` | state-management | Full status — detailed initiative, phase, gate, and branch info |
| `RS` | state-management | Resume — pick up where you left off after interruption |
| `SY` | state-management | Sync — reconcile state.yaml with actual git branch state |
| `FX` | state-management | Fix state — repair corrupted or inconsistent state |
| `OR` | state-management | Override — manually set state values (advanced, use with caution) |
| `AR` | state-management | Archive — archive completed or abandoned initiatives |

#### Discovery Commands (@lens)

| Command | Skill | Description |
|---------|-------|-------------|
| `onboard` | discovery | First-time setup — create profile, bootstrap target repos |
| `bootstrap` | discovery | Re-run bootstrap for new or changed repos |
| `discover` | discovery | Deep scan repos for tech stack, structure, patterns |
| `document` | discovery | Generate canonical docs from discovery data |
| `reconcile` | discovery | Reconcile repo inventory with service-map |
| `repo-status` | discovery | Check health/status of all managed repos |

### Role Gating

| Phase | Authorized Roles |
|-------|------------------|
| `#new-*` through `/techplan` | PO, Architect, Tech Lead |
| `/devproposal` | PM, Architect |
| `/sprintplan` | Scrum Master (gate owner) |
| `/dev` | Developer (post-sprintplan only) |

---

## Examples

### Starting a New Feature

```
# 1. Create the initiative (select track: feature)
#new-feature "rate-limiting"

# @lens auto-detects layer, git-orchestration creates and pushes branches:
#   bmaddomain-lens-rate-limit-x7k2m9         (root)
#   bmaddomain-lens-rate-limit-x7k2m9-small   (small audience)
#   bmaddomain-lens-rate-limit-x7k2m9-medium  (medium audience)
#   bmaddomain-lens-rate-limit-x7k2m9-large   (large audience)

# 2. Begin planning (feature track starts at businessplan)
/businessplan
# → Creates -small-businessplan phase branch
# → Guided through PRD, UX design
# → At end: PR from -small-businessplan → -small

# 3. Technical planning
/techplan
# → Architecture, tech decisions, API contracts

# 4. Promote audience: small → medium
/promote
# → Adversarial review (party mode) gate

# 5. Dev proposal
/devproposal
# → Creates -medium-devproposal phase branch
# → Epics, stories, readiness checklist

# 6. Promote: medium → large, then sprint plan
/promote
/sprintplan
# → Sprint planning, story selection

# 7. Promote: large → base, then implement
/promote
/dev
# → Sprint execution, code review, retro cycles
```

### Switching Contexts

```
# Switch to a different initiative
/switch

# @lens presents active initiatives:
#   1. rate-limit-x7k2m9  (DevProposal - medium)
#   2. auth-refactor-b3j1  (PrePlan - small)
# Select: 2

# You're now in auth-refactor context
/context
# → Initiative: auth-refactor-b3j1 | Phase: PrePlan | Audience: small | Track: full
```

### Checking Status

```
# Quick check
@lens ?
# → rate-limit-x7k2m9 | DevProposal | medium | track:full | epics in progress

# Full status
@lens ST
# → Detailed breakdown with branch state, gate status, recent events

# Something looks wrong? Sync state with git
@lens SY
```

### Full Lifecycle Walkthrough

```
# Bootstrap (first time only)
@lens onboard

# Discovery — learn about the repos
@lens discover
@lens document

# New initiative
#new-domain "payment-platform"
# → Sets up domain branch (payment-platform), creates Domain.yaml,
#   scaffolds domain folders (initiatives/, TargetProjects/, Docs/)
#   Only one branch created — no base/small/large/phase branches

# Phase progression (full track)
/preplan        # PrePlan: brainstorm, research, brief
/businessplan   # BusinessPlan: PRD, UX
/techplan       # TechPlan: architecture, tech decisions
/promote        # small → medium (adversarial review)
/devproposal    # DevProposal: epics, stories, readiness
/promote        # medium → large (stakeholder approval)
/sprintplan     # SprintPlan: sprint planning
/promote        # large → base (constitution gate)
/dev            # Dev: sprint execution loop

# When done
@lens AR    # Archive the completed initiative
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
├── skills/                              # @lens agent skill definitions
│   ├── checklist.md                     # Progressive phase gate checklists
│   ├── constitution.md                  # Inline governance checks
│   ├── discovery.md                     # Repo scanning & doc generation
│   ├── git-orchestration.md             # Branch operations & git discipline
│   └── state-management.md             # Two-file state system management
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
│   │   ├── pre-plan/                    # /preplan → PrePlan (small)
│   │   ├── spec/                        # /businessplan → BusinessPlan (small)
│   │   ├── tech-plan/                   # /techplan → TechPlan (small)
│   │   ├── plan/                        # /devproposal → DevProposal (medium)
│   │   ├── sprintplan/                  # /sprintplan → SprintPlan (large)
│   │   ├── review/                      # /review → (alias for /sprintplan)
│   │   ├── dev/                         # /dev → Dev (base)
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
│   ├── lens-work.businessplan.prompt.md
│   ├── lens-work.constitution.prompt.md
│   ├── lens-work.devproposal.prompt.md
│   ├── lens-work.discovery.prompt.md
│   ├── lens-work.fix.prompt.md
│   ├── lens-work.new-initiative.prompt.md
│   ├── lens-work.onboard.prompt.md
│   ├── lens-work.preplan.prompt.md
│   ├── lens-work.promote-base.prompt.md
│   ├── lens-work.promote-large.prompt.md
│   ├── lens-work.promote-medium.prompt.md
│   ├── lens-work.sprintplan.prompt.md
│   ├── lens-work.start.prompt.md
│   ├── lens-work.status.prompt.md
│   ├── lens-work.switch.prompt.md
│   ├── lens-work.sync.prompt.md
│   ├── lens-work.techplan.prompt.md
│   └── lens-work.impl-*.prompt.md       # Implementation-detail prompts (~20 files)
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
