# Adversarial Review: lensv3 Merged Branch
**Date:** 2026-02-06  
**Reviewer:** Copilot (Party Mode + YOLO)  
**Target:** `src/modules/lens-work/`  
**Verdict:** 🔴 FAIL — 5 critical issues, 3 warnings, 2 notes

---

## 1. module.yaml Consistency — 🔴 FAIL

### 1a. Workflow Directories vs module.yaml Listing

**module.yaml `core` category lists:**
- `init-initiative` ✅ exists at `workflows/core/init-initiative/`
- `start-workflow` ✅ exists at `workflows/core/start-workflow/`
- `finish-workflow` ✅ exists at `workflows/core/finish-workflow/`
- `detect-layer` ❌ **NO DIRECTORY** — no `workflows/core/detect-layer/` exists
- `phase-transition` ❌ **NO DIRECTORY** — no `workflows/core/phase-transition/` exists
- `start-phase` ❌ **NO DIRECTORY** — no `workflows/core/start-phase/` exists  
- `finish-phase` ❌ **NO DIRECTORY** — no `workflows/core/finish-phase/` exists
- `open-large-review` ❌ **NO DIRECTORY** — no `workflows/core/open-large-review/` exists
- `open-final-pbr` ❌ **NO DIRECTORY** — no `workflows/core/open-final-pbr/` exists

**What actually exists:** `phase-lifecycle/` directory contains the start-phase, finish-phase, open-large-review, and open-final-pbr operations as sections within a single `workflow.md`. So module.yaml lists 6 separate workflows but they're implemented as sub-sections of 1 combined workflow.

**Recommendation:** Either:
- (A) Update module.yaml to list `phase-lifecycle` instead of `start-phase`, `finish-phase`, `phase-transition`, `open-large-review`, `open-final-pbr`; OR
- (B) Split `phase-lifecycle/workflow.md` into separate directories matching module.yaml

`detect-layer` has no implementation anywhere — it's referenced in module.yaml but doesn't exist as a directory or as a section in any other workflow.

### 1b. docs/ directory — ⚠️ WARNING

`docs/reviews/` subdirectory exists on disk but is not listed in module.yaml's `docs.files` list. Contains:
- `adversarial-review-2026-01-31.md`
- `party-mode-review-2026-01-31.md`

This is minor (review artifacts, not operational docs), but module.yaml doesn't account for subdirectories.

### 1c. templates/ and scripts/ — ✅ PASS
- `scripts/validate-lens-work.ps1` ✅ exists
- `scripts/sync-prompts.ps1` ✅ exists
- `tests/lens-work-tests.spec.md` ✅ exists
- `templates/` directory exists with 4 template files (not listed in module.yaml but templates aren't typically listed)

---

## 2. Cross-Reference Integrity — ✅ PASS (with notes)

- Agent YAML files reference workflow paths using `{project-root}/_bmad/lens-work/workflows/...` — these resolve correctly at install time.
- Compass menu items reference `router/pre-plan/workflow.md`, `router/spec/workflow.md`, etc. — all exist ✅
- Scout menu items reference `discovery/repo-discover/workflow.md`, `utility/bootstrap/workflow.md`, etc. — all exist ✅
- Tracey menu items reference `utility/status/workflow.md`, `utility/resume/workflow.md`, etc. — all exist ✅
- Casey hooks reference event names that map to core workflows — conceptually correct ✅

---

## 3. Naming Consistency — 🔴 CRITICAL FAIL

### 3a. Branch Pattern: `lens/` vs `{Domain}/` — SCHISM

This is the **most critical issue** in the merge. Two incompatible branch naming conventions co-exist:

**module.yaml (line ~263-270)** defines the canonical v3 pattern:
```yaml
branch_patterns:
  base: "{domain}/{initiative_id}/base"
  small_lane: "{domain}/{initiative_id}/small"
  large_lane: "{domain}/{initiative_id}/large"
```

**router/init-initiative/workflow.md** (the canonical v3 workflow) correctly uses:
```
${domain_prefix}/${initiative_id}/base
${domain_prefix}/${initiative_id}/small
${domain_prefix}/${initiative_id}/large
```

**BUT the following files still use the OLD `lens/` prefix:**

| File | Count | Nature |
|------|-------|--------|
| `workflows/core/init-initiative/workflow.md` | 15 refs | `lens/${initiative_id}/base`, `lens/${initiative_id}/small`, `lens/${initiative_id}/lead` |
| `workflows/core/phase-lifecycle/workflow.md` | 9 refs | `lens/${initiative_id}/${lane}/p${phase_number}` |
| `workflows/core/init-initiative.spec.md` | 6 refs | `lens/{id}/small`, `lens/{id}/lead` |
| `workflows/core/git-lifecycle.spec.md` | 2 refs | `lens/{id}/{lane}/p{phase}/w/{workflow_name}` |
| `agents/compass.agent.yaml` | 1 ref | line 42: `If on lens/{id}/... branch` |
| `agents/compass.spec.md` | 2 refs | `lens/{id}/...` pattern |
| `agents/casey.spec.md` | 4 refs | `lens/{id}/small`, `lens/{id}/lead` |
| `agents/tracey.spec.md` | 5 refs | `lens/rate-limit-x7k2m9/...` examples |

**Total: 44+ references to old `lens/` prefix across 8 files.**

The deprecated `core/init-initiative` is clearly marked deprecated (good), but `core/phase-lifecycle/workflow.md`, `core/git-lifecycle.spec.md`, and the agent spec files are NOT deprecated and actively use the old pattern. **Casey will get conflicting instructions** — his agent YAML shows `{Domain}/` in the branch-topology prompt, but the spec and multiple workflow files show `lens/`.

**Recommendation:** Update all non-deprecated files from `lens/` to `{domain_prefix}/` (or `{Domain}/`). Mark which naming pattern is authoritative.

### 3b. Lane Naming: `lead` vs `large` — ⚠️ WARNING

Another v2→v3 naming conflict:

| File | Uses |
|------|------|
| `module.yaml` git.branch_patterns | `large` ✅ (v3) |
| `casey.agent.yaml` branch-topology prompt | `large` ✅ (v3) |
| `router/init-initiative/workflow.md` | `large` ✅ (v3) |
| `README.md` line 114 | `lead` ❌ (v2) |
| `core/init-initiative/workflow.md` | `lead` ❌ (v2, deprecated — OK) |
| `core/phase-lifecycle/workflow.md` line 23 | `"small" or "lead"` ❌ (v2) |
| `core/phase-lifecycle/workflow.md` lines 158-185 | `Open Lead Review`, `lead → base` ❌ (v2) |
| `core/init-initiative.spec.md` | `lead` ❌ (v2) |

`phase-lifecycle/workflow.md` is NOT deprecated but uses `lead` instead of `large`.

**Recommendation:** Update `phase-lifecycle/workflow.md` to use `large`. Update README line 114.

---

## 4. Discovery Workflow Compatibility — ⚠️ WARNING

### 4a. `.lens/` Config Path References

Several discovery-era docs reference `.lens/domain-map.yaml` and `.lens/lens-config.yaml` — these are old config paths from the v2 architecture. The v3 architecture uses `_bmad/lens-work/` for config:

| File | Reference |
|------|-----------|
| `workflows/discovery/lens-sync/steps-c/step-02-compare-maps.md` | `.lens/domain-map.yaml` |
| `workflows/discovery/lens-sync/steps-c/step-03-apply-updates.md` | `.lens/domain-map.yaml` |
| `workflows/discovery/lens-sync/lens-sync.spec.md` | `.lens/domain-map.yaml` |
| `workflows/discovery/repo-discover/workflow.md` | `_lens/domain-map.yaml` and `lens/domain-map.yaml` |
| `workflows/discovery/discover/steps-c/step-05-handoff-scout.md` | `{project-root}/.lens/domain-map.yaml` |
| `prompts/lens-work.lens-sync.prompt.md` | `.lens/domain-map.yaml` |
| `docs/configuration.md` | `.lens/lens-config.yaml`, `.lens/lens-session.yaml` (5 refs) |
| `docs/session-store.md` | `.lens/lens-session.yaml` |
| `docs/troubleshooting.md` | `.lens/lens-config.yaml`, `.lens/lens-session.yaml` |
| `docs/migrations.md` | `.lens/lens-session.yaml` |
| `docs/prerequisites.md` | `_lens/jira-config.yaml` |

**Recommendation:** Decide canonical config path (`_bmad/lens-work/` or `.lens/`) and update all references.

### 4b. Dead References to `update-lens` Workflow

20+ references to an `update-lens` workflow across docs, but **no `update-lens/` directory exists** anywhere under workflows:

| File | Issue |
|------|-------|
| `docs/agents.md` | `[UL] update-lens` menu entry |
| `docs/getting-started.md` | `Run update-lens to propagate` |
| `docs/getting-started-old.md` | `Run update-lens` |
| `docs/examples.md` | Multiple `update-lens` workflow examples |
| `docs/testing.md` | `update-lens generates update-lens-report.md` |
| `docs/scope.md` | `update-lens` in workflow table |
| `docs/traceability.md` | `workflows/update-lens/update-lens.spec.md` (dead path) |
| `docs/operations.md` | `Incomplete propagation in update-lens` |

This workflow was likely renamed or split during the merge. **Dead reference.**

**Recommendation:** Either create an `update-lens` workflow or update all doc references to point to the replacement (likely `lens-sync` or a combination of `repo-document` + `lens-sync`).

---

## 5. installer.js Compatibility — ✅ PASS

- Uses `fs-extra` ✅
- References `docs/copilot-instructions.md` — file exists at `docs/copilot-instructions.md` ✅
- Creates `_bmad-output/lens-work/` and subdirectories (`dashboards`, `archive`, `snapshots`) ✅
- Creates `_bmad/lens-work/config.yaml` ✅
- Creates `state.yaml` ✅
- Copies to `.github/lens-work-instructions.md` ✅
- No references to deprecated paths ✅

One minor note: the installer creates subdirector `snapshots/` but module.yaml doesn't mention it in `outputs:`. The `initiatives/` dir from module.yaml isn't created by the installer — but the router/init-initiative workflow creates it on first use, so this is fine.

---

## 6. Prompt Completeness — 🔴 FAIL

### Prompts on disk NOT listed in module.yaml:

| File on Disk | Status |
|---|---|
| `lens-work.lens-sync.prompt.md` | ✅ Listed in module.yaml (around line 204) |
| `lens-work.reconcile.prompt.md` | ✅ Listed |
| `lens-work.repo-status.prompt.md` | ✅ Listed |
| `lens-work.rollback.prompt.md` | ✅ Listed |

All 31 prompt files on disk are listed in module.yaml. ✅

### module.yaml entries vs disk:

All 31 entries in module.yaml exist on disk. ✅

**Result: PASS** — full bidirectional match.

*(Correcting from initial FAIL assessment — the bottom-of-file entries at lines 200-208 were initially missed but confirmed present.)*

---

## 7. Duplicate/Conflicting Features — 🔴 FAIL

### 7a. Duplicate `init-initiative` Workflows

Two `init-initiative` workflows exist:

1. **`workflows/core/init-initiative/`** — Deprecated, uses `lens/` prefix, `lead` lane naming
2. **`workflows/router/init-initiative/`** — Canonical v3, uses `{Domain}/` prefix, `large` lane naming

The deprecated one is properly marked, but **module.yaml lists `init-initiative` in BOTH the `core` AND `router` categories** (lines 105 and 113). This is confusing — which one gets invoked?

Compass agent menu correctly routes to `router/init-initiative/workflow.md`, so the routing is correct. But the module.yaml dual listing creates ambiguity.

**Recommendation:** Remove `init-initiative` from the `core` workflow list (it's deprecated) or add a `deprecated: true` annotation.

### 7b. Overlapping Discovery Workflows

The discovery category lists **8 workflows** with significant overlap:

| v2 (lens-migration) | v3 (origin/main) | Overlap? |
|---|---|---|
| `discover` | `repo-discover` | Both discover repo structure |
| `analyze-codebase` | (no equivalent) | Unique |
| `generate-docs` | `repo-document` | Both generate docs |
| `lens-sync` | `repo-reconcile` | Both reconcile drift |
| — | `repo-status` | Unique |

Three pairs appear to do similar things. The v2 versions have rich step-by-step workflows with `steps-c/` directories. The v3 versions are simpler single-file workflows.

**Recommendation:** Clarify which is canonical. Either deprecate one set or document that they serve different purposes (e.g., `discover` = initial brownfield scan, `repo-discover` = ongoing inventory).

---

## 8. Dead References — 🔴 FAIL

### 8a. `update-lens` workflow — DEAD
See §4b above. 20+ references, no workflow exists.

### 8b. `workflows/update-lens/update-lens.spec.md` — DEAD
Referenced in `docs/traceability.md` line 23. Path doesn't exist.

### 8c. `open-lead-review` — DEAD (from README)
README line 350 references `open-lead-review/` directory. This doesn't exist — it's a section inside `phase-lifecycle/workflow.md`.

### 8d. `.lens/` config paths — DEAD
See §4a. Multiple references to `.lens/lens-config.yaml`, `.lens/lens-session.yaml`, `.lens/domain-map.yaml`. No evidence this path is created or used in v3.

### 8e. `getting-started-old.md` line 38 — DEAD
References `src/modules/lens/extensions/lens-sync/_module-installer/installer.js` — old module path that doesn't exist in the merged structure.

### 8f. Branch pattern `lens/{id}/{lane}/p{phase}/w/{workflow}` — DEAD
`git-lifecycle.spec.md` line 23 uses this pattern. The v3 pattern is `{Domain}/{id}/{size}-{phase}-{workflow}` (no `/p/` or `/w/` segments). Completely different branch topology.

---

## Summary

| Check | Status | Severity |
|-------|--------|----------|
| 1. module.yaml consistency | 🔴 FAIL | CRITICAL — 5 phantom workflow entries |
| 2. Cross-reference integrity | ✅ PASS | — |
| 3. Naming consistency (branch) | 🔴 FAIL | CRITICAL — 44+ old `lens/` refs conflict with `{Domain}/` |
| 3b. Naming consistency (lane) | ⚠️ WARN | Active workflow uses deprecated `lead` instead of `large` |
| 4. Discovery compatibility | ⚠️ WARN | `.lens/` config paths, dead `update-lens` refs |
| 5. installer.js | ✅ PASS | — |
| 6. Prompt completeness | ✅ PASS | Full bidirectional match |
| 7. Duplicates/conflicts | 🔴 FAIL | Dual init-initiative, overlapping discovery workflows |
| 8. Dead references | 🔴 FAIL | `update-lens`, `.lens/` paths, old module paths |

---

## Overall Verdict: 🔴 FAIL

The merge brought in content from three branches but did NOT reconcile the fundamental architectural differences between them. The most dangerous issue is the **branch naming schism** — `lens/` vs `{Domain}/` — because this affects actual git operations. If Casey follows `core/phase-lifecycle/workflow.md` (which uses `lens/`), branches will be created with the wrong prefix and won't match what `router/init-initiative` created.

### Priority Fix Order:
1. **[P0] Branch naming:** Grep-replace all non-deprecated `lens/` branch refs to `{domain_prefix}/`
2. **[P0] Lane naming:** Update `phase-lifecycle/workflow.md` from `lead` to `large`
3. **[P1] module.yaml phantom workflows:** Remove or add `detect-layer`, `phase-transition`, `start-phase`, `finish-phase`, `open-large-review`, `open-final-pbr` — or replace with `phase-lifecycle`
4. **[P1] Dead `update-lens` refs:** Replace with correct workflow name in all docs
5. **[P2] Config path reconciliation:** Decide `.lens/` vs `_bmad/lens-work/` and update
6. **[P2] Discovery workflow dedup:** Document purpose distinction or deprecate one set
7. **[P3] README cleanup:** Fix `lead` refs, `open-lead-review/` ghost dir, `lens/` branch examples
