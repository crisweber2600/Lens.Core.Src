---
name: lens-work-tests
description: Comprehensive test specifications for lens-work module
version: 2.0
module: lens-work
created: 2026-02-05
---

# LENS Workbench Test Specifications

> Comprehensive test coverage for the lens-work module including state management,
> branch switching, initiative creation, workflow execution, agent integration,
> and error handling.

## Test Priority Levels

| Priority | Label | Meaning |
|----------|-------|---------|
| **P0** | Critical | Must pass before any release. Blocks all other testing. |
| **P1** | High | Core functionality. Must pass for feature-complete status. |
| **P2** | Medium | Important behavior. Should pass; failures require investigation. |
| **P3** | Low | Edge cases, polish. Nice-to-have coverage. |

## Automation Notes (General)

- All tests assume a clean git working directory unless otherwise stated.
- State files live in `_bmad-output/lens-work/`.
- Initiative files live in `_bmad-output/lens-work/initiatives/`.
- Event logs append to `_bmad-output/lens-work/event-log.jsonl`.
- Tests that mutate git state should operate on a disposable test branch.
- PowerShell validation script (`scripts/validate-lens-work.ps1`) can verify structural prerequisites.

---

## 1. State Management Tests

### 1.1 Two-File State Creation

**Priority:** P0  
**Category:** State / Init  
**Automation:** Script-verifiable (file existence + YAML parse)

| # | Test | Expected Result |
|---|------|-----------------|
| 1.1.1 | Init initiative creates `state.yaml` | File exists at `_bmad-output/lens-work/state.yaml` |
| 1.1.2 | Init initiative creates `initiatives/{id}.yaml` (service/feature) | File exists at `_bmad-output/lens-work/initiatives/{id}.yaml` |
| 1.1.3 | Init initiative creates `initiatives/{domain}/Domain.yaml` (domain-layer) | File exists at `_bmad-output/lens-work/initiatives/{domain_prefix}/Domain.yaml` |
| 1.1.4 | `state.yaml` has `active_initiative` field | YAML key `active_initiative` is present and matches `{id}` (or `{domain_prefix}` for domain-layer) |
| 1.1.5 | `initiatives/{id}.yaml` has required fields | Fields: `id`, `name`, `layer`, `gates`, `blocks` all present |
| 1.1.6 | `state.yaml` is NOT committed (git-ignored) | `.gitignore` contains `_bmad-output/lens-work/state.yaml` or equivalent pattern |
| 1.1.7 | `initiatives/{id}.yaml` IS committed | File tracked by git after init-initiative completes |

### 1.2 State Loading

**Priority:** P0  
**Category:** State / Read  
**Automation:** Agent-driven (requires workflow execution context)

| # | Test | Expected Result |
|---|------|-----------------|
| 1.2.1 | Status workflow loads both files | Status output includes data from `state.yaml` AND active initiative file |
| 1.2.2 | Legacy single-file format detected | Warning message: migration available via `migrate-state` |
| 1.2.3 | Missing initiative file shows clear error | Error message includes initiative ID and suggests `migrate-state` or re-init |
| 1.2.4 | Stale `active_initiative` reference detected | When `state.yaml` references an ID with no matching file, clear error shown |

### 1.3 State Migration

**Priority:** P1  
**Category:** State / Migration  
**Automation:** Script-verifiable (pre/post file comparison)

| # | Test | Expected Result |
|---|------|-----------------|
| 1.3.1 | `migrate-state` converts old format correctly | Old embedded initiative data extracted to `initiatives/{id}.yaml` |
| 1.3.2 | Backup created as `state.yaml.backup` | Backup file exists with original content |
| 1.3.3 | Migration event logged | `event-log.jsonl` contains entry with `event: state-migration` |
| 1.3.4 | Rollback restores original state | Running rollback replaces `state.yaml` from `.backup` and removes split files |
| 1.3.5 | Migration is idempotent | Running `migrate-state` on already-migrated state produces no changes |
| 1.3.6 | Multi-initiative migration | All initiatives in old state split into separate files |

---

## 2. Branch Switching Tests

### 2.1 Switch Initiative

**Priority:** P0  
**Category:** Branch / Initiative  
**Automation:** Git-verifiable (branch checkout state)

| # | Test | Expected Result |
|---|------|-----------------|
| 2.1.1 | Lists all initiatives from `initiatives/*.yaml` and `initiatives/*/Domain.yaml` | Menu shows all initiative files with name, ID, layer |
| 2.1.2 | Updates `state.yaml` `active_initiative` | After switch, `active_initiative` matches selected ID |
| 2.1.3 | @lens git-orchestration checks out correct branch | `git branch --show-current` matches expected flat branch name pattern |
| 2.1.4 | Handles non-existent initiative gracefully | Error: "Initiative '{id}' not found" with available options listed |
| 2.1.5 | Switching to already-active initiative is a no-op | Message: "Already on initiative {id}" |

### 2.2 Switch Phase

**Priority:** P0  
**Category:** Branch / Phase  
**Automation:** Git-verifiable (branch name pattern)

| # | Test | Expected Result |
|---|------|-----------------|
| 2.2.1 | Creates phase branch via @lens git-orchestration if missing | New branch created matching `{initiative_root}-{audience}-{phaseName}` |
| 2.2.2 | Validates phase ordering (can't skip phases) | Attempting to skip from preplan to techplan shows gate violation error |
| 2.2.3 | Updates `state.yaml` `current.phase` | Phase field updated to target canonical phase name |
| 2.2.4 | Branch pattern matches `{initiative_root}-{audience}-{phaseName}` | Regex validation passes for created branch name |
| 2.2.5 | Cannot switch to phase without passing previous gate | Gate check blocks advancement; shows required artifacts |
| 2.2.6 | Switching to current phase is a no-op | Message: "Already on phase {N}" |

### 2.3 Switch Audience

**Priority:** P1  
**Category:** Branch / Audience  
**Automation:** Git-verifiable

| # | Test | Expected Result |
|---|------|-----------------|
| 2.3.1 | Creates audience branch if missing | New branch created for audience group |
| 2.3.2 | Updates initiative config review_audience_map | `initiatives/{id}.yaml` review_audience_map reflects correct phase-audience mapping |
| 2.3.3 | Validates audience name against allowed values | Invalid audience names rejected with list of valid options (small, medium, large) |
| 2.3.4 | Audience switch preserves phase context | Phase doesn't reset when switching audience groups |

---

## 3. Initiative Creation Tests

### 3.1 Init Initiative

**Priority:** P0  
**Category:** Initiative / Creation  
**Automation:** Hybrid (script checks structure, agent verifies behavior)

| # | Test | Expected Result |
|---|------|-----------------|
| 3.1.1 | Generates valid initiative ID (feature) | Format: `{sanitized-name}-{6-random-chars}`, no spaces/special chars |
| 3.1.2 | Creates root branch (feature) | `{initiative_root}` branch exists and pushed |
| 3.1.3 | Creates small audience branch (feature) | `{initiative_root}-small` branch exists and pushed |
| 3.1.4 | Creates medium audience branch (feature) | `{initiative_root}-medium` branch exists and pushed |
| 3.1.5 | Creates large audience branch (feature) | `{initiative_root}-large` branch exists and pushed |
| 3.1.6 | No phase branches created at init (feature) | No `-small-preplan` or other phase branches exist after init |
| 3.1.7 | Writes initiative config with required fields (feature) | `initiatives/{id}.yaml` contains: `id`, `name`, `layer`, `target_repos`, `initiative_root`, `branches`, `review_audience_map`, `gates`, `blocks` |
| 3.1.8 | Logs init event to `event-log.jsonl` | Last entry has `event: init-initiative`, matching `initiative_id` |
| 3.1.9 | Returns control to @lens | After init, @lens menu is displayed |
| 3.1.10 | Duplicate initiative name generates unique ID (feature) | Two inits with same name produce different IDs (random suffix differs) |
| 3.1.11 | Domain-layer uses `domain_prefix` as initiative ID | `initiative_id` equals `domain_prefix` (no random suffix) |
| 3.1.12 | Domain-layer creates only `{domain_prefix}` branch | Only one branch created and pushed — no audience/phase branches |
| 3.1.13 | Domain-layer creates Domain.yaml | `initiatives/{domain_prefix}/Domain.yaml` exists with initiative config fields |
| 3.1.14 | Domain-layer scaffolds domain folders | `initiatives/{domain_prefix}/.gitkeep`, `TargetProjects/{domain_prefix}/.gitkeep`, `Docs/{domain_prefix}/.gitkeep` all exist |
| 3.1.15 | Service-layer creates `{domain_prefix}-{service_prefix}` branch | Single branch with hyphen separator, pushed immediately |
| 3.1.16 | All branches pushed immediately after creation | `git branch -r` shows all created branches on remote |

### 3.2 Layer-Specific Init

**Priority:** P1  
**Category:** Initiative / Layer  
**Automation:** Agent-driven (requires interactive prompts)

| # | Test | Expected Result |
|---|------|-----------------|
| 3.2.1 | Domain layer creates domain folder structure | `TargetProjects/{DOMAIN}/`, `initiatives/{DOMAIN}/`, `Docs/{DOMAIN}/` directories created with `.gitkeep` files |
| 3.2.2 | Domain layer creates Domain.yaml with initiative config | `initiatives/{DOMAIN}/Domain.yaml` contains: `id`, `name`, `layer`, `domain`, `docs`, `branch`, `gates`, `blocks` |
| 3.2.3 | Domain layer prompts for domain name | Interactive prompt asks for domain identifier |
| 3.2.4 | Domain layer creates only domain branch | Only `{domain_prefix}` branch — no audience/phase branches |
| 3.2.5 | Service layer resolves target repo | Target repo resolved from `service-map.yaml` |
| 3.2.6 | Service layer creates service subfolder | `TargetProjects/{DOMAIN}/{SERVICE}/{REPO}` structure created |
| 3.2.7 | Feature layer validates parent initiative | Error if referenced parent initiative doesn't exist |
| 3.2.8 | Feature layer inherits parent target repos | Feature initiative gets `target_repos` from parent |
| 3.2.9 | Layer defaults to 'feature' when not specified | Omitting layer in init defaults to feature layer |

---

## 4. Workflow Execution Tests

### 4.1 Router Workflows

**Priority:** P0  
**Category:** Workflow / Router  
**Automation:** Agent-driven with state file verification

#### 4.1.1 PrePlan Router (`/preplan`)

| # | Test | Expected Result |
|---|------|------------------|
| 4.1.1.1 | Loads two-file state | Both `state.yaml` and active initiative file read |
| 4.1.1.2 | Gate check allows entry at preplan | PrePlan available when on preplan phase |
| 4.1.1.3 | Auto-creates phase branch if missing | Branch `{initiative_root}-small-preplan` created if not present |
| 4.1.1.4 | State updates persist after execution | `state.yaml` updated with workflow progress |
| 4.1.1.5 | Git discipline validates clean state | Dirty working directory blocks workflow start |
| 4.1.1.6 | Constitutional context is injected | `constitutional_context` is resolved and available before analysis workflow calls |

#### 4.1.2 BusinessPlan Router (`/businessplan`)

| # | Test | Expected Result |
|---|------|------------------|
| 4.1.2.1 | Loads two-file state | Both files read successfully |
| 4.1.2.2 | Gate check requires preplan completion | Cannot enter businessplan without preplan artifacts |
| 4.1.2.3 | Creates businessplan branch via @lens git-orchestration | Branch `{initiative_root}-small-businessplan` created |
| 4.1.2.4 | State updates persist | Phase advanced to businessplan in state |
| 4.1.2.5 | Git discipline validates clean state | Blocks on dirty working directory |
| 4.1.2.6 | Constitutional context is injected | `constitutional_context` is resolved before PRD/UX/architecture workflows run |

#### 4.1.3 TechPlan Router (`/techplan`)

| # | Test | Expected Result |
|---|------|------------------|
| 4.1.3.1 | Loads two-file state | Both files read successfully |
| 4.1.3.2 | Gate check requires businessplan completion | Cannot enter techplan without businessplan artifacts |
| 4.1.3.3 | Creates techplan branch via @lens git-orchestration | Branch `{initiative_root}-small-techplan` created |
| 4.1.3.4 | State updates persist | Phase advanced to techplan in state |
| 4.1.3.5 | Git discipline validates clean state | Blocks on dirty working directory |
| 4.1.3.6 | Constitutional context is injected | `constitutional_context` is resolved before epics/stories/readiness workflows run |
| 4.1.3.7 | Epic adversarial stress gate runs | `bmm.check-implementation-readiness` executes after epics generation and blocks on fail |
| 4.1.3.8 | Epic party-mode teardown runs per epic | `core.party-mode` executes for each epic and writes `epic-*-party-mode-review.md` files |

#### 4.1.4 Review Router (`/review`)

| # | Test | Expected Result |
|---|------|-----------------|
| 4.1.4.1 | Loads two-file state | Both files read successfully |
| 4.1.4.2 | Gate check requires techplan completion | Cannot enter review without plan artifacts |
| 4.1.4.3 | Creates review branch if needed | Branch created following naming convention |
| 4.1.4.4 | State updates persist | Review status tracked in state |
| 4.1.4.5 | Git discipline validates clean state | Blocks on dirty working directory |
| 4.1.4.6 | Constitutional context is injected | `constitutional_context` is resolved before readiness and compliance checks |
| 4.1.4.7 | Compliance gate blocks constitutional FAILs | Any FAIL from compliance checks exits `/review` with gate blocked |

#### 4.1.5 Dev Router (`/dev`)

| # | Test | Expected Result |
|---|------|-----------------|
| 4.1.5.1 | Loads two-file state | Both files read successfully |
| 4.1.5.2 | Gate check requires review completion | Cannot enter dev without review pass |
| 4.1.5.3 | Creates sprintplan branch via @lens git-orchestration | Branch `{initiative_root}-large-sprintplan` created |
| 4.1.5.4 | State updates persist | Phase advanced to sprintplan in state |
| 4.1.5.5 | Git discipline validates clean state | Blocks on dirty working directory |
| 4.1.5.6 | Constitutional context is injected | `constitutional_context` is resolved before implementation guidance and review loops |
| 4.1.5.7 | Dev story compliance gate blocks FAILs | `@lens.constitution.compliance-check` on dev story exits `/dev` on any FAIL |
| 4.1.5.8 | Adversarial code review is mandatory | `bmm.code-review` executes when implementation is signaled complete |
| 4.1.5.9 | Code-review compliance gate blocks FAILs | `@lens.constitution.compliance-check` on code review report exits `/dev` on any FAIL |
| 4.1.5.10 | Party-mode teardown runs after code review | `core.party-mode` executes and writes `party-mode-review-${story_id}.md` |
| 4.1.5.11 | Epic completion is detected in `/dev` | Current story resolves to parent epic and epic completion is evaluated before workflow exit |
| 4.1.5.12 | Epic adversarial review runs on epic completion | `bmm.check-implementation-readiness` executes for completed epic and blocks `/dev` on fail |
| 4.1.5.13 | Epic party-mode teardown runs on epic completion | `core.party-mode` writes `epic-*-party-mode-review.md` and blocks `/dev` on unresolved issues |
| 4.1.5.14 | Step 4→5 halts only on unresolved blockers | Agent proceeds to implementation after Step 4 guidance unless enforced-mode gate failures exist; agent self-signals `@lens done` on completion and continues to Step 5 code review automatically |
| 4.1.5.15 | Step 5 pre-condition checks story status | Code review is blocked with `halt: true` if story status is not `"review"`, `"in-progress"`, or `"implementing"` when Step 5 begins |

### 4.2 Utility Workflows

**Priority:** P1  
**Category:** Workflow / Utility  
**Automation:** Mixed (some script-verifiable, some agent-driven)

| # | Test | Expected Result |
|---|------|-----------------|
| 4.2.1 | Status shows both files | Output includes `state.yaml` summary AND initiative details |
| 4.2.2 | Resume loads correct context | Initiative, phase, size, and workflow restored from state |
| 4.2.3 | Resume re-enters workflow at correct step | Workflow step counter matches saved progress |
| 4.2.4 | Check-repos validates all repos | Each repo in `service-map.yaml` checked for existence and git state |
| 4.2.5 | Onboarding creates profile | User profile file created in `_bmad-output/lens-work/` |
| 4.2.6 | Switch workflow handles all target types | Supports `initiative`, `phase`, and `size` switch targets |
| 4.2.7 | Fix-state corrects inconsistencies | Detects and repairs state/branch mismatches |
| 4.2.8 | Archive marks initiative as archived | Initiative file updated with `archived: true`, branches cleaned |
| 4.2.9 | Sync workflow synchronizes state to remote | State pushed to correct branch after sync |
| 4.2.10 | Override allows manual phase override with warning | Override bypasses gates with clear warning logged |
| 4.2.11 | Setup-rollback reverts initiative setup | Branches removed, state files cleaned up |

---

## 5. @lens Skill Integration Tests

### 5.1 @lens Core (Routing & Navigation)

**Priority:** P0  
**Category:** Agent / @lens Core  
**Automation:** Agent-driven (interactive command testing)

| # | Test | Expected Result |
|---|------|-----------------|
| 5.1.1 | `/switch` delegates to switch workflow | Switch workflow triggered with correct parameters |
| 5.1.2 | `/context` loads and displays two-file state | Output shows active initiative details from both files |
| 5.1.3 | `/constitution` displays rules | Constitution text rendered from prompt file |
| 5.1.4 | `/lens` shows current layer | Current initiative layer displayed |
| 5.1.5 | `/lens {layer}` changes layer | Layer updated in initiative file |
| 5.1.6 | Menu displays all commands | All slash commands listed with descriptions |
| 5.1.7 | `/status` delegates to status workflow | Status workflow executed, output rendered |
| 5.1.8 | `/resume` delegates to resume workflow | Resume workflow restores previous context |
| 5.1.9 | Unknown command shows help | Unrecognized input triggers help/menu display |
| 5.1.10 | Phase commands route correctly | `/preplan`, `/businessplan`, `/techplan`, `/devproposal`, `/sprintplan`, `/dev` each trigger correct router |
| 5.1.11 | Initiative commands route correctly | `/new-domain`, `/new-service`, `/new-feature` trigger init with correct layer |
| 5.1.12 | `/start` delegates to start workflow | Start workflow triggered for current context |

### 5.2 git-orchestration Skill

**Priority:** P0  
**Category:** Skill / git-orchestration  
**Automation:** Git-verifiable

| # | Test | Expected Result |
|---|------|-----------------|
| 5.2.1 | `branch-status` returns correct status | Shows current branch, tracking, ahead/behind counts |
| 5.2.2 | `create-branch-if-missing` creates only when needed | Branch created if absent; no-op if exists |
| 5.2.3 | `create-branch-if-missing` sets upstream | New branch tracks remote after creation |
| 5.2.4 | `fetch-and-checkout` fetches then checks out | Remote fetched first, then local checkout |
| 5.2.5 | `show-branch` displays tracking info | Branch name, remote tracking, commit info shown |
| 5.2.6 | Branch naming follows convention | All created branches match `{initiative_root}[-{audience}[-{phaseName}]]` pattern |
| 5.2.7 | Handles detached HEAD state | Clear error with recovery instructions |
| 5.2.8 | Handles merge conflicts | Conflict detected, user prompted for resolution |

### 5.3 discovery Skill

**Priority:** P1  
**Category:** Skill / discovery  
**Automation:** Mixed

| # | Test | Expected Result |
|---|------|-----------------|
| 5.3.1 | Onboarding creates profile | Profile file created with user preferences |
| 5.3.2 | Check-repos validates repos | Each repo checked; missing repos flagged |
| 5.3.3 | Bootstrap handles domain structure | Domain/service folder hierarchy created correctly |
| 5.3.4 | Bootstrap handles flat structure | Non-domain repos cloned to `TargetProjects/{repo}` |
| 5.3.5 | Repo-discover scans target project | Discovery report generated with tech stack, structure |
| 5.3.6 | Repo-document generates canonical docs | Docs written to `_bmad-output/lens-work/docs/` |
| 5.3.7 | Repo-status shows all repo states | Summary table of all repos with git status |
| 5.3.8 | Repo-reconcile fixes drift | Domain/service assignments corrected |

### 5.4 state-management Skill

**Priority:** P1  
**Category:** Skill / state-management  
**Automation:** State file verification

| # | Test | Expected Result |
|---|------|-----------------|
| 5.4.1 | `migrate-state` works correctly | Old state split into two-file format |
| 5.4.2 | Status uses two-file format | Output reflects data from both files |
| 5.4.3 | Resume loads correct state | Context restored from `state.yaml` + initiative file |
| 5.4.4 | Event logging appends correctly | New events appended without corrupting existing entries |
| 5.4.5 | State validation detects corruption | Malformed YAML reported with field-level details |
| 5.4.6 | Fix-state repairs mismatches | Branch/state inconsistencies detected and corrected |
| 5.4.7 | Concurrent state access handled | File locking or last-write-wins documented and consistent |

### 5.5 constitution Skill

**Priority:** P1  
**Category:** Skill / constitution  
**Automation:** Agent-driven

| # | Test | Expected Result |
|---|------|-----------------|
| 5.5.1 | 4-level hierarchy resolution works | org → domain → service → repo constitution chain resolves correctly |
| 5.5.2 | Additive merge applies union semantics | Lower-level rules add to but never remove parent rules |
| 5.5.3 | Compliance check detects violations | FAIL result blocks gate progression |
| 5.5.4 | Track validation enforces allowed tracks | Invalid track rejected with allowed values listed |
| 5.5.5 | Gate validation checks artifacts and reviewers | Missing artifacts or reviewers block promotion |

### 5.6 checklist Skill

**Priority:** P1  
**Category:** Skill / checklist  
**Automation:** State file verification

| # | Test | Expected Result |
|---|------|-----------------|
| 5.6.1 | Progressive checklist updates per phase | Checklist items added as phases complete |
| 5.6.2 | Gate readiness accurately reported | Checklist reflects actual artifact and review status |
| 5.6.3 | Expandable detail provides artifact status | Each checklist item shows file existence and validation result |

---

## 6. Error Handling Tests

### 6.1 State Errors

**Priority:** P0  
**Category:** Error / State  
**Automation:** Script-verifiable (deliberate corruption tests)

| # | Test | Expected Result |
|---|------|-----------------|
| 6.1.1 | Missing `state.yaml` shows helpful message | Message: "No lens-work state found. Run /start or #new-{layer} to begin." |
| 6.1.2 | Missing initiative file suggests migration | Message: "Initiative file not found for '{id}'. Run migrate-state if upgrading." |
| 6.1.3 | Corrupt YAML detected and reported | Parse error shown with line number and suggestion to run fix-state |
| 6.1.4 | File permission errors handled | OS-level permission errors caught with clear message |
| 6.1.5 | Empty `state.yaml` handled | Treated as missing; init prompt shown |
| 6.1.6 | Partial initiative file handled | Missing required fields listed; fix-state suggested |
| 6.1.7 | `event-log.jsonl` corruption isolated | Corrupt log entries skipped; warning shown; logging continues |

### 6.2 Git Errors

**Priority:** P0  
**Category:** Error / Git  
**Automation:** Git-state manipulation tests

| # | Test | Expected Result |
|---|------|-----------------|
| 6.2.1 | Dirty working directory blocks operations | Message: "Uncommitted changes detected. Commit or stash before proceeding." |
| 6.2.2 | Push failures reported with retry suggestion | Message: "Push failed. Check remote connectivity and try again." |
| 6.2.3 | Branch conflict resolution suggested | Message: "Branch '{name}' has conflicts. Resolve manually or use /fix." |
| 6.2.4 | Remote unreachable handled gracefully | Message: "Cannot reach remote '{remote}'. Check network and try again." |
| 6.2.5 | Branch already exists on create | No error; switches to existing branch instead |
| 6.2.6 | Checkout with uncommitted changes | Blocks with stash suggestion |
| 6.2.7 | Fetch timeout handled | Timeout message with retry option |
| 6.2.8 | Invalid branch name rejected | Sanitization applied or clear error with naming rules |

### 6.3 Validation Errors

**Priority:** P1  
**Category:** Error / Validation  
**Automation:** Agent-driven with deliberate bad input

| # | Test | Expected Result |
|---|------|-----------------|
| 6.3.1 | Missing required artifacts reported | Gate check lists which artifacts are missing for phase advancement |
| 6.3.2 | Invalid initiative config detected | Malformed `initiatives/{id}.yaml` flagged with specific field errors |
| 6.3.3 | Phase gate violations clearly explained | Message: "Cannot advance to phase {N}. Missing: {artifact list}" |
| 6.3.4 | Invalid layer value rejected | Only `domain`, `service`, `feature` accepted; error lists valid values |
| 6.3.5 | Invalid initiative ID format rejected | ID must match `[a-z0-9-]+` pattern |
| 6.3.6 | Duplicate initiative name warning | Warning shown but creation allowed (unique ID ensures separation) |
| 6.3.7 | Missing `service-map.yaml` detected | Clear error: "service-map.yaml not found. Run bootstrap first." |
| 6.3.8 | Invalid `service-map.yaml` format | Parse error with specific field/line reference |

---

## 7. Git Discipline Tests

**Priority:** P0  
**Category:** Cross-cutting / Git Discipline  
**Automation:** Git-verifiable

> These tests validate the git discipline pattern applied across all state-mutating workflows.

| # | Test | Workflow(s) | Expected Result |
|---|------|-------------|-----------------|
| 7.1 | Step 0 verifies clean working directory | All core + router workflows | Dirty state blocks execution |
| 7.2 | Step 0 checks out correct branch | All core + router workflows | Branch matches expected pattern for workflow/phase |
| 7.3 | Step 0 pulls latest from origin | All core + router workflows | `git pull` executed before workflow logic |
| 7.4 | Final step stages relevant files | init-initiative, finish-workflow | `git add` targets specific files, not `git add .` |
| 7.5 | Final step creates targeted commit | init-initiative, finish-workflow | Commit message includes initiative_id, phase, and workflow context |
| 7.6 | Final step pushes to remote | init-initiative, finish-workflow | `git push` executed after commit |
| 7.7 | Commit message format consistent | All committing workflows | Format: `lens-work: {workflow} [{initiative_id}] {description}` |
| 7.8 | Branch name parsed correctly (service/feature) | finish-workflow | Initiative ID, audience, phase extracted from `{initiative_root}-{audience}-{phaseName}-{workflow}` |
| 7.9 | Branch name parsed correctly (domain-layer) | init-initiative (domain) | Domain prefix extracted from `{domain_prefix}` (no subpath) |
| 7.10 | Non-mutating workflows skip commit | repo-discover, repo-document, repo-status | No git commits created by read-only workflows |
| 7.11 | Utility workflows commit state changes | bootstrap, reconcile | State file changes committed with context |

---

## 8. Module Structure Tests

**Priority:** P2  
**Category:** Structure / Validation  
**Automation:** Fully script-verifiable (`validate-lens-work.ps1`)

| # | Test | Expected Result |
|---|------|-----------------|
| 8.1 | All required directories exist | `agents/`, `workflows/`, `prompts/`, `docs/`, `tests/` present |
| 8.2 | Agent configuration present | `lens.agent.yaml` exists with 5 skill definitions |
| 8.3 | All skill files present | `skills/git-orchestration.md`, `skills/state-management.md`, `skills/discovery.md`, `skills/constitution.md`, `skills/checklist.md` |
| 8.4 | All workflow categories present | `core/`, `router/`, `discovery/`, `utility/` under `workflows/` |
| 8.5 | `module.yaml` is valid YAML | Parses without error; required fields present |
| 8.6 | All agents in `module.yaml` have matching files | Each agent `file` reference resolves to existing file |
| 8.7 | All prompts referenced are present | Every prompt file referenced in module config exists |
| 8.8 | All workflow directories have `workflow.md` | Each workflow folder contains its definition file |
| 8.9 | `service-map.yaml` is valid | Parses correctly; all referenced paths exist or are documented |
| 8.10 | `README.md` exists and is non-empty | Module README present with content |

---

## 9. Cross-Cutting Concerns

### 9.1 Event Logging

**Priority:** P2  
**Category:** Cross-cutting / Logging  
**Automation:** JSONL file verification

| # | Test | Expected Result |
|---|------|-----------------|
| 9.1.1 | All workflow executions logged | Entry created for each workflow start/complete |
| 9.1.2 | Event entries are valid JSONL | Each line parses as valid JSON |
| 9.1.3 | Required event fields present | `timestamp`, `event`, `initiative_id`, `workflow` in every entry |
| 9.1.4 | Error events include stack context | Error entries include `error` field with description |
| 9.1.5 | Log rotation handled | Large log files handled gracefully (no OOM on read) |

### 9.2 Prompt File Consistency

**Priority:** P2  
**Category:** Cross-cutting / Prompts  
**Automation:** Script-verifiable

| # | Test | Expected Result |
|---|------|-----------------|
| 9.2.1 | All prompt files have YAML frontmatter | Each `.prompt.md` starts with `---` delimited YAML |
| 9.2.2 | Prompt file naming follows convention | Pattern: `lens-work.{command}.prompt.md` |
| 9.2.3 | Prompts sync correctly to `.github/prompts/` | `sync-prompts.ps1` copies all files without error |
| 9.2.4 | No orphaned prompts | Every prompt file maps to a valid command or workflow |

### 9.3 Multi-Repo Operations

**Priority:** P2  
**Category:** Cross-cutting / Multi-Repo  
**Automation:** Agent-driven

| # | Test | Expected Result |
|---|------|-----------------|
| 9.3.1 | Operations execute from control repo | No `cd` into TargetProjects for BMAD operations |
| 9.3.2 | `target_repos` array respected | Workflows operate on all repos listed in initiative |
| 9.3.3 | Missing target repo detected | Clear error when referenced repo not cloned |
| 9.3.4 | Service-map paths resolve correctly | Relative paths in `service-map.yaml` resolve from control repo root |

---

## Test Execution Summary

| Category | P0 | P1 | P2 | P3 | Total |
|----------|-----|-----|-----|-----|-------|
| 1. State Management | 7 | 6 | 0 | 0 | 13 |
| 2. Branch Switching | 10 | 4 | 0 | 0 | 14 |
| 3. Initiative Creation | 13 | 9 | 0 | 0 | 22 |
| 4. Workflow Execution | 40 | 11 | 0 | 0 | 51 |
| 5. @lens Skill Integration | 18 | 23 | 0 | 0 | 41 |
| 6. Error Handling | 8 | 8 | 0 | 0 | 16 |
| 7. Git Discipline | 11 | 0 | 0 | 0 | 11 |
| 8. Module Structure | 0 | 0 | 10 | 0 | 10 |
| 9. Cross-Cutting | 0 | 0 | 12 | 0 | 12 |
| **Total** | **107** | **61** | **22** | **0** | **190** |

---

## Appendix: Test Environment Setup

### Prerequisites

1. Git installed and configured with remote access
2. PowerShell 7+ (for validation scripts)
3. BMAD control repo with lens-work module installed
4. At least one target project cloned via `service-map.yaml`
5. Clean working directory (no uncommitted changes)

### Test Data

- Sample `state.yaml` fixtures in `tests/fixtures/state/`
- Sample initiative files in `tests/fixtures/initiatives/`
- Corrupt YAML samples in `tests/fixtures/corrupt/`
- Legacy single-file state in `tests/fixtures/legacy/`

### Running Tests

```bash
# Structural validation (automated)
pwsh scripts/validate-lens-work.ps1 -ModulePath . -Verbose

# Prompt sync validation
pwsh scripts/sync-prompts.ps1 -SourcePath . -DryRun

# Full test execution (agent-driven)
# Use @lens agent with /test command or manual walkthrough
```
