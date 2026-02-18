# Adversarial Re-Review Report — lens-work Module (lensv3 branch)

**Date:** 2026-02-06
**Scope:** Verify fixes from initial adversarial review
**Branch:** lensv3
**Verdict:** 🔴 **FAIL** — P0 fixes were NOT applied to `_bmad/lens-work/` files

---

## Executive Summary

The P1/P2 fixes (`update-lens` refs, `.lens/` paths) were successfully applied in the `src/modules/lens-work/docs/` layer. However, **the two P0 fixes (branch naming `lens/` → `{domain}/` and lane naming `lead` → `large`) were NOT applied at all** in the active `_bmad/lens-work/` module files. Every single file that had the original problem still has it.

---

## Verification Results

### CHECK 1: Remaining `lens/{` branch patterns — 🔴 FAIL

**Expected:** ZERO instances outside review doc and archive.
**Actual:** 12 active files, 40+ instances.

| File | Line(s) | Example |
|------|---------|---------|
| `_bmad/lens-work/module.yaml` | 167–171 | `lens/{initiative_id}/base`, `/small`, `/lead`, `/p{n}`, `/w/{name}` |
| `_bmad/lens-work/agents/compass.agent.yaml` | 41 | `If on lens/{id}/... branch` |
| `_bmad/lens-work/agents/compass.spec.md` | 117 | `lens/{id}/...` |
| `_bmad/lens-work/agents/casey.agent.yaml` | 48–57 | Branch topology diagram with `lens/{initiative_id}/...` |
| `_bmad/lens-work/agents/casey.spec.md` | 92–96 | `git checkout -b lens/{id}/base` (and small/lead/p1/w) |
| `_bmad/lens-work/workflows/core/git-lifecycle.spec.md` | 23, 72 | `lens/{id}/{lane}/p{phase}/w/{workflow_name}` |
| `_bmad/lens-work/workflows/core/init-initiative.spec.md` | 31–34 | Branch topology: `lens/{id}/base`, `/small`, `/lead` |
| `_bmad/lens-work/workflows/core/init-initiative/workflow.md` | 40–63, 87–88, 108–111 | 21 instances of `lens/${initiative_id}/...` |
| `_bmad/lens-work/workflows/utility/manual-operations.spec.md` | 132 | `lens/{id}/fix/{fix_id}` |
| `_bmad/lens-work/prompts/lens-work.new-domain.prompt.md` | 17 | `lens/{id}/base` |
| `_bmad/lens-work/prompts/lens-work.new-service.prompt.md` | 17 | `lens/{id}/base` |
| `_bmad/lens-work/prompts/lens-work.new-feature.prompt.md` | 17 | `lens/{id}/base` |

**Fix:** Global find-and-replace `lens/` → `{domain}/` in branch pattern context across all 12 files.

---

### CHECK 2: Remaining `lead` lane references — 🔴 FAIL

**Expected:** ZERO instances of `lead` as a lane name (excluding "leader", "Tech Lead" role).
**Actual:** 13+ active files, 30+ instances.

| File | Line(s) | Pattern | Should Be |
|------|---------|---------|-----------|
| `module.yaml` | 169 | `lead_lane: "lens/{id}/lead"` | `large_lane: "{domain}/{id}/large"` |
| `casey.agent.yaml` | 57 | `lens/{id}/lead` | `{domain}/{id}/large` |
| `casey.agent.yaml` | 102 | `action: open-lead-review` | `open-large-review` |
| `casey.agent.yaml` | 103 | `"PR link for small → lead"` | `small → large` |
| `casey.agent.yaml` | 105 | `event: lead-review-merged` | `large-review-merged` |
| `casey.agent.yaml` | 107 | `"PR link for lead → base"` | `large → base` |
| `casey.spec.md` | 94 | `git checkout -b lens/{id}/lead` | `{domain}/{id}/large` |
| `casey.spec.md` | 120 | `└── lead` | `└── large` |
| `casey.spec.md` | 129 | `Small → Lead` | `Small → Large` |
| `casey.spec.md` | 130 | `Lead → Base` | `Large → Base` |
| `init-initiative.spec.md` | 34 | `lens/{id}/lead # Lead review lane` | `{domain}/{id}/large # Large review lane` |
| `init-initiative.spec.md` | 42 | `Create lead lane from base` | `Create large lane from base` |
| `init-initiative/workflow.md` | 51–54, 110 | `lead` lane creation, checkout, output | `large` |
| `git-lifecycle.spec.md` | 107 | `small → lead for lead review` | `small → large for large review` |
| `git-lifecycle.spec.md` | 121, 125 | `Lead review merged`, `lead → base` | `Large review merged`, `large → base` |
| `phase-lifecycle/workflow.md` | 102–124 | `Open Lead Review`, `lead → base`, `lead reviewers` | `Open Large Review`, `large → base`, etc. |
| `router/spec/workflow.md` | 105, 110, 115–116 | `Lead Review`, `open-lead-review`, `small → lead` | `Large Review`, `open-large-review`, `small → large` |
| `router/plan/workflow.md` | 26, 38–39, 102 | `Lead review approved (small → lead)`, `lead → base` | `Large review approved (small → large)`, `large → base` |
| `router/review/workflow.md` | 32, 46 | `lead → base merged`, `lead → base PR` | `large → base` |
| `router/phase-commands.spec.md` | 72, 127 | `open-lead-review`, `open-final-pbr (if lead review)` | `open-large-review`, `(if large review)` |
| `prompts/lens-work.plan.prompt.md` | 16 | `Architecture approved by lead review` | `large review` |
| `prompts/lens-work.review.prompt.md` | 17, 24 | `Lead review merged`, `lead → base` | `Large review merged`, `large → base` |

**Fix:** Global find-and-replace `lead` → `large` in lane/branch context; update hook events and actions.

---

### CHECK 3: Remaining `update-lens` references — ✅ PASS

Only found in:
- `src/modules/lens-work/docs/reviews/adversarial-review-2026-02-06.md` (the original review doc) — expected
- `archive/` files — expected (historical)

**Zero instances in active `_bmad/lens-work/` files.** Fix confirmed.

---

### CHECK 4: Remaining `.lens/` path references — ✅ PASS

Only found in:
- `src/modules/lens-work/docs/reviews/adversarial-review-2026-02-06.md` (the original review doc) — expected
- `archive/` files — expected (historical)

**Zero instances in active `_bmad/lens-work/` files.** Fix confirmed.

---

### CHECK 5: module.yaml workflow_categories vs actual directories — 🔴 FAIL

**core category** lists 9 workflows but only 3 have directories:

| Workflow in module.yaml | Directory Exists? | Notes |
|------------------------|-------------------|-------|
| `init-initiative` | ✅ | Has workflow.md |
| `start-workflow` | ✅ | Has workflow.md |
| `finish-workflow` | ✅ | Has workflow.md |
| `detect-layer` | ❌ | No directory, no spec anywhere |
| `phase-transition` | ❌ | Covered by `phase-lifecycle/workflow.md` |
| `start-phase` | ❌ | Covered by `git-lifecycle.spec.md` |
| `finish-phase` | ❌ | Covered by `git-lifecycle.spec.md` |
| `open-lead-review` | ❌ | Covered by `git-lifecycle.spec.md` |
| `open-final-pbr` | ❌ | Covered by `git-lifecycle.spec.md` |

**On disk but NOT in module.yaml:**
- `phase-lifecycle/` (has workflow.md)
- `git-lifecycle.spec.md`

**router, discovery, utility categories:** All match perfectly. ✅

**Fix:** Replace phantom workflow names in module.yaml `core` section with actual directories that exist, or create the missing directories.

---

### CHECK 6: Prompts bidirectional match — ✅ PASS

module.yaml lists 24 prompts. Disk has 24 prompt files. **Perfect 1:1 match.**

No orphan prompts on disk. No phantom prompts in module.yaml.

---

### CHECK 7: Docs bidirectional match — ⚠️ N/A

module.yaml has **no docs section**. 25 doc files exist in `src/modules/lens-work/docs/` but are not tracked in module.yaml. Not a regression — this was not part of the original module.yaml design.

---

### CHECK 8: compass.agent.yaml workflow paths — ✅ PASS

All 6 workflow paths in menu entries reference files that exist on disk:

| Path | Exists? |
|------|---------|
| `workflows/router/pre-plan/workflow.md` | ✅ |
| `workflows/router/spec/workflow.md` | ✅ |
| `workflows/router/plan/workflow.md` | ✅ |
| `workflows/router/review/workflow.md` | ✅ |
| `workflows/router/dev/workflow.md` | ✅ |
| `workflows/core/init-initiative/workflow.md` | ✅ |

---

### CHECK 9: casey.agent.yaml branch patterns — 🔴 FAIL

Still uses `lens/{initiative_id}/...` pattern (should be `{domain}/{initiative_id}/...`).
Still uses `lead` lane name (should be `large`).
Hook events and actions still reference `lead`:
- `action: open-lead-review` → should be `open-large-review`
- `event: lead-review-merged` → should be `large-review-merged`
- `description: "Print PR link for small → lead"` → `small → large`
- `description: "Print PR link for lead → base"` → `large → base`

See Checks 1 and 2 for full details.

---

### CHECK 10: Remaining `.lens/` references anywhere — ✅ PASS

No `.lens/` path references found outside the review doc and archive.

---

## Summary Table

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | `lens/{` branch patterns | 🔴 FAIL | 12 active files, 40+ instances |
| 2 | `lead` lane references | 🔴 FAIL | 13+ active files, 30+ instances |
| 3 | `update-lens` references | ✅ PASS | Clean in active files |
| 4 | `.lens/` path references | ✅ PASS | Clean in active files |
| 5 | module.yaml vs disk | 🔴 FAIL | 6 phantom workflows in core category |
| 6 | Prompts match | ✅ PASS | 24/24 perfect match |
| 7 | Docs match | ⚠️ N/A | No docs section in module.yaml |
| 8 | compass.agent.yaml paths | ✅ PASS | All 6 paths valid |
| 9 | casey.agent.yaml patterns | 🔴 FAIL | lens/ + lead throughout |
| 10 | `.lens/` anywhere | ✅ PASS | Clean |

---

## Overall Verdict: 🔴 FAIL

**4 checks failed. The P0 fixes were not applied to the module files.**

---

## Required Fixes (Priority Order)

### P0 — Branch Pattern Fix (`lens/` → `{domain}/`)
All 12 files listed in CHECK 1. Replace `lens/` with `{domain}/` in all branch pattern contexts.

**Files requiring fix:**
1. `_bmad/lens-work/module.yaml` — lines 167–171
2. `_bmad/lens-work/agents/compass.agent.yaml` — line 41
3. `_bmad/lens-work/agents/compass.spec.md` — line 117
4. `_bmad/lens-work/agents/casey.agent.yaml` — lines 48–57
5. `_bmad/lens-work/agents/casey.spec.md` — lines 92–96
6. `_bmad/lens-work/workflows/core/git-lifecycle.spec.md` — lines 23, 72
7. `_bmad/lens-work/workflows/core/init-initiative.spec.md` — lines 31–34
8. `_bmad/lens-work/workflows/core/init-initiative/workflow.md` — lines 40–63, 87–88, 108–111
9. `_bmad/lens-work/workflows/utility/manual-operations.spec.md` — line 132
10. `_bmad/lens-work/prompts/lens-work.new-domain.prompt.md` — line 17
11. `_bmad/lens-work/prompts/lens-work.new-service.prompt.md` — line 17
12. `_bmad/lens-work/prompts/lens-work.new-feature.prompt.md` — line 17

### P0 — Lane Name Fix (`lead` → `large`)
All 13+ files listed in CHECK 2. Replace `lead` with `large` in lane/branch contexts only (not "Tech Lead" or "leader").

**Files requiring fix (lane context only):**
1. `_bmad/lens-work/module.yaml` — line 169
2. `_bmad/lens-work/agents/casey.agent.yaml` — lines 57, 102–107
3. `_bmad/lens-work/agents/casey.spec.md` — lines 94, 120, 129, 130
4. `_bmad/lens-work/workflows/core/init-initiative.spec.md` — lines 34, 42
5. `_bmad/lens-work/workflows/core/init-initiative/workflow.md` — lines 51–54, 110
6. `_bmad/lens-work/workflows/core/git-lifecycle.spec.md` — lines 107, 121, 125
7. `_bmad/lens-work/workflows/core/phase-lifecycle/workflow.md` — lines 102–124
8. `_bmad/lens-work/workflows/router/spec/workflow.md` — lines 105, 110, 115–116
9. `_bmad/lens-work/workflows/router/plan/workflow.md` — lines 26, 38–39, 102
10. `_bmad/lens-work/workflows/router/review/workflow.md` — lines 32, 46
11. `_bmad/lens-work/workflows/router/phase-commands.spec.md` — lines 72, 127
12. `_bmad/lens-work/prompts/lens-work.plan.prompt.md` — line 16
13. `_bmad/lens-work/prompts/lens-work.review.prompt.md` — lines 17, 24

### P1 — module.yaml Phantom Workflows
Update `core` workflow_categories to match actual directories:
- Remove: `detect-layer`, `phase-transition`, `start-phase`, `finish-phase`, `open-lead-review`, `open-final-pbr`
- Add: `phase-lifecycle`, `git-lifecycle` (or create the missing directories)

---

_Re-review performed 2026-02-06_
