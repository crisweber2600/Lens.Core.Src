---
layer: service
name: "lens"
created_by: "Cris Weber"
ratification_date: "2026-02-18"
last_amended: null
amendment_count: 0
---

# Service Constitution: Lens

**Inherits From:** Domain constitution (resolved via `/resolve`)
**Version:** 1.0.0
**Ratified:** 2026-02-18
**Last Amended:** —

---

## Preamble

This constitution governs the Lens Workbench service and all features within its bounded context. Lens is for modifying the source of the BMAD process. Whenever unexpected chats or unexpected behavior is encountered, modifications SHALL NOT be made to `_bmad`. Instead, modifications SHALL be made to `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work` and agents SHALL prompt for a reinstall. This ensures source-of-truth integrity and reproducible deployments.

---

## Inherited Articles

*All articles from the Domain Constitution apply automatically. Run `/resolve` to see the full accumulated ruleset.*

---

## Service Articles

### Article I: Source-First Modification Protocol

All lens-work behavioral modifications SHALL be made to source files in `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work`. The installed `_bmad/lens-work/` directory SHALL NOT be modified directly. After source changes, agents SHALL prompt the user to run the reinstall workflow.

**Rationale:** Direct modification of `_bmad/` creates drift from source-of-truth and makes changes non-reproducible across team members. Source-first ensures version control, peer review, and proper installation workflow.

**Evidence Required:** Git history shows no commits to `_bmad/lens-work/` except via module installer; all feature changes trace to `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work`.

---

### Article II: Module Builder Agent Requirement

All modifications to the Lens module SHALL use the Module Builder agent (Morgan) as defined in `_bmad/bmb/agents/module-builder.md`. Direct ad-hoc modifications outside the Module Builder workflow are prohibited.

**Rationale:** The Module Builder agent ensures architectural consistency, proper integration patterns, and adherence to BMAD Core systems. It enforces modularity, reusability, and maintains the module lifecycle from creation to maintenance.

**Evidence Required:** All Lens module changes trace to Module Builder workflows (PB, CM, EM, VM commands); no standalone modifications to module files outside Module Builder context.

---

### Article Enforcement Levels

By default, all articles are **MANDATORY** — violations produce **FAIL** (blocking) during compliance checks.

To make an article advisory (non-blocking), add `(ADVISORY)` suffix to the article header.

- **MANDATORY** (default) — Violations produce FAIL, block compliance
- **(ADVISORY)** — Violations produce WARN only, non-blocking

---

## Amendments

(none)

---

## Rationale

This service-level constitution establishes the Lens Workbench as a first-class BMAD module with source-driven development discipline. It prevents configuration drift, ensures proper architectural oversight via Module Builder workflows, and maintains the distinction between source (`TargetProjects/`) and installed artifacts (`_bmad/`).

---

## Governance

### Amendment Process

1. Propose amendment via `/constitution` amend mode
2. Require approval from Service Owner
3. Notify dependent features of changes
4. Ratify with Service Owner approval — Scribe records and Casey commits

### Service Owner

- Name: Cris Weber

---

_Constitution ratified on 2026-02-18_
