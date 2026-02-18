# Architecture: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Layer:** Feature (Service parent: BMAD/Lens)  
**Phase:** P2 Planning  
**Date:** 2026-02-18  
**Author:** Cris Weber  
**Status:** Draft

---

## 1. System Context

```
┌───────────────────────────────────────────────────────────────────┐
│                          BMAD.Lens                                │
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │   Scout      │──▶│  Onboarding  │──▶│ personal/profile   │    │
│  │   Agent      │   │  Workflow    │   │   .yaml            │    │
│  └─────────────┘   └──────────────┘   └────────────────────┘    │
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │  Compass     │──▶│  Phase       │──▶│ initiative config  │    │
│  │  Agent       │   │  Routers     │   │   .yaml            │    │
│  └─────────────┘   └──────┬───────┘   └────────────────────┘    │
│                           │                                       │
│                           ▼                                       │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │  Casey       │──▶│  Git Ops     │──▶│ GitHub / Remote    │    │
│  │  Agent       │   │  + PR Create │   │                    │    │
│  └─────────────┘   └──────────────┘   └────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Change Map

### 2.1 Onboarding Workflow Changes

**Source:** `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/workflows/utility/onboarding/workflow.md`

```
BEFORE:
  Step 2: Ask role → scope → PAT → TargetProjects path → write profile

AFTER:
  Step 2: Ask role → scope → PAT → TargetProjects path
           → question_mode preference (interactive|batch)        [REQ-2]
           → tracker preference (jira|azdo|none)                 [REQ-3]
           → IF jira: jira_base_url (optional)                   [REQ-3]
           → mkdir -p TargetProjects path                        [REQ-5]
           → write profile (to personal/profile.yaml ONLY)       [REQ-4]
           → ANTI-PATTERN: never write to profiles/*.yaml        [REQ-4]
```

### 2.2 Init-Initiative Workflow Changes

**Source:** `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/workflows/router/init-initiative/workflow.md`

```
BEFORE (Feature creation):
  1. Ask feature name
  2. Generate ID: sanitize(name) + "-" + random_hex(3)
  3. Create branch topology

AFTER (Feature creation):
  1. Ask feature name
  1a. Read profile: preferences.tracker, preferences.question_mode  [REQ-2,3]
  1b. IF tracker=jira: Ask "Jira ticket (optional):"               [REQ-3]
  2. Generate ID:                                                    [REQ-1]
      IF jira_ticket → "{jira_ticket}-{sanitize(name)}"
      ELSE → "{sanitize(name)}"
  2a. Check existence: initiatives/{id}.yaml already exists?         [REQ-1]
      IF exists → error, ask for different name
  3. Create branch topology (with shorter names)
```

### 2.3 Phase Router Changes (All Routers)

**Source:** `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/workflows/router/*/workflow.md`

```
BEFORE (Phase Completion):
  1. Commit artifacts
  2. git checkout {audience_branch}
  3. git merge --no-ff {phase_branch}
  4. git branch -d {phase_branch}
  5. Update state

AFTER (Phase Completion):                                           [REQ-7,8]
  1. Commit artifacts
  2. git push origin {phase_branch}
  3. Invoke: casey.create-pr(phase_branch, audience_branch, context)
     → Uses PAT+curl if available, otherwise manual URL fallback
  4. Store pr_url in initiative config
  5. Update state (phase marked "pr_pending" not "complete")
  6. DO NOT merge, DO NOT delete branch
  7. Output PR URL to user

NEXT PHASE ENTRY (mandatory pre-flight):                            [REQ-9]
  1. Validate previous phase: pr_pending → check if PR merged
     → NOT merged: STOP, warn user
     → Merged (or first phase): continue
  2. git checkout {audience_branch}
  3. git pull origin {audience_branch}
  4. git checkout -b {initiative}-{audience}-p{N+1}
  5. Confirm to user: "Now on branch: {new_branch}"
  6. Update state.yaml: phase = p{N+1}, status = in_progress
  → GATE: Only after all 6 steps pass → begin artifact generation
```

---

## 3. New Component: PR Creation Script

**Location:** `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/scripts/create-pr.sh`

```
Input:
  $1 = head_branch (phase branch)
  $2 = base_branch (audience branch)
  $3 = title
  $4 = body
  $5 = labels (comma-separated)

Logic:
  1. Check: PAT file exists at _bmad-output/lens-work/personal/github-credentials.yaml
     → YES: extract PAT, extract owner/repo from git remote
     → curl POST /repos/{owner}/{repo}/pulls
     → Return PR URL
  
  2. Fallback (no PAT):
     → Extract remote URL
     → Print: "Create PR manually: {remote}/compare/{base}...{head}"

Output:
  - PR URL (stdout) on success
  - Exit code 0 = PR created, 1 = manual fallback
```

---

## 4. Data Flow: Profile Setup

```
User Input                    Storage                         Consumers
───────────                   ───────                         ─────────
role              ─────────▶  personal/profile.yaml           All agents
scope             ─────────▶    .role                         All agents
PAT               ─────────▶    .github.pat_configured        Casey
TargetProjects    ─────────▶    .project.target_path          Scout
question_mode  ★  ─────────▶    .preferences.question_mode    Phase routers
tracker        ★  ─────────▶    .preferences.tracker          Init-initiative
jira_base_url  ★  ─────────▶    .preferences.jira_base_url    Init-initiative

★ = new fields
```

---

## 5. Data Flow: Phase Completion

```
Phase Router
    │
    ├── 1. git add + commit (all artifacts)
    │
    ├── 2. git push origin {phase_branch}
    │
    ├── 3. Casey Agent: create-pr
    │       │
    │       ├── Try: curl + PAT ...
    │       │     └── Success → PR URL
    │       │
    │       └── Fallback (no PAT): manual URL
    │             └── Print compare URL
    │
    ├── 4. Store pr_url in initiative config
    │
    ├── 5. Update state.yaml
    │       phase_status: "pr_pending"
    │
    └── 6. Output to user:
            "✅ Phase P{N} complete. PR created: {url}"
            "⏳ Waiting for PR review before proceeding."
```

---

## 6. State Machine Update

### Phase Status Values

```
Current:   not_started → in_progress → complete
New:       not_started → in_progress → pr_pending → complete

pr_pending = artifacts committed, PR open, awaiting review/merge
complete   = PR merged (confirmed by checking branch state or PR status)
```

### Handling "Next Phase" After PR

When user invokes `/spec`, `/plan`, etc. while previous phase is `pr_pending`:

```
1. Check: Is the PR for the previous phase merged?
   → Check: Does the audience branch contain the phase commits?
     (git log {audience_branch} --oneline | grep {last_phase_commit})
   → YES: Mark previous phase "complete", proceed to next phase
   → NO: Warn user: "Previous phase PR not yet merged. Merge PR first: {pr_url}"
```

---

## 7. Files Changed Summary

| # | File (Source Path) | REQ | Change Type |
|---|-------------------|-----|-------------|
| 1 | `workflows/utility/onboarding/workflow.md` | 2,3,4,5 | Modified |
| 2 | `workflows/router/init-initiative/workflow.md` | 1,2,3 | Modified |
| 3 | `workflows/router/pre-plan/workflow.md` | 7,8,9 | Modified |
| 4 | `workflows/router/spec/workflow.md` | 7,8,9 | Modified |
| 5 | `workflows/router/plan/workflow.md` | 7,8,9 | Modified |
| 6 | `workflows/router/tech-plan/workflow.md` | 7,8,9 | Modified |
| 7 | `workflows/router/story-gen/workflow.md` | 7,8,9 | Modified |
| 8 | `workflows/router/review/workflow.md` | 7,8,9 | Modified |
| 9 | `workflows/router/dev/workflow.md` | 7,8,9 | Modified |
| 10 | `agents/casey.agent.yaml` | 8 | Modified |
| 11 | `scripts/create-pr.sh` | 8 | **New** |
| 12 | `docs/branch-topology.md` | 6 | **New** |

---

## 8. Constitutional Compliance Verification

### Article I: Source-First Modification
- All 12 files target `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/`
- No direct edits to `_bmad/lens-work/` (runtime copy)

### Article II: Module Builder Requirement
- `scripts/create-pr.sh` (new file) requires Module Builder (Morgan)
- `agents/casey.agent.yaml` modification requires Module Builder
- Workflow modifications use standard workflow-editor protocol

---

## 9. Testing Strategy

| Test | Scope | Method |
|------|-------|--------|
| Onboarding with all new prompts | REQ-2,3,4,5 | Manual: run onboarding from scratch |
| Feature init without Jira | REQ-1 | Manual: `/new-feature` with no tracker |
| Feature init with Jira | REQ-1,3 | Manual: `/new-feature` with tracker=jira |
| Duplicate initiative detection | REQ-1 | Manual: create same-named feature twice |
| Phase completion → PR (PAT) | REQ-7,8 | Manual: complete a phase with PAT configured |
| Phase completion → fallback | REQ-8 | Manual: complete a phase without PAT |
| Next phase after PR pending | REQ-7 | Manual: try `/spec` before PR merged |
| Profile anti-pattern | REQ-4 | Verify no `profiles/` directory created |
