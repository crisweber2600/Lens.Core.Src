# PRD: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Layer:** Feature (Service parent: BMAD/Lens)  
**Phase:** P2 Planning  
**Date:** 2026-02-18  
**Author:** Cris Weber  
**Status:** Draft

---

## 1. Overview

Improve the lens-work first-run onboarding and initiative creation experience by addressing 8 friction points identified during real user testing. Changes target the source at `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/` (per constitution Article I).

---

## 2. Requirements

### REQ-1: Remove Random Suffix from Initiative IDs (FP-1)

**Priority:** High  
**Type:** Behavioral change

#### Current Behavior
Feature initiative IDs are generated as `{sanitized_name}-{random_6char}` (e.g., `onboarding-enhancements-a07bf8`).

#### Required Behavior
- Feature IDs use sanitized name only: `{sanitized_name}` (e.g., `onboarding-enhancements`)
- If user has Jira configured (see REQ-3), IDs become `{jira_item}-{sanitized_name}` (e.g., `BMAD-123-onboarding-enhancements`)
- If an initiative with the same sanitized name already exists, prompt user: "Initiative '{name}' already exists. Choose a different name or archive the existing one."

#### Affected Files
| File | Change |
|------|--------|
| `workflows/router/init-initiative/workflow.md` | Step 2: Replace `openssl rand -hex 3` with sanitized name only; add duplicate check |
| `workflows/router/init-initiative/workflow.md` | Step 1 (feature): Add Jira ticket prompt if tracker=jira |

#### Acceptance Criteria
- [ ] `initiative_id` has no random suffix
- [ ] Duplicate initiative names are detected and rejected
- [ ] Jira ticket ID is prepended when tracker preference is `jira`
- [ ] All downstream references (branch names, docs path) use the new shorter ID

---

### REQ-2: Add Question Mode Preference to Onboarding (FP-2)

**Priority:** Medium  
**Type:** New prompt in onboarding

#### Current Behavior
`question_mode` is only set during `/new-domain` and inherited downward. Onboarding doesn't ask.

#### Required Behavior
Add to onboarding profile setup (after role/scope/PAT):
```
How would you like to answer phase questions?
[1] Interactive (guided chat — recommended)
[2] Batch MD (single markdown file per phase)
```
- Store as `preferences.question_mode` in `personal/profile.yaml`
- Domain/service creation inherits from profile as default (user can override)

#### Affected Files
| File | Change |
|------|--------|
| `workflows/utility/onboarding/workflow.md` | Step 2: Add question_mode prompt after PAT section |
| `workflows/router/init-initiative/workflow.md` | Step 1a: Read `question_mode` from profile as default |

#### Acceptance Criteria
- [ ] Onboarding asks for question_mode preference
- [ ] Stored in `personal/profile.yaml` under `preferences.question_mode`
- [ ] `/new-domain` uses profile preference as default (interactive if not set)

---

### REQ-3: Add Work Item Tracker Preference to Onboarding (FP-3)

**Priority:** Medium  
**Type:** New prompt in onboarding + init-initiative integration

#### Current Behavior
No tracker awareness. No Jira/Azure DevOps integration.

#### Required Behavior
Add to onboarding profile setup:
```
What work item tracker do you use?
[1] Jira
[2] Azure DevOps
[3] None
```
- If Jira: also ask `Jira base URL (optional):` → store as `preferences.jira_base_url`
- Store as `preferences.tracker` in `personal/profile.yaml`
- When `/new-feature` runs and `tracker == "jira"`, prompt: `Jira ticket (optional, e.g., BMAD-123):`
- Use in initiative ID: `{jira_item}-{sanitized_name}`

#### Affected Files
| File | Change |
|------|--------|
| `workflows/utility/onboarding/workflow.md` | Step 2: Add tracker prompt |
| `workflows/router/init-initiative/workflow.md` | Step 1 (feature section): Add Jira ticket prompt |
| `workflows/router/init-initiative/workflow.md` | Step 2: Prepend Jira ID to initiative_id |

#### Acceptance Criteria
- [ ] Onboarding asks for tracker preference
- [ ] Tracker stored in `personal/profile.yaml`
- [ ] `/new-feature` prompts for Jira ticket when tracker=jira
- [ ] Jira ticket ID appears in initiative_id and branch names

---

### REQ-4: Eliminate Duplicate Profile File (FP-4)

**Priority:** High  
**Type:** Anti-pattern removal

#### Current Behavior
The source workflow correctly writes to `personal/profile.yaml` only. However, the agent runtime sometimes creates an additional `profiles/{name}.yaml` file.

#### Required Behavior
- Add explicit anti-pattern warning to onboarding workflow
- `_bmad-output/lens-work/profiles/` directory should NOT be created or referenced
- Only two user-related files exist:
  - `personal/profile.yaml` — personal preferences (gitignored)
  - `roster/{name}.yaml` — team stats (committed)

#### Affected Files
| File | Change |
|------|--------|
| `workflows/utility/onboarding/workflow.md` | Add `# ANTI-PATTERN` comment block |
| Agent prompts/instructions | Ensure no references to `profiles/` path |

#### Acceptance Criteria
- [ ] Anti-pattern warning present in onboarding workflow source
- [ ] No `profiles/` directory created during onboarding
- [ ] Profile data lives only in `personal/profile.yaml`

---

### REQ-5: Auto-Create TargetProjects Directory (FP-5)

**Priority:** Low  
**Type:** Defensive directory creation

#### Current Behavior
TargetProjects path is asked but not guaranteed to exist before discovery runs.

#### Required Behavior
- Immediately after user provides TargetProjects path, run `mkdir -p {path}`
- Also create `{path}/.gitkeep` if empty
- Add to onboarding between Step 2 and Step 3

#### Affected Files
| File | Change |
|------|--------|
| `workflows/utility/onboarding/workflow.md` | Add mkdir -p after path confirmation |

#### Acceptance Criteria
- [ ] TargetProjects directory auto-created during onboarding
- [ ] No failure if directory already exists

---

### REQ-6: Document Branch Name Length Guidelines (FP-6)

**Priority:** Low  
**Type:** Documentation only

#### Required Behavior
Add a section to lens-work docs documenting:
- Maximum recommended branch name length (128 chars for most git hosts)
- How branch names are composed: `{domain}-{service}-{initiative}-{audience}-p{N}-{workflow}`
- Tips: keep initiative names short, use abbreviations for domain/service prefixes

#### Affected Files
| File | Change |
|------|--------|
| `docs/branch-topology.md` or similar | Add length guidelines section |

#### Acceptance Criteria
- [ ] Documentation exists covering branch name composition and length limits

---

### REQ-7: Never Auto-Merge Phase Branches (FP-7)

**Priority:** High  
**Type:** Behavioral change across all phase routers

#### Current Behavior
Phase completion performs a local `git merge --no-ff` from phase branch into audience branch, then deletes the phase branch locally. This bypasses code review.

#### Required Behavior
- Phase completion must NEVER auto-merge
- Instead: commit work, push phase branch, then create a PR (see REQ-8)
- Phase branch remains alive until PR is merged by a reviewer
- After reviewer merges PR, agent can offer to clean up the local phase branch

#### Phase Completion Flow (New):
```
1. Commit all artifacts on phase branch
2. Push phase branch to remote
3. Create PR: {phase_branch} → {audience_branch} (via REQ-8)
4. Output PR URL to user
5. DO NOT merge locally
6. DO NOT delete phase branch
7. Checkout audience branch for convenience (read-only until PR merged)
```

#### Affected Files
| File | Change |
|------|--------|
| `workflows/router/pre-plan/workflow.md` | Step 5: Replace merge+delete with PR creation |
| `workflows/router/spec/workflow.md` | Step 5: Same change |
| `workflows/router/plan/workflow.md` | Phase completion: Same change |
| `workflows/router/tech-plan/workflow.md` | Phase completion: Same change |
| `workflows/router/story-gen/workflow.md` | Phase completion: Same change |
| `workflows/router/review/workflow.md` | Phase completion: Same change |
| `workflows/router/dev/workflow.md` | Phase completion: Same change |

#### Acceptance Criteria
- [ ] No phase router performs local merge
- [ ] All phase completions create PRs instead
- [ ] Phase branches remain until PR is merged
- [ ] Users see PR URL after phase completion

---

### REQ-8: Auto-Create PRs Using PAT After Phase Completion (FP-8)

**Priority:** High  
**Type:** New capability (PR automation)

#### Current Behavior
No automated PR creation. Users must manually create PRs on GitHub.

#### Required Behavior
After each phase/workflow completes:

1. **Check for PAT:** Load `_bmad-output/lens-work/personal/github-credentials.yaml`
2. **Create PR** using best available method:

**Method 1: GitHub API + PAT**
```bash
curl -s -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/{owner}/{repo}/pulls" \
  -d '{
    "title": "P{N} {phase_name}: {initiative_name}",
    "head": "{phase_branch}",
    "base": "{audience_branch}",
    "body": "Phase {N} ({phase_name}) complete.\nReview audience: {audience}."
  }'
```

**Method 2: Fallback (no PAT)**
```
📋 Create PR manually:
https://github.com/{owner}/{repo}/compare/{audience_branch}...{phase_branch}
```

4. **Store PR URL** in initiative config: `phases.p{N}.pr_url`
5. **Output PR link** to user

#### Affected Files
| File | Change |
|------|--------|
| `agents/casey.agent.yaml` | Add `create-pr` hook with PAT/fallback logic |
| `workflows/router/pre-plan/workflow.md` | Step 5: Invoke casey.create-pr |
| All phase router workflows | Phase completion: Invoke casey.create-pr |
| `scripts/create-pr.sh` (NEW) | Helper script for PR creation with PAT or manual fallback |

#### Acceptance Criteria
- [ ] PR auto-created when PAT is available
- [ ] Fallback URL printed when PAT is not configured
- [ ] PR URL stored in initiative config
- [ ] PR title/body include phase info and artifact list
- [ ] Works for all phase routers (pre-plan, spec, plan, tech-plan, story-gen, review, dev)
- [ ] No dependency on `gh` CLI — uses curl + PAT only

---

## 3. Data Model Changes

### personal/profile.yaml — New Fields

```yaml
preferences:
  communication_style: "professional"
  auto_fetch: true
  question_mode: "interactive"    # NEW (REQ-2): "interactive" | "batch"
  tracker: "jira"                 # NEW (REQ-3): "jira" | "azdo" | "none"
  jira_base_url: "https://mycompany.atlassian.net"  # NEW (REQ-3): optional
```

### initiatives/{id}.yaml — New Fields

```yaml
id: onboarding-enhancements       # CHANGED (REQ-1): no random suffix
jira_ticket: "BMAD-123"           # NEW (REQ-3): optional
phases:
  p1:
    status: complete
    pr_url: "https://github.com/..."  # NEW (REQ-8): PR URL from auto-creation
  p2:
    status: in_progress
    pr_url: null
```

---

## 4. Implementation Priority Order

| Order | REQ | Rationale |
|-------|-----|-----------|
| 1 | REQ-7 | No-auto-merge is a behavioral prerequisite for REQ-8 |
| 2 | REQ-8 | PR automation is the replacement for auto-merge |
| 3 | REQ-1 | Remove random suffix (cleaner IDs before more initiatives are created) |
| 4 | REQ-4 | Anti-pattern fix (prevents confusion immediately) |
| 5 | REQ-2 | Question mode in onboarding (moderate effort) |
| 6 | REQ-3 | Tracker preference (moderate effort, depends on REQ-1 for Jira ID) |
| 7 | REQ-5 | TargetProjects auto-create (simple) |
| 8 | REQ-6 | Branch name docs (simple, no code) |

---

## 5. Out of Scope

- Full Jira API integration (querying tickets, syncing status)
- Azure DevOps work item linking
- Migration utility for existing initiatives to new ID format
- Changes to domain/service initiative ID generation (already correct)
- PR auto-merge (PRs are for review — never auto-merge)

---

## 6. Constitutional Compliance

| Article | Compliance |
|---------|-----------|
| **I: Source-First Modification** | All changes target `src/modules/lens-work/` in BMAD.Lens. No direct `_bmad/` edits. |
| **II: Module Builder Requirement** | Morgan (Module Builder) will be used for structural changes to module files. |

---

## 7. Dependencies

- GitHub PAT — already collected during onboarding, stored in `personal/github-credentials.yaml`
- Casey agent — existing git orchestration infrastructure
- Scribe agent — existing constitutional compliance checking

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No PAT configured | PR creation falls back to manual URL | Clear fallback messaging |
| Branch name collision (no random suffix) | Duplicate initiative error | Duplicate check before creation |
| Phase branch not pushed | PR creation fails | Ensure push before PR create |
