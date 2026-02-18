# Sprint Backlog: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Approved:** 2026-02-18  
**Gate:** Implementation Gate — passed_with_warnings  
**Reviewer:** Scrum Master

---

## Sprint 1: Phase Governance & PR Automation (E1)

| Order | Story | Title | Effort | Status |
|-------|-------|-------|--------|--------|
| 1 | S1.1 | Remove auto-merge from all phase routers | M | 📝 Dev-ready |
| 2 | S1.3 | Add pre-flight checklist to all phase routers | M | Queued |
| 3 | S1.2 | Create PR creation script (PAT + fallback) | L | Queued |
| 4 | S1.4 | Extend state machine with `pr_pending` status | S | Queued |
| 5 | S1.5 | Add next-phase PR-merge validation | S | Queued |

**Sprint 1 Goal:** Eliminate local auto-merge, enforce PR-based phase transitions.

---

## Sprint 2: IDs, Onboarding & Docs Path (E2 + E3 + E5)

| Order | Story | Title | Effort | Status |
|-------|-------|-------|--------|--------|
| 6 | S2.1 | Remove random suffix from feature initiative IDs | S | Queued |
| 7 | S2.2 | Add duplicate initiative detection | S | Queued |
| 8 | S3.1 | Add question mode prompt to onboarding | S | Queued |
| 9 | S3.2 | Add tracker preference prompt to onboarding | S | Queued |
| 10 | S3.3 | Auto-create TargetProjects directory | XS | Queued |
| 11 | S2.4 | Add profile anti-pattern warning to onboarding | S | Queued |
| 12 | S3.4 | Wire profile preferences into init-initiative | S | Queued |
| 13 | S2.3 | Add Jira ticket ID to initiative ID | S | Queued |
| 14 | S5.1 | Add type-discriminator directories to docs path | S | Queued |
| 15 | S5.2 | Relocate per-initiative output to BmadDocs | M | Queued |

**Sprint 2 Goal:** Clean up initiative IDs, enhance onboarding profile collection, and restructure docs path hierarchy.

---

## Sprint 3: Documentation (E4)

| Order | Story | Title | Effort | Status |
|-------|-------|-------|--------|--------|
| 16 | S4.1 | Create branch-topology.md documentation | S | Queued |

**Sprint 3 Goal:** Document branch naming conventions and topology.

---

## Capacity Notes

- Sprint 1 is the heaviest (1L + 2M + 2S) — gates all subsequent work
- Sprint 2 has 10 stories but all are S/XS except S5.2 (M) — parallelizable after S3.2; E5 stories at end
- Sprint 3 is documentation only — can overlap with Sprint 2 if needed

---

## Warnings

- **Product Brief missing** — PRD (430 lines, 9 REQs) serves as de facto requirements document
- **Gate status:** `passed_with_warnings` due to missing product brief artifact
