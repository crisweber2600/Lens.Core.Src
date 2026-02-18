# Epic Adversarial Review: Onboarding Enhancements

**Initiative:** onboarding-enhancements-a07bf8  
**Phase:** P3 Solutioning  
**Date:** 2026-02-18  
**Review type:** Implementation Readiness (adversarial mode) + Constitutional Compliance  
**Scope:** All 4 epics (E1–E4), 14 stories, PRD, Architecture

---

## Constitutional Context (H3 Resolution)

### Constitution: Service — Lens (v1.0.0)

**Article I — Source-First Modification Protocol (MANDATORY)**
> All lens-work behavioral modifications SHALL be made to source files in `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work`. The installed `_bmad/lens-work/` directory SHALL NOT be modified directly.

**Article II — Module Builder Agent Requirement (MANDATORY)**
> All modifications to the Lens module SHALL use the Module Builder agent (Morgan). Direct ad-hoc modifications outside the Module Builder workflow are prohibited.

### Constitutional Compliance Check

| Epic | Art. I (Source-First) | Art. II (Module Builder) | Verdict |
|------|-----------------------|--------------------------|---------|
| E1 | ✅ All stories target `src/modules/lens-work/` source | ⚠️ S1.2 creates new script + agent config — requires Morgan | PASS with note |
| E2 | ✅ Targets `init-initiative/workflow.md` in source | ✅ Workflow edits use standard editor | PASS |
| E3 | ✅ Targets `onboarding/workflow.md` + `init-initiative/workflow.md` in source | ✅ Workflow edits use standard editor | PASS |
| E4 | ✅ New doc in source `docs/` | ✅ No structural changes | PASS |

**Constitutional finding:** S1.2 (create-pr.sh) and the Casey agent config change are correctly flagged as requiring Module Builder in the readiness checklist. No constitutional violations found.

---

## E1: Phase Governance & PR Automation — Adversarial Review

### Implementation Readiness: PASS (with 2 advisory findings)

**Strengths:**
- Clear decomposition into 5 stories with logical dependency chain
- All 7 phase routers identified with correct names
- Fallback architecture (PAT → manual URL) handles the no-remote case
- State machine extension (`pr_pending`) is well-defined with clear transitions

**Advisory findings:**

**E1-A1: `init-initiative` router not addressed**
The `init-initiative` router also exists in the router directory. It doesn't have a "phase completion" section like the others (it creates the initiative, not a phase), so excluding it is correct. However, this should be explicitly documented in E1 scope to prevent confusion.

**E1-A2: Casey agent modification scope unclear**
S1.2 says "update `agents/casey.agent.yaml` to add `create-pr` hook" but doesn't specify whether this is a YAML config change or requires new agent behavior logic. If it's a behavioral change to Casey's agent definition, Article II requires Module Builder. The readiness checklist notes this but the story itself should call it out.

**Acceptance criteria coverage:**
| AC | Covered by Story | Testable | Complete |
|----|-----------------|----------|----------|
| No git merge in routers | S1.1 | ✅ grep for `git merge` | ✅ |
| Push + create PR | S1.1 + S1.2 | ✅ run phase, check PR | ✅ |
| PR URL stored | S1.2 + S1.4 | ✅ check initiative config | ✅ |
| Pre-flight in all routers | S1.3 | ✅ verify section exists | ✅ |
| Hard gate on branch | S1.3 | ✅ test without branch | ✅ |
| pr_pending status | S1.4 | ✅ check state after phase | ✅ |
| Next-phase merge check | S1.5 | ✅ try next phase without merge | ✅ |

---

## E2: Initiative ID Cleanup — Adversarial Review

### Implementation Readiness: PASS (with 1 advisory finding)

**Strengths:**
- Clean separation: S2.1 (remove suffix), S2.2 (dup check), S2.3 (Jira prefix)
- Correct that only feature IDs change (domain/service unchanged)
- Dependency on S3.2 (tracker preference) properly declared for S2.3

**Advisory finding:**

**E2-A1: Branch name backward compatibility not addressed**
When IDs get shorter, existing branches with the old format (e.g., `bmad-lens-onboarding-enhancements-a07bf8-*`) will not match the new pattern. The PRD §5 says "Migration of existing initiative IDs is out of scope," which is correct — but the stories should note that the branch topology lookup must handle both old-format and new-format IDs gracefully during the transition period.

**Acceptance criteria coverage:**
| AC | Covered by Story | Testable | Complete |
|----|-----------------|----------|----------|
| No hex suffix | S2.1 | ✅ create feature, check ID | ✅ |
| Duplicate detection | S2.2 | ✅ create same name twice | ✅ |
| Jira prefix | S2.3 | ✅ set tracker=jira, create | ✅ |

---

## E3: Onboarding Profile Enhancements — Adversarial Review

### Implementation Readiness: PASS (with 1 advisory finding)

**Strengths:**
- All stories target the same two workflow files (onboarding + init-initiative) — good cohesion after M4 fix
- S2.4 (anti-pattern warning) now correctly grouped here since it modifies the onboarding workflow
- S3.3 (mkdir -p) is idempotent — safe to run repeatedly

**Advisory finding:**

**E3-A1: Batch mode template gap (carried from L1)**
S3.1 adds `question_mode` preference but no story creates the batch mode template files that phase routers reference when `question_mode == "batch"`. If a user selects batch mode during onboarding, the next phase invocation will fail looking for a missing template. Recommend adding a note to S3.1's AC or creating a follow-up story.

**Acceptance criteria coverage:**
| AC | Covered by Story | Testable | Complete |
|----|-----------------|----------|----------|
| Question mode prompt | S3.1 | ✅ run onboarding | ✅ |
| Tracker prompt | S3.2 | ✅ run onboarding | ✅ |
| Jira base URL | S3.2 | ✅ select jira | ✅ |
| Stored in profile | S3.1 + S3.2 | ✅ check yaml | ✅ |
| Preferences inherited | S3.4 | ✅ create feature, check defaults | ✅ |
| TargetProjects created | S3.3 | ✅ check dir exists | ✅ |
| Anti-pattern warning | S2.4 | ✅ check workflow source | ✅ |
| No profiles/ dir | S2.4 | ✅ fresh onboarding | ✅ |

---

## E4: Documentation — Adversarial Review

### Implementation Readiness: PASS

**Strengths:**
- Single self-contained story, no dependencies
- Clear acceptance criteria

**No findings.** This is a documentation-only epic with no behavioral impact.

---

## Cross-Epic Findings

### XE-1: Story S2.3 bridges E2 and E3 (dependency risk)
S2.3 (Jira ticket in ID) depends on S3.2 (tracker preference). Since these are in different epics that could theoretically be worked on by different agents, the dependency must be enforced at sprint planning level. The readiness checklist correctly places S2.3 after S3.2 in Sprint 2 order.

### XE-2: Seven routers × three changes = 21 file edits in E1
S1.1 (remove merge) + S1.3 (add pre-flight) both modify the same 7 router files. S1.2 adds a PR call to each. That's 21 modifications to 7 files, all in Sprint 1. This is manageable but should be done as a batch (modify each router once with all three changes) rather than three passes over 7 files.

---

## Summary

| Epic | Readiness | Constitutional | Advisories | Blocking Issues |
|------|-----------|----------------|------------|-----------------|
| E1 | ✅ PASS | ✅ PASS | 2 (E1-A1, E1-A2) | None |
| E2 | ✅ PASS | ✅ PASS | 1 (E2-A1) | None |
| E3 | ✅ PASS | ✅ PASS | 1 (E3-A1) | None |
| E4 | ✅ PASS | ✅ PASS | 0 | None |

**Overall verdict:** All 4 epics pass implementation readiness with 4 advisory findings. No blocking issues. Constitutional compliance verified against both Article I (Source-First) and Article II (Module Builder). Proceed to implementation.
