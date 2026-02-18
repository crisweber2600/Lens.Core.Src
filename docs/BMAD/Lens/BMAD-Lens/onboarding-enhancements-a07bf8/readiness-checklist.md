# Readiness Checklist: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Phase:** P3 Solutioning  
**Date:** 2026-02-18  
**Status:** Draft

---

## 1. Artifact Completeness

| Artifact | Present | Reviewed |
|----------|---------|----------|
| Product Brief | ✅ | ✅ |
| PRD (9 REQs) | ✅ | ✅ |
| Architecture | ✅ | ✅ |
| Epics (4) | ✅ | ✅ Adversarial review passed |
| Stories (14) | ✅ | ✅ Adversarial review passed |
| Readiness Checklist | ✅ (this file) | — |

---

## 2. Epic Readiness

| Epic | Stories | All ACs Defined | Dependencies Clear | Implementable |
|------|---------|----------------|-------------------|---------------|
| E1: Phase Governance & PR Automation | 5 (S1.1–S1.5) | ✅ | ✅ | ✅ |
| E2: Initiative ID Cleanup | 3 (S2.1–S2.3) | ✅ | ✅ (S2.3 depends on S3.2) | ✅ |
| E3: Onboarding Profile Enhancements | 5 (S3.1–S3.4, S2.4) | ✅ | ✅ | ✅ |
| E4: Documentation | 1 (S4.1) | ✅ | ✅ | ✅ |

---

## 3. Story Dependencies

```
S1.1 (remove auto-merge)     ─┐
S1.2 (create-pr script)       ├─→ S1.4 (pr_pending status) ─→ S1.5 (merge validation)
S1.3 (pre-flight checklist)  ─┘

S2.1 (remove random suffix)  ─┐
S2.2 (duplicate detection)   ─┤─→ Can run in parallel
                              │
S3.1 (question mode)         ─┐
S3.2 (tracker preference)    ─┼─→ S3.4 (wire into init-initiative) ─→ S2.3 (Jira ticket in ID)
S3.3 (TargetProjects mkdir)  ─┤
S2.4 (anti-pattern warning)  ─┘

S4.1 (branch docs)           ─→ Independent, any time
```

---

## 4. Implementation Order (Recommended)

### Sprint 1: Foundation (E1)
| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | S1.1 | Remove auto-merge — behavioral prerequisite |
| 2 | S1.3 | Pre-flight checklist — structural prerequisite |
| 3 | S1.2 | PR creation script — replacement for merge |
| 4 | S1.4 | State machine extension — tracks PR status |
| 5 | S1.5 | Merge validation — closes the governance loop |

### Sprint 2: IDs & Onboarding (E2 + E3)
| Order | Story | Rationale |
|-------|-------|-----------|
| 6 | S2.1 | Remove random suffix |
| 7 | S2.2 | Duplicate detection (depends on cleaner IDs) |
| 8 | S3.1 | Question mode prompt |
| 9 | S3.2 | Tracker preference prompt |
| 10 | S3.3 | TargetProjects auto-create |
| 11 | S2.4 | Anti-pattern warning (onboarding file, grouped with E3) |
| 12 | S3.4 | Wire preferences into init-initiative |
| 13 | S2.3 | Jira ticket integration (depends on S3.2) |

### Sprint 3: Docs (E4)
| Order | Story | Rationale |
|-------|-------|-----------|
| 14 | S4.1 | Branch topology documentation |

---

## 5. Risk Checklist

| # | Risk | Mitigation | Status |
|---|------|-----------|--------|
| R1 | No git remote configured | Fallback to manual PR URL | ✅ Addressed in S1.2 |
| R2 | PAT expired or missing | Two-tier fallback (PAT → manual) | ✅ Addressed in S1.2 |
| R3 | Duplicate initiative names after suffix removal | Duplicate check in S2.2 | ✅ Addressed |
| R4 | Phase branch skipped during transition | Pre-flight hard gate in S1.3 | ✅ Addressed |
| R5 | Agent writes to wrong profile path | Anti-pattern warning in S2.4 | ✅ Addressed |
| R6 | TargetProjects path doesn't exist | Auto-create in S3.3 | ✅ Addressed |

---

## 6. Constitutional Compliance

| Check | Status |
|-------|--------|
| All source changes target `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/` | ✅ |
| Module Builder (Morgan) designated for structural file changes | ✅ |
| No direct `_bmad/` edits in any story | ✅ |
| New script (`create-pr.sh`) requires Module Builder | ✅ Noted in S1.2 |

---

## 7. Definition of Done

- [ ] All 14 stories implemented in source directory
- [ ] Module built and synced to `_bmad/lens-work/`
- [ ] All acceptance criteria verified manually
- [ ] No `profiles/` directory in fresh onboarding
- [ ] PR created (not local merge) after every phase test
- [ ] Pre-flight checklist blocks artifact generation when branch missing
- [ ] Branch topology documented

---

## 8. Open Questions

| # | Question | Answer |
|---|----------|--------|
| Q1 | Should `pr_pending` block the next phase entirely, or just warn? | TBD — current design: warn but allow if commits are on audience branch |
| Q2 | Should we migrate the current initiative ID (`onboarding-enhancements-a07bf8`) to the new format? | Out of scope per PRD §5 |
| Q3 | Max characters for Jira ticket ID? | No constraint — user input as-is |
