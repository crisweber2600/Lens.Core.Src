# Source Tree Analysis — LENS Workbench Module (lens-work)

**Generated:** 2026-04-01 | **Scan Level:** Deep | **Module Version:** 3.1.0

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
├── module-help.csv                     # Command index (13-column, 21 entries)
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
├── workflows/                          # 24 workflows across 4 categories
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
│   ├── router/                         # [9] User-facing phase workflows
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
│   │   ├── dev/                        #   /dev — delegate to implementation agents
│   │   ├── discover/                   #   /discover — repo discovery, governance bootstrap
│   │   └── close/                      #   /close — complete/abandon/supersede initiative
│   │
│   ├── utility/                        # [9] Operational support workflows
│   │   ├── onboard/                    #   /onboard — bootstrap profile, auth, governance
│   │   ├── status/                     #   /status — git-derived initiative state report
│   │   ├── next/                       #   /next — recommend next action
│   │   ├── switch/                     #   /switch — checkout different initiative
│   │   ├── help/                       #   /help — command reference
│   │   ├── promote/                    #   /promote — advance milestone tier
│   │   ├── module-management/          #   /module-management — version + update
│   │   ├── upgrade/                    #   /lens-upgrade — migrate control repo schema
│   │   └── dashboard/                  #   /dashboard — multi-initiative Gantt + blocking PRs
│   │
│   ├── governance/                     # [3] Compliance & cross-initiative workflows
│   │   ├── compliance-check/           #   Phase gate compliance validation
│   │   ├── cross-initiative/           #   /sense — on-demand overlap detection
│   │   └── resolve-constitution/       #   /constitution — constitutional resolution
│   │
│   └── includes/                       # Shared reusable includes
│       └── preflight.md                #   Common preflight checks (context, config, lifecycle)
│
├── prompts/                            # 22 user-facing prompt trigger files
│   ├── lens-work.new-initiative.prompt.md
│   ├── lens-work.preplan.prompt.md
│   ├── lens-work.businessplan.prompt.md
│   ├── lens-work.techplan.prompt.md
│   ├── lens-work.devproposal.prompt.md
│   ├── lens-work.sprintplan.prompt.md
│   ├── lens-work.dev.prompt.md
│   ├── lens-work.discover.prompt.md
│   ├── lens-work.close.prompt.md
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
│   └── (additional prompts)
│
├── scripts/                            # Cross-platform operational scripts
│   ├── install.sh / install.ps1        #   ★ Module installer (IDE adapter bootstrap)
│   ├── create-pr.sh / create-pr.ps1    #   PR creation via REST API (no gh CLI)
│   ├── promote-branch.sh / promote-branch.ps1  #  Branch promotion helper
│   ├── setup-control-repo.sh / setup-control-repo.ps1  #  Control repo bootstrap
│   └── store-github-pat.sh / store-github-pat.ps1  #  PAT management (outside AI context)
│
├── docs/                               # Reference documentation
│   ├── project-overview.md             #   Generated: project overview
│   ├── architecture.md                 #   Generated: architecture document
│   ├── lifecycle-reference.md          #   Human-readable lifecycle schema reference (489 lines)
│   ├── lifecycle-visual-guide.md       #   Visual diagrams for lifecycle flow (812 lines)
│   ├── copilot-adapter-reference.md    #   Copilot adapter architecture (64 lines)
│   ├── copilot-adapter-templates.md    #   IDE adapter file templates (159 lines)
│   ├── copilot-instructions.md         #   Copilot runtime instructions (29 lines)
│   ├── copilot-repo-instructions.md    #   Repo-level Copilot instructions (207 lines)
│   ├── lex-persona.md                  #   Constitutional governance voice definition (97 lines)
│   ├── pipeline-source-to-release.md   #   CI/CD promotion workflow docs (171 lines)
│   ├── script-integration.md           #   Script invocation patterns (110 lines)
│   ├── v3.1-improvements.md            #   Release notes for v3.1 (603 lines)
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
| `workflows/router/` | User-facing phase flows | 9 workflows mapping to lifecycle phases |
| `workflows/utility/` | Operational commands | onboard, status, next, switch, help, promote, etc. |
| `workflows/governance/` | Compliance workflows | compliance-check, cross-initiative, resolve-constitution |
| `prompts/` | IDE prompt triggers | 22 `.prompt.md` files for VS Code/Copilot |
| `scripts/` | Cross-platform scripts | 5 paired .sh/.ps1 files |
| `docs/` | Reference documentation | 10 hand-written docs + generated docs |
| `tests/contracts/` | Contract test specs | 4 markdown-based specification files |

---

## Entry Points

| Entry | File | Type | Trigger |
|-------|------|------|---------|
| Module installer | `scripts/install.sh` / `install.ps1` | Script | First-time module installation |
| Control repo setup | `scripts/setup-control-repo.sh` / `.ps1` | Script | Bootstrap governance clone |
| PAT setup | `scripts/store-github-pat.sh` / `.ps1` | Script | Auth setup (outside AI context) |
| Agent activation | `agents/lens.agent.md` | Agent def | `@lens` invocation in IDE |
| CI/CD installer | `_module-installer/installer.js` | Node.js | Pipeline build step |
| Any prompt | `prompts/lens-work.*.prompt.md` | Prompt | IDE prompt selection |
