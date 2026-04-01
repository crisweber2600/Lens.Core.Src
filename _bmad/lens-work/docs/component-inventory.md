# Component Inventory — LENS Workbench Module (lens-work)

**Generated:** 2026-04-01 | **Scan Level:** Deep | **Module Version:** 3.1.0

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Skills | 6 (5 base + 1 dashboard) |
| Workflows | 24 (3 core + 9 router + 9 utility + 3 governance) |
| Prompts | 22 |
| Scripts | 5 (cross-platform Bash + PowerShell) |
| Agents | 1 (lens agent with 23 menu items) |
| IDE Adapters | 4 (github-copilot, cursor, claude, codex) |
| Step Files | ~60–80 across all workflows |

---

## 1. Skills

### git-state

| | |
|---|---|
| **Purpose** | Derive initiative state from git primitives — read-only queries on committed YAML state and branch topology |
| **Dependencies** | None (pure read-only) |

**Queries:**

| Operation | Description |
|-----------|-------------|
| `current-initiative` | Resolve active initiative from branch name; read committed state file |
| `current-phase` | Return active phase from initiative-state.yaml |
| `current-milestone` | Return active milestone branch token |
| `list-initiatives` | Enumerate all branches matching initiative naming patterns |
| `get-lifecycle-status` | Return lifecycle_status from initiative-state.yaml |

**Inputs:** Branch name, initiative root slug, path to initiative-state.yaml
**Outputs:** `initiative_root`, `branch`, `phase`, `scope`, `config_path`, `state_path`, `lifecycle_status`

---

### git-orchestration

| | |
|---|---|
| **Purpose** | Encapsulate all git write operations for branch management, commits, pushes, and PRs |
| **Dependencies** | `git-state` (precondition validation); provider adapter (PR creation) |

**Operations:**

| Operation | Description |
|-----------|-------------|
| `create-branch` | Create initiative root or milestone branch following lifecycle.yaml naming |
| `create-milestone-branch` | Create milestone branch at phase closeout; update state |
| `validate-branch-name` | Verify name matches lifecycle.yaml patterns |
| `commit-and-push` | Stage, commit initiative-state.yaml, push to remote |
| `push-force-with-lease` | Safe force push for branch rewrites |
| `create-pr` | Via provider adapter (GitHub API, Azure DevOps API) |

---

### constitution

| | |
|---|---|
| **Purpose** | Resolve effective constitution by merging 4-level governance hierarchy; provide compliance checking |
| **Dependencies** | Reads from governance repo (`lens-governance/constitutions/`); none on other skills |

**Operations:**

| Operation | Description |
|-----------|-------------|
| `resolve-constitution` | Merge org → domain → service → repo levels + language overlay |
| `get-phase-requirements` | Return required_artifacts, permitted_tracks, required_gates for a phase |
| `check-compliance` | Evaluate artifacts/gates against resolved constitution |

---

### sensing

| | |
|---|---|
| **Purpose** | Detect overlapping initiatives at lifecycle gates by analyzing branch topology and governance history |
| **Dependencies** | Reads from git branches and governance repo artifacts |

**Operations:**

| Operation | Description |
|-----------|-------------|
| `scan-live-conflicts` | Parse initiative roots from all branches; identify overlaps (Pass 1 — always runs) |
| `scan-historical-context` | Read governance:artifacts/ for closed initiatives (Pass 2 — optional) |
| `filter-closed-initiatives` | Exclude closed initiatives from conflict detection |
| `classify-overlap` | Categorize: same-feature (🔴 high), same-service (🟡 medium), same-domain (🟢 low) |

---

### checklist

| | |
|---|---|
| **Purpose** | Phase gate and promotion gate validation with progressive checklists |
| **Dependencies** | Delegates to `constitution` and `sensing` for gate checks |

**Operations:**

| Operation | Description |
|-----------|-------------|
| `evaluate-phase-gate` | Check required artifacts exist/non-empty for a phase |
| `evaluate-promotion-gate` | Validate phase PRs merged, artifacts complete, constitution compliance, sensing clear |

**Outputs:** `checklist_result` with `status` (PASS/FAIL), `items[]`, `passed`/`failed`/`total` counts

---

### dashboard (skill-based workflow)

| | |
|---|---|
| **Purpose** | Multi-initiative status overview with Mermaid Gantt timeline |
| **Dependencies** | `git-state` for initiative enumeration |

---

## 2. Workflows

### Core Workflows (3)

| Workflow | Purpose | Steps |
|----------|---------|-------|
| **phase-lifecycle** | Phase start/end and phase-to-audience PR management | preflight → validate-completion → create-phase-pr → cleanup |
| **audience-promotion** | Audience-to-audience PR with gate checks and sensing | 4 steps |
| **milestone-promotion** | Milestone branch creation and promotion at phase closeout | 4 steps |

---

### Router Workflows (9)

| Workflow | Command | Purpose | Steps |
|----------|---------|---------|-------|
| **init-initiative** | `/new-domain`, `/new-service`, `/new-feature` | Start initiative scaffolding | preflight → collect-scope → validate-and-sense → create-initiative → respond |
| **preplan** | `/preplan` | PrePlan phase — brainstorm, research, product brief | 4+ |
| **businessplan** | `/businessplan` | BusinessPlan phase — PRD and UX design | 4+ |
| **techplan** | `/techplan` | TechPlan phase — architecture and technical decisions | 4+ |
| **devproposal** | `/devproposal` | DevProposal phase — epics, stories, readiness | 4+ |
| **sprintplan** | `/sprintplan` | SprintPlan phase — sprint status and story files | 4+ |
| **dev** | `/dev` | Delegate implementation to target project agents | 3+ |
| **discover** | `/discover` | Discover repos, inspect BMAD config, manage governance | 4+ |
| **close** | `/close` | Close, abandon, or supersede initiative | 3+ |

---

### Utility Workflows (9)

| Workflow | Command | Purpose |
|----------|---------|---------|
| **onboard** | `/onboard` | Bootstrap control repo: provider auth, profile, governance, TargetProjects auto-clone |
| **status** | `/status` | Show current initiative state derived from git |
| **next** | `/next` | Recommend next action based on lifecycle state |
| **switch** | `/switch` | Switch to a different initiative via git checkout |
| **help** | `/help` | Show available commands and usage reference |
| **module-management** | `/module-management` | Module version check, update detection, self-service update |
| **promote** | `/promote` | Advance audience tier with gate checks and sensing |
| **upgrade** | `/lens-upgrade` | Migrate control repo to latest schema version |
| **dashboard** | `/dashboard` | Multi-initiative status overview with Gantt timeline |

---

### Governance Workflows (3)

| Workflow | Command | Purpose |
|----------|---------|---------|
| **compliance-check** | (gate trigger) | Constitution compliance scan for initiative artifacts |
| **resolve-constitution** | `/constitution` | 4-level constitutional hierarchy resolution |
| **cross-initiative** | `/sense` | Cross-initiative overlap detection on demand |

---

## 3. Prompts (22)

| Prompt File | Command | Abbr |
|-------------|---------|------|
| `lens-work.onboard.prompt.md` | `/onboard` | OB |
| `lens-work.new-initiative.prompt.md` | `/new-initiative` | NI |
| `lens-work.preplan.prompt.md` | `/preplan` | PP |
| `lens-work.businessplan.prompt.md` | `/businessplan` | BP |
| `lens-work.techplan.prompt.md` | `/techplan` | TP |
| `lens-work.devproposal.prompt.md` | `/devproposal` | DP |
| `lens-work.sprintplan.prompt.md` | `/sprintplan` | SP |
| `lens-work.dev.prompt.md` | `/dev` | DV |
| `lens-work.discover.prompt.md` | `/discover` | DS |
| `lens-work.status.prompt.md` | `/status` | ST |
| `lens-work.next.prompt.md` | `/next` | NX |
| `lens-work.switch.prompt.md` | `/switch` | SW |
| `lens-work.promote.prompt.md` | `/promote` | PR |
| `lens-work.constitution.prompt.md` | `/constitution` | CN |
| `lens-work.compliance-check.prompt.md` | compliance gate | — |
| `lens-work.help.prompt.md` | `/help` | HP |
| `lens-work.module-management.prompt.md` | `/module-management` | MM |
| `lens-work.close.prompt.md` | `/close` | CL |
| `lens-work.setup-repo.prompt.md` | repo setup | — |
| `lens-work.upgrade.prompt.md` | `/lens-upgrade` | UG |
| `lens-work.dashboard.prompt.md` | `/dashboard` | DB |
| `lens-work.sense.prompt.md` | `/sense` | SN |

---

## 4. Scripts (5 Cross-Platform)

| Script | Files | Purpose |
|--------|-------|---------|
| **install** | `install.sh` / `install.ps1` | Standalone module installer — creates output directory structure, IDE adapter files, copilot-instructions.md. Safe to re-run |
| **create-pr** | `create-pr.sh` / `create-pr.ps1` | Generic PR creation via GitHub/Azure DevOps REST API + PAT. No `gh` CLI dependency |
| **promote-branch** | `promote-branch.sh` / `promote-branch.ps1` | Branch promotion, PR creation, branch cleanup (local/remote). Supports audience/phase/workflow promotion |
| **store-github-pat** | `store-github-pat.sh` / `store-github-pat.ps1` | Secure PAT collection into env vars. **Must run OUTSIDE AI context** |
| **setup-control-repo** | `setup-control-repo.sh` / `setup-control-repo.ps1` | Control repo bootstrap — clones governance, release, copilot repos. Safe to re-run |

---

## 5. Agent

### LENS (🔭)

| | |
|---|---|
| **Files** | `agents/lens.agent.md`, `agents/lens.agent.yaml` |
| **Module** | lens-work |
| **Menu Items** | 23 (covering all workflows + chat, help redisplay, dismiss) |
| **Activation** | 9-step sequence: load bmadconfig → load lifecycle → derive git state → detect initiative → resolve constitution → render menu |
| **Governance Voice** | Shifts to "Lex" — authoritative, rule-citing — when constitutional governance invoked |
| **Routing** | Fuzzy matching with abbreviations (OB, NI, SW, etc.) |

---

## 6. Lifecycle Contract

| | |
|---|---|
| **File** | `lifecycle.yaml` (schema v3.1) |
| **Phases** | preplan → businessplan → techplan → devproposal → sprintplan → dev |
| **Audiences** | small → medium → large → base |
| **Tracks** | full, feature, tech-change, hotfix |
| **Scope Levels** | domain (1 segment), service (2 segments), feature (3 segments) |
| **State File** | `initiative-state.yaml` (committed, single source of truth) |
| **Branch Pattern** | `{initiative-root}` for root; `{initiative-root}-{milestone}` for milestones |

---

## 7. IDE Adapters (4)

| IDE | Output Location | Generated Artifacts |
|-----|-----------------|---------------------|
| **github-copilot** | `.github/` | Agent stub, instructions, 17 prompt stubs |
| **cursor** | `.cursor/commands/` | 17 command stubs |
| **claude** | `.claude/commands/` | 17 command stubs |
| **codex** | `.codex/commands/` | 17 command stubs |

---

## Dependency Graph

```
checklist
  ├── constitution (gate requirements)
  └── sensing (overlap detection)

git-orchestration
  └── git-state (precondition validation)

dashboard
  └── git-state (initiative enumeration)

constitution → governance repo (external)
sensing → governance repo (external)
```
