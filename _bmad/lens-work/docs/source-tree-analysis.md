# Source Tree Analysis — LENS Workbench Module (lens-work)

> ⚠️ **Partial Update Notice (v4.0):** File tree snapshot is from v3.2. New skills, prompts, and workflows added in v4.0 are not reflected here. See `module.yaml` for the current manifest.

**Generated:** 2026-04-01 | **Scan Level:** Deep | **Module Version:** 4.0.0

---

## Complete Annotated Directory Tree

```
lens-work/                              # Module root
├── .claude-plugin/                     # Distribution manifest
│   └── marketplace.json                #   Claude marketplace descriptor
├── .gitattributes                      # Git line-ending and diff config
│
├── lifecycle.yaml                      # ★ THE CONTRACT — single source of truth for all lifecycle behavior
├── module.yaml                         # ★ Module metadata, skills/workflows registry, install questions
├── bmadconfig.yaml                     # ★ Runtime configuration template (variable resolution)
├── module-help.csv                     # Command index (13-column, 32 entries)
├── README.md                           # User-facing module documentation
├── TODO.md                             # Development checklist / roadmap
│
├── agents/                             # BMAD agent definitions
│   ├── lens.agent.md                   #   ★ Runtime agent source (@lens persona, 22-item menu)
│   └── lens.agent.yaml                 #   Validator-compatible structured companion
│
├── skills/                             # 5 core delegation skills
│   ├── git-state/                      #   Read-only: derive initiative state from git primitives
│   │   └── SKILL.md                    #     current-initiative, current-phase, phase-status queries
│   ├── git-orchestration/              #   Write: branch creation, commits, pushes, PR management
│   │   └── SKILL.md                    #     create-branch, create-milestone-branch, commit-artifacts
│   ├── constitution/                   #   Read-only: 4-level governance resolution and compliance
│   │   └── SKILL.md                    #     resolve-constitution, check-compliance, resolve-context
│   ├── sensing/                        #   Read-only: cross-initiative overlap detection
│   │   └── SKILL.md                    #     two-pass (live branches + historical), overlap classification
│   └── checklist/                      #   Read-only: phase gate validation
│       └── SKILL.md                    #     evaluate-phase-gate, evaluate-promotion-gate
│
├── workflows/                          # 35 workflows across 4 categories
│   ├── core/                           # [3] Infrastructure workflows
│   │   ├── phase-lifecycle/            #   Phase start/end, phase-to-milestone PR
│   │   │   ├── SKILL.md
│   │   │   ├── workflow.md
│   │   │   ├── steps/                  #     step-01-*, step-02-*, ...
│   │   │   └── resources/              #     Templates, validation schemas
│   │   ├── audience-promotion/         #   Audience→audience PR with gate + sensing
│   │   │   ├── SKILL.md
│   │   │   ├── workflow.md
│   │   │   ├── steps/
│   │   │   └── resources/
│   │   └── milestone-promotion/        #   Milestone branch creation + promotion
│   │       ├── SKILL.md
│   │       ├── workflow.md
│   │       ├── steps/
│   │       └── resources/
│   │
│   ├── router/                         # [11] User-facing phase workflows
│   │   ├── init-initiative/            #   /new-domain, /new-service, /new-feature
│   │   │   ├── SKILL.md
│   │   │   ├── workflow.md
│   │   │   ├── steps/
│   │   │   │   ├── step-01-preflight.md
│   │   │   │   ├── step-02-collect-scope.md
│   │   │   │   ├── step-03-validate-and-sense.md
│   │   │   │   ├── step-04-create-initiative.md
│   │   │   │   └── step-05-respond.md
│   │   │   └── resources/
│   │   ├── preplan/                    #   /preplan — brainstorm, research, product brief
│   │   ├── businessplan/               #   /businessplan — PRD creation, UX design
│   │   ├── techplan/                   #   /techplan — architecture, technical decisions
│   │   ├── devproposal/                #   /devproposal — epics, stories, readiness
│   │   ├── sprintplan/                 #   /sprintplan — sprint status, story files
│   │   ├── expressplan/                #   /expressplan — combined plan for express track
│   │   ├── dev/                        #   /dev — delegate to implementation agents
│   │   ├── discover/                   #   /discover — repo discovery, governance bootstrap
│   │   ├── retrospective/              #   /retrospective — post-initiative review
│   │   └── close/                      #   /close — complete/abandon/supersede initiative
│   │
│   ├── utility/                        # [17] Operational support workflows
│   │   ├── onboard/                    #   /onboard — bootstrap profile, auth, governance
│   │   ├── status/                     #   /status — git-derived initiative state report
│   │   ├── next/                       #   /next — recommend next action
│   │   ├── switch/                     #   /switch — checkout different initiative
│   │   ├── help/                       #   /help — command reference
│   │   ├── promote/                    #   /promote — advance milestone tier
│   │   ├── module-management/          #   /module-management — version + update
│   │   ├── upgrade/                    #   /lens-upgrade — migrate control repo schema
│   │   ├── dashboard/                  #   /dashboard — multi-initiative Gantt + blocking PRs
│   │   ├── log-problem/                #   /log-problem — record issues/blockers
│   │   ├── move-feature/               #   /move-feature — relocate feature between initiatives
│   │   ├── split-feature/              #   /split-feature — split feature into sub-initiatives
│   │   ├── approval-status/            #   /approval-status — check PR approval state
│   │   ├── pause-epic/                 #   /pause-epic — pause active epic work
│   │   ├── resume-epic/                #   /resume-epic — resume paused epic
│   │   ├── rollback-phase/             #   /rollback-phase — revert to previous phase
│   │   └── profile/                    #   /profile — user profile management
│   │
│   ├── governance/                     # [4] Compliance & cross-initiative workflows
│   │   ├── audit-all/                  #   /audit-all — audit all active initiatives
│   │   ├── compliance-check/           #   Phase gate compliance validation
│   │   ├── cross-initiative/           #   /sense — on-demand overlap detection
│   │   └── resolve-constitution/       #   /constitution — constitutional resolution
│   │
│   └── includes/                       # Shared reusable includes
│       └── preflight.md                #   Common preflight checks (context, config, lifecycle)
│
├── prompts/                            # 32 user-facing prompt trigger files
│   ├── lens-work.new-initiative.prompt.md
│   ├── lens-work.preplan.prompt.md
│   ├── lens-work.businessplan.prompt.md
│   ├── lens-work.techplan.prompt.md
│   ├── lens-work.devproposal.prompt.md
│   ├── lens-work.sprintplan.prompt.md
│   ├── lens-work.expressplan.prompt.md
│   ├── lens-work.dev.prompt.md
│   ├── lens-work.discover.prompt.md
│   ├── lens-work.close.prompt.md
│   ├── lens-work.retrospective.prompt.md
│   ├── lens-work.onboard.prompt.md
│   ├── lens-work.status.prompt.md
│   ├── lens-work.next.prompt.md
│   ├── lens-work.switch.prompt.md
│   ├── lens-work.help.prompt.md
│   ├── lens-work.promote.prompt.md
│   ├── lens-work.sense.prompt.md
│   ├── lens-work.constitution.prompt.md
│   ├── lens-work.module-management.prompt.md
│   ├── lens-work.upgrade.prompt.md
│   ├── lens-work.compliance-check.prompt.md
│   ├── lens-work.setup-repo.prompt.md
│   ├── lens-work.log-problem.prompt.md
│   ├── lens-work.move-feature.prompt.md
│   ├── lens-work.split-feature.prompt.md
│   ├── lens-work.approval-status.prompt.md
│   ├── lens-work.pause-epic.prompt.md
│   ├── lens-work.resume-epic.prompt.md
│   ├── lens-work.rollback-phase.prompt.md
│   ├── lens-work.profile.prompt.md
│   └── lens-work.audit-all-initiatives.prompt.md
│
├── scripts/                            # Cross-platform operational scripts (15 pairs)
├── scripts/                            # Cross-platform Python scripts
│   ├── install.py                     #   ★ Module installer (IDE adapter bootstrap)
│   ├── create-pr.py                   #   PR creation via REST API (no gh CLI)
│   ├── setup-control-repo.py          #  Control repo bootstrap
│   ├── store-github-pat.py            #  PAT management (outside AI context)
│   ├── bootstrap-target-projects.py   #  Target project scaffolding
│   ├── derive-initiative-status.py    #  Git-derived initiative state
│   ├── derive-next-action.py          #  Next action recommendation
│   ├── load-command-registry.py       #  Command registry loader
│   ├── plan-lifecycle-renames.py      #  Lifecycle rename planning
│   ├── preflight.py                   #  Preflight validation checks
│   ├── run-preflight-cached.py        #  Cached preflight execution
│   ├── scan-active-initiatives.py     #  Active initiative scanner
│   ├── validate-feature-move.py       #  Feature move validation
│   ├── validate-lens-bmad-registry.py #  BMAD registry validator
│   └── validate-phase-artifacts.py    #  Phase artifact validation
│
├── docs/                               # Reference documentation (22 files)
│   ├── index.md                        #   Documentation index / table of contents
│   ├── GETTING-STARTED.md              #   Quick-start guide
│   ├── project-overview.md             #   Generated: project overview
│   ├── architecture.md                 #   Generated: architecture document
│   ├── lifecycle-reference.md          #   Human-readable lifecycle schema reference
│   ├── lifecycle-visual-guide.md       #   Visual diagrams for lifecycle flow
│   ├── whats-new.md                    #   Version changelog / what's new
│   ├── component-inventory.md          #   Detailed component breakdown
│   ├── source-tree-analysis.md         #   Annotated directory tree (this file)
│   ├── development-guide.md            #   Developer contributing guide
│   ├── onboarding-checklist.md         #   Team onboarding checklist
│   ├── preflight-strategy.md           #   Preflight check strategy doc
│   ├── configuration-examples.md       #   Configuration usage examples
│   ├── copilot-adapter-reference.md    #   Copilot adapter architecture
│   ├── copilot-adapter-templates.md    #   IDE adapter file templates
│   ├── copilot-instructions.md         #   Copilot runtime instructions
│   ├── copilot-repo-instructions.md    #   Repo-level Copilot instructions
│   ├── lex-persona.md                  #   Constitutional governance voice definition
│   ├── pipeline-source-to-release.md   #   CI/CD promotion workflow docs
│   ├── script-integration.md           #   Script invocation patterns
│   ├── v3.1-improvements.md            #   Release notes for v3.1
│   └── project-scan-report.json        #   Scan state file
│
├── tests/                              # Contract test specifications
│   └── contracts/
│       ├── branch-parsing.md           #   git-state branch parsing test cases (20+)
│       ├── governance.md               #   Constitutional governance rules
│       ├── provider-adapter.md         #   GitHub/Azure DevOps adapter interface
│       └── sensing.md                  #   Overlap detection test cases
│
├── assets/                             # Template assets
│   └── templates/                      #   Workflow resource templates
│
├── _module-installer/                  # CI/CD installer
│   └── installer.js                    #   Node.js installer (fs module only, no npm deps)
│
└── bmad-lens-work-setup/               # Legacy setup workflow (backward compat)
    ├── SKILL.md
    ├── scripts/
    │   ├── merge-config.py             #   Python config merge utility
    │   ├── merge-help-csv.py           #   Python help CSV merge utility
    │   └── cleanup-legacy.py           #   Python cleanup utility
    └── assets/
        ├── module.yaml
        └── module-help.csv
```

---

## Critical Folders Summary

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `/` (root) | Module root with contract files | `lifecycle.yaml`, `module.yaml`, `bmadconfig.yaml` |
| `agents/` | Single agent with dual representation | `lens.agent.md` (runtime), `lens.agent.yaml` (validator) |
| `skills/` | 5 core delegation skills | Each skill is a folder with `SKILL.md` |
| `workflows/core/` | Infrastructure workflows | phase-lifecycle, audience-promotion, milestone-promotion |
| `workflows/router/` | User-facing phase flows | 11 workflows mapping to lifecycle phases |
| `workflows/utility/` | Operational commands | onboard, status, next, switch, help, promote, etc. (17 workflows) |
| `workflows/governance/` | Compliance workflows | audit-all, compliance-check, cross-initiative, resolve-constitution |
| `prompts/` | IDE prompt triggers | 32 `.prompt.md` files for VS Code/Copilot |
| `scripts/` | Cross-platform scripts | Python scripts (.py) |
| `docs/` | Reference documentation | 22 files: guides, references, release notes, scan report |
| `tests/contracts/` | Contract test specs | 4 markdown-based specification files |

---

## Entry Points

| Entry | File | Type | Trigger |
|-------|------|------|---------|
| Module installer | `scripts/install.py` | Script | First-time module installation |
| Control repo setup | `scripts/setup-control-repo.py` | Script | Bootstrap governance clone |
| PAT setup | `scripts/store-github-pat.py` | Script | Auth setup (outside AI context) |
| Agent activation | `agents/lens.agent.md` | Agent def | `@lens` invocation in IDE |
| CI/CD installer | `_module-installer/installer.js` | Node.js | Pipeline build step |
| Any prompt | `prompts/lens-work.*.prompt.md` | Prompt | IDE prompt selection |
