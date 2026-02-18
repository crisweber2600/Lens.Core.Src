# Stories: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Phase:** P3 Solutioning  
**Date:** 2026-02-18  
**Status:** Draft

---

## Story Map

| Story | Epic | Title | Effort | Priority |
|-------|------|-------|--------|----------|
| S1.1 | E1 | Remove auto-merge from all phase routers | M | High |
| S1.2 | E1 | Create PR creation script (PAT + fallback) | L | High |
| S1.3 | E1 | Add pre-flight checklist to all phase routers | M | High |
| S1.4 | E1 | Extend state machine with `pr_pending` status | S | High |
| S1.5 | E1 | Add next-phase PR-merge validation | S | High |
| S2.1 | E2 | Remove random suffix from feature initiative IDs | S | High |
| S2.2 | E2 | Add duplicate initiative detection | S | High |
| S2.3 | E2 | Add Jira ticket ID to initiative ID | S | High |
| S2.4 | E2 | Add profile anti-pattern warning to onboarding | S | High |
| S3.1 | E3 | Add question mode prompt to onboarding | S | Medium |
| S3.2 | E3 | Add tracker preference prompt to onboarding | S | Medium |
| S3.3 | E3 | Auto-create TargetProjects directory | XS | Medium |
| S3.4 | E3 | Wire profile preferences into init-initiative | S | Medium |
| S4.1 | E4 | Create branch-topology.md documentation | S | Low |

---

## E1 Stories

### S1.1: Remove Auto-Merge from All Phase Routers

**Epic:** E1 — Phase Governance & PR Automation  
**Effort:** Medium  
**REQ:** REQ-7

#### Description
In each of the 7 phase router workflows, replace the phase-completion section that performs `git merge --no-ff` + `git branch -d` with a sequence that: commits artifacts, pushes the phase branch, and does NOT merge or delete.

#### Implementation Notes
- Source: `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/workflows/router/*/workflow.md`
- In each workflow, locate the Phase Completion section (typically the last numbered step)
- Remove: `git checkout {audience}`, `git merge --no-ff`, `git branch -d`
- Replace with: `git push origin {phase_branch}`
- Add comment: `# REQ-7: Never auto-merge. PR created in S1.2.`

#### Files Changed
| File | Section |
|------|---------|
| `workflows/router/pre-plan/workflow.md` | Phase Completion |
| `workflows/router/spec/workflow.md` | Phase Completion |
| `workflows/router/plan/workflow.md` | Phase Completion |
| `workflows/router/tech-plan/workflow.md` | Phase Completion |
| `workflows/router/story-gen/workflow.md` | Phase Completion |
| `workflows/router/review/workflow.md` | Phase Completion |
| `workflows/router/dev/workflow.md` | Phase Completion |

#### Acceptance Criteria
- [ ] No phase router contains `git merge` in its completion section
- [ ] All routers push the phase branch after committing
- [ ] Phase branches remain alive after workflow completion

---

### S1.2: Create PR Creation Script (PAT + Fallback)

**Epic:** E1 — Phase Governance & PR Automation  
**Effort:** Large  
**REQ:** REQ-8

#### Description
Create `scripts/create-pr.sh` — a helper that creates GitHub PRs via the REST API using a PAT stored in `personal/github-credentials.yaml`. If no PAT is configured, output a manual compare URL instead.

#### Implementation Notes
- Source: `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/scripts/create-pr.sh` (NEW)
- Input: head_branch, base_branch, title, body
- Logic:
  1. Read PAT from `_bmad-output/lens-work/personal/github-credentials.yaml`
  2. Extract owner/repo from `git remote get-url origin`
  3. `curl -s -X POST -H "Authorization: token ${PAT}" ...`
  4. Parse JSON response for `html_url`
  5. If no PAT or no remote: print `Create PR manually: {compare_url}`
- Exit code: 0 = PR created, 1 = manual fallback
- Also update `agents/casey.agent.yaml` to add `create-pr` hook that calls this script

#### Files Changed
| File | Change |
|------|--------|
| `scripts/create-pr.sh` | **New** — PR creation with PAT+curl or fallback |
| `agents/casey.agent.yaml` | Add `create-pr` hook referencing the script |

#### Acceptance Criteria
- [ ] Script creates PR via GitHub API when PAT is available
- [ ] Script prints manual compare URL when no PAT or no remote
- [ ] PR title includes phase number and initiative name
- [ ] PR body includes phase summary and artifact list
- [ ] Exit code distinguishes success from fallback
- [ ] Casey agent has `create-pr` hook that invokes the script

---

### S1.3: Add Pre-Flight Checklist to All Phase Routers

**Epic:** E1 — Phase Governance & PR Automation  
**Effort:** Medium  
**REQ:** REQ-9

#### Description
Add a mandatory pre-flight section at the top of every phase router workflow. This section verifies the correct branch exists, creates it if needed, checks it out, and confirms to the user before proceeding to any artifact work.

#### Implementation Notes
- Source: Each `workflows/router/*/workflow.md`
- Insert immediately after the `## Execution Sequence` heading, before any artifact work
- Pre-flight block:
  ```yaml
  # PRE-FLIGHT (mandatory, never skip) [REQ-9]
  # 1. Verify current branch
  # 2. Check previous phase status
  # 3. Checkout audience branch
  # 4. Create new phase branch: {featureBranchRoot}-{audience}-p{N}
  # 5. Checkout new phase branch
  # 6. Confirm to user: "Now on branch: {branch_name}"
  # GATE: All steps must pass before proceeding
  ```
- The pre-flight MUST execute before Step 0 (Git Discipline) or be merged into it

#### Files Changed
Same 7 phase routers as S1.1

#### Acceptance Criteria
- [ ] Pre-flight checklist present in all 7 phase routers
- [ ] Branch creation is a hard gate — workflow fails if branch cannot be created
- [ ] User sees "Now on branch: {name}" before any artifact generation
- [ ] State.yaml updated to new phase before artifact work begins

---

### S1.4: Extend State Machine with `pr_pending` Status

**Epic:** E1 — Phase Governance & PR Automation  
**Effort:** Small  
**REQ:** REQ-7, REQ-8

#### Description
Add `pr_pending` as a valid phase status between `in_progress` and `complete`. When a phase completes and a PR is created, the phase enters `pr_pending`. It moves to `complete` only after the PR is merged.

#### Implementation Notes
- Update initiative config schema to accept `pr_pending`
- Phase completion sets status to `pr_pending` (not `complete`)
- Store `pr_url` in initiative config under `phases.p{N}.pr_url`
- Tracey agent must recognize and handle `pr_pending` status

#### Files Changed
| File | Change |
|------|--------|
| `agents/tracey.agent.yaml` or state management logic | Accept `pr_pending` as valid status |
| All phase router workflows | Set `pr_pending` on completion instead of `complete` |

#### Acceptance Criteria
- [ ] `pr_pending` is a valid phase status
- [ ] Phase completion sets `pr_pending`, not `complete`
- [ ] `pr_url` stored in initiative config
- [ ] State reflects `pr_pending` until PR is merged

---

### S1.5: Add Next-Phase PR-Merge Validation

**Epic:** E1 — Phase Governance & PR Automation  
**Effort:** Small  
**REQ:** REQ-7, REQ-9

#### Description
When a user enters the next phase (e.g., `/spec` after `/pre-plan`), check whether the previous phase's PR has been merged. If not, warn the user and provide the PR URL.

#### Implementation Notes
- In each phase router's pre-flight section:
  1. Load initiative config
  2. Check `phases.p{N-1}.status`
  3. If `pr_pending`: check if audience branch contains the phase commits (`git merge-base --is-ancestor`)
  4. If merged → mark `complete`, proceed
  5. If not merged → warn: "Previous phase PR not merged: {pr_url}"

#### Acceptance Criteria
- [ ] Next phase detects un-merged previous phase PR
- [ ] User gets clear warning with PR URL
- [ ] Merged PRs are auto-detected and marked `complete`

---

## E2 Stories

### S2.1: Remove Random Suffix from Feature Initiative IDs

**Epic:** E2 — Initiative ID Cleanup  
**Effort:** Small  
**REQ:** REQ-1

#### Description
In the init-initiative workflow, replace `openssl rand -hex 3` ID generation with sanitized name only for feature-level initiatives.

#### Implementation Notes
- Source: `workflows/router/init-initiative/workflow.md`
- Step 2: Change from `id = sanitize(name) + "-" + random_hex(3)` to `id = sanitize(name)`
- Domain and service IDs are already correct — only feature needs this change

#### Acceptance Criteria
- [ ] Feature initiative ID = sanitized name only (no hex suffix)
- [ ] Domain/service IDs unchanged

---

### S2.2: Add Duplicate Initiative Detection

**Epic:** E2 — Initiative ID Cleanup  
**Effort:** Small  
**REQ:** REQ-1

#### Description
Before creating a new initiative, check if `initiatives/{id}.yaml` already exists. If so, prompt the user to choose a different name.

#### Implementation Notes
- Source: `workflows/router/init-initiative/workflow.md`
- After generating `id`, check: `file_exists("_bmad-output/lens-work/initiatives/{id}.yaml")`
- If exists: error with message and exit
- User must provide a different name or archive the existing initiative

#### Acceptance Criteria
- [ ] Duplicate initiatives detected before creation
- [ ] User-facing error message with guidance
- [ ] No overwriting of existing initiative configs

---

### S2.3: Add Jira Ticket ID to Initiative ID

**Epic:** E2 — Initiative ID Cleanup  
**Effort:** Small  
**REQ:** REQ-1, REQ-3

#### Description
When the user's tracker preference is `jira`, prompt for an optional Jira ticket ID during feature creation. If provided, prepend it to the initiative ID.

#### Implementation Notes
- Source: `workflows/router/init-initiative/workflow.md`
- Step 1: Read `preferences.tracker` from profile
- If `jira`: prompt `Jira ticket (optional, e.g., BMAD-123):`
- If provided: `id = "{jira_ticket}-{sanitize(name)}"` (e.g., `BMAD-123-onboarding-enhancements`)
- Store `jira_ticket` in initiative config

#### Dependencies
- S3.2 (tracker preference) must be implemented first

#### Acceptance Criteria
- [ ] Jira ticket prompt shown only when tracker=jira
- [ ] Jira ID prepended to initiative ID when provided
- [ ] `jira_ticket` field stored in initiative config

---

### S2.4: Add Profile Anti-Pattern Warning to Onboarding

**Epic:** E2 — Initiative ID Cleanup  
**Effort:** Small  
**REQ:** REQ-4

#### Description
Add an explicit `# ANTI-PATTERN` comment block to the onboarding workflow source that warns against creating files in `profiles/` directory. Only `personal/profile.yaml` should be used for user preferences.

#### Implementation Notes
- Source: `workflows/utility/onboarding/workflow.md`
- Add block near the profile write step:
  ```
  # ANTI-PATTERN: Do NOT create profiles/*.yaml files.
  # User preferences go ONLY in: personal/profile.yaml
  # Team roster info goes in: roster/{name}.yaml
  # The profiles/ directory must NOT exist.
  ```

#### Acceptance Criteria
- [ ] Anti-pattern warning present in onboarding workflow source
- [ ] Only `personal/profile.yaml` referenced for profile storage
- [ ] No `profiles/` directory created during fresh onboarding

---

## E3 Stories

### S3.1: Add Question Mode Prompt to Onboarding

**Epic:** E3 — Onboarding Profile Enhancements  
**Effort:** Small  
**REQ:** REQ-2

#### Description
After the PAT section in onboarding, ask the user how they'd like to answer phase questions: Interactive (guided chat) or Batch MD (single markdown file per phase).

#### Implementation Notes
- Source: `workflows/utility/onboarding/workflow.md`
- Prompt text:
  ```
  How would you like to answer phase questions?
  [1] Interactive (guided chat — recommended)
  [2] Batch MD (single markdown file per phase)
  ```
- Store as `preferences.question_mode: "interactive"` or `"batch"`
- Default to `interactive` if not answered

#### Acceptance Criteria
- [ ] Onboarding asks for question mode preference
- [ ] Value stored in `personal/profile.yaml` under `preferences.question_mode`
- [ ] Default is `interactive`

---

### S3.2: Add Tracker Preference Prompt to Onboarding

**Epic:** E3 — Onboarding Profile Enhancements  
**Effort:** Small  
**REQ:** REQ-3

#### Description
Ask the user what work item tracker they use during onboarding. If Jira is selected, also ask for an optional Jira base URL.

#### Implementation Notes
- Source: `workflows/utility/onboarding/workflow.md`
- Prompt:
  ```
  What work item tracker do you use?
  [1] Jira
  [2] Azure DevOps
  [3] None
  ```
- If Jira: `Jira base URL (optional):`
- Store as `preferences.tracker` and optionally `preferences.jira_base_url`

#### Acceptance Criteria
- [ ] Onboarding asks for tracker preference
- [ ] If Jira: asks for optional base URL
- [ ] Values stored in `personal/profile.yaml` under `preferences`

---

### S3.3: Auto-Create TargetProjects Directory

**Epic:** E3 — Onboarding Profile Enhancements  
**Effort:** XS  
**REQ:** REQ-5

#### Description
Immediately after the user provides the TargetProjects path during onboarding, run `mkdir -p` to ensure it exists.

#### Implementation Notes
- Source: `workflows/utility/onboarding/workflow.md`
- After path is provided, before any discovery:
  ```bash
  mkdir -p "${target_path}"
  ```
- Idempotent — no error if already exists

#### Acceptance Criteria
- [ ] TargetProjects directory auto-created during onboarding
- [ ] No failure if directory already exists
- [ ] Directory exists before repo discovery begins

---

### S3.4: Wire Profile Preferences into Init-Initiative

**Epic:** E3 — Onboarding Profile Enhancements  
**Effort:** Small  
**REQ:** REQ-2, REQ-3

#### Description
When creating a new domain/feature initiative, read `question_mode` and `tracker` from the user's profile and use as defaults.

#### Implementation Notes
- Source: `workflows/router/init-initiative/workflow.md`
- At the start of the feature flow:
  ```yaml
  profile = load("_bmad-output/lens-work/personal/profile.yaml")
  question_mode = profile.preferences.question_mode || "interactive"
  tracker = profile.preferences.tracker || "none"
  ```
- `question_mode` becomes the initiative's default (user can override)
- `tracker` triggers Jira ticket prompt (S2.3)

#### Acceptance Criteria
- [ ] Init-initiative reads profile preferences
- [ ] `question_mode` inherited as initiative default
- [ ] `tracker` value triggers appropriate prompts

---

## E4 Stories

### S4.1: Create Branch Topology Documentation

**Epic:** E4 — Documentation  
**Effort:** Small  
**REQ:** REQ-6

#### Description
Create a reference document explaining lens-work branch naming conventions, composition rules, and length guidelines.

#### Implementation Notes
- Source: `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/docs/branch-topology.md` (NEW)
- Contents:
  - Branch name composition: `{domain}-{service}-{initiative}-{audience}-p{N}-{workflow}`
  - Max recommended length: 128 chars
  - Tips: keep initiative names short, use abbreviations
  - Examples at each level

#### Acceptance Criteria
- [ ] Document created with branch naming rules
- [ ] Max length guidance included
- [ ] Practical examples provided
