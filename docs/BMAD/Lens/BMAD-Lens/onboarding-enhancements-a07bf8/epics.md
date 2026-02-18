# Epics: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Phase:** P3 Solutioning  
**Date:** 2026-02-18  
**Status:** Draft

---

## Epic Map

| Epic | Title | REQs | Priority | Effort |
|------|-------|------|----------|--------|
| E1 | Phase Governance & PR Automation | REQ-7, REQ-8, REQ-9 | High | Large |
| E2 | Initiative ID Cleanup | REQ-1 | High | Medium |
| E3 | Onboarding Profile Enhancements | REQ-2, REQ-3, REQ-4, REQ-5 | Medium | Medium |
| E4 | Documentation | REQ-6 | Low | Small |
| E5 | Docs Path Restructuring | REQ-10, REQ-11 | Medium | Medium |

---

## E1: Phase Governance & PR Automation

**Priority:** High — Behavioral prerequisite for all other work  
**REQs:** REQ-7 (no auto-merge), REQ-8 (PR automation), REQ-9 (pre-flight enforcement)

### Description

Replace local auto-merge with PR-based phase completion across all 7 phase router workflows. Add a mandatory pre-flight checklist to every phase router to ensure branch creation is never skipped during phase transitions. Introduce a `create-pr.sh` script that uses PAT+curl (with manual URL fallback) to auto-create PRs.

### Scope

- **7 phase routers** modified: pre-plan, spec, plan, tech-plan, story-gen, review, dev
- **1 new script**: `scripts/create-pr.sh`
- **Casey agent** updated with `create-pr` hook
- **State machine** extended: add `pr_pending` status
- **Pre-flight checklist** added to every phase router

### Acceptance Criteria

- [ ] No phase router performs local `git merge`
- [ ] All phase completions push + create PR (or print manual URL)
- [ ] PR URL stored in initiative config under `phases.p{N}.pr_url`
- [ ] Every phase router has mandatory pre-flight: verify branch → create branch → confirm to user → then work
- [ ] Branch creation is a hard gate — no artifacts generated without phase branch
- [ ] State includes `pr_pending` between `in_progress` and `complete`
- [ ] Next phase checks if previous PR was merged before proceeding

### Dependencies

- GitHub PAT (onboarding already collects it)
- Casey agent infrastructure

### Risks

- No remote configured → graceful fallback to manual URL
- PAT expired → fallback to manual URL with clear messaging

---

## E2: Initiative ID Cleanup

**Priority:** High  
**REQs:** REQ-1 (remove random suffix)

### Description

Remove the random hex suffix from feature initiative IDs, making them human-readable and concise. Add duplicate detection. If the user's tracker preference is Jira, prepend the Jira ticket ID.

### Scope

- **init-initiative workflow** modified: ID generation, duplicate check, Jira ticket prompt

### Acceptance Criteria

- [ ] Feature initiative IDs have no random suffix (e.g., `onboarding-enhancements` not `onboarding-enhancements-a07bf8`)
- [ ] Duplicate initiative names detected and rejected with user-facing error
- [ ] Jira ticket ID prepended when `tracker=jira` (e.g., `BMAD-123-onboarding-enhancements`)

### Dependencies

- REQ-3 (tracker preference) for Jira integration — but ID cleanup can proceed independently

---

## E3: Onboarding Profile Enhancements

**Priority:** Medium  
**REQs:** REQ-2 (question mode), REQ-3 (tracker preference), REQ-4 (profile anti-pattern), REQ-5 (TargetProjects auto-create)

### Description

Extend the onboarding workflow to collect two new user preferences — question mode (interactive vs batch) and work item tracker (Jira/Azure DevOps/None). Auto-create the TargetProjects directory immediately after the user provides the path. Eliminate the `profiles/*.yaml` anti-pattern by adding explicit warnings to the onboarding workflow.

### Scope

- **Onboarding workflow** modified: 3 new prompts added after PAT section, anti-pattern warning block added
- **Profile schema** extended: `preferences.question_mode`, `preferences.tracker`, `preferences.jira_base_url`
- **init-initiative workflow** modified: reads profile preferences as defaults
- **TargetProjects** `mkdir -p` added after path confirmation
- **Profile path enforcement**: only `personal/profile.yaml` — never `profiles/`

### Acceptance Criteria

- [ ] Onboarding asks question_mode (interactive recommended)
- [ ] Onboarding asks tracker preference (jira/azdo/none)
- [ ] If jira: asks for optional `jira_base_url`
- [ ] All new fields stored in `personal/profile.yaml` under `preferences`
- [ ] `/new-domain` and `/new-feature` inherit `question_mode` from profile as default
- [ ] TargetProjects directory created immediately via `mkdir -p` (idempotent)
- [ ] Anti-pattern warning in onboarding workflow source prevents `profiles/` directory creation
- [ ] No `profiles/*.yaml` files created during fresh onboarding

### Dependencies

- None — can be implemented independently

---

## E4: Documentation

**Priority:** Low  
**REQs:** REQ-6 (branch name length guidelines)

### Description

Create a `branch-topology.md` document in the lens-work docs explaining how branch names are composed, maximum recommended length (128 chars), and tips for keeping names short.

### Scope

- **1 new file**: `docs/branch-topology.md`

### Acceptance Criteria

- [ ] Document exists with branch name composition rules
- [ ] Maximum recommended length documented (128 chars for most git hosts)
- [ ] Tips section with abbreviation recommendations
- [ ] Examples of branch names at each topology level

### Dependencies

- None

---

## E5: Docs Path Restructuring

**Priority:** Medium  
**REQs:** REQ-10 (BmadDocs relocation), REQ-11 (type-discriminator directories)  
**Added:** Correct-course change proposal (pre-Sprint 1)

### Description

Restructure the docs path hierarchy to insert type-discriminator segments (`repo/`, `feature/`) that make entity types unambiguous at every level. Additionally, co-locate per-initiative BMAD output (initiative config, dev stories) with planning docs under a `BmadDocs/` subfolder, reducing the split between `_bmad-output/` and `docs/`.

### Scope

- **init-initiative workflow** modified: Step 4a docs_path composition adds `repo/` and `feature/` discriminators; computes and stores `bmad_docs` path
- **Initiative config schema** extended: `docs.bmad_docs` field added
- **Review workflow** modified: dev-story and sprint-backlog output path uses `bmad_docs`
- **Dev workflow** modified: reads dev stories from `bmad_docs`
- **All router workflows**: replace `_bmad-output/implementation-artifacts/` references with `bmad_docs`

### Path Examples

| Layer | Current | New |
|---|---|---|
| Repo | `docs/BMAD/Lens/BMAD-Lens/` | `docs/BMAD/Lens/repo/BMAD-Lens/` |
| Feature (repo) | `docs/BMAD/Lens/BMAD-Lens/onboarding-enhancements/` | `docs/BMAD/Lens/repo/BMAD-Lens/feature/onboarding-enhancements/` |
| BmadDocs | `_bmad-output/implementation-artifacts/` | `docs/.../feature/onboarding-enhancements/BmadDocs/` |

### Acceptance Criteria

- [ ] `repo/` segment inserted before repo name in docs path
- [ ] `feature/` segment inserted before feature ID in docs path
- [ ] Domain and service levels unchanged
- [ ] Per-initiative config stored at `{docs_path}/BmadDocs/initiative.yaml`
- [ ] Dev stories and sprint backlog written to `{docs_path}/BmadDocs/`
- [ ] Global files (`state.yaml`, `event-log.jsonl`) remain in `_bmad-output/lens-work/`
- [ ] `docs.bmad_docs` field in initiative config schema

### Dependencies

- REQ-1 (initiative ID cleanup) — docs path incorporates the initiative ID
- init-initiative workflow — same Step 4a being modified by E2

### Risks

- Existing initiatives have old-format paths — need migration note or backward-compat fallback
