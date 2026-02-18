# Dev Story: S1.1 — Remove Auto-Merge from All Phase Routers

**Initiative:** onboarding-enhancements-a07bf8  
**Epic:** E1 — Phase Governance & PR Automation  
**Sprint:** 1 (Story 1 of 5)  
**REQ:** REQ-7  
**Effort:** Medium  
**Priority:** High — Behavioral prerequisite for all other work  
**Assigned:** (unassigned — developer pickup)

---

## Context

Currently, all 7 phase router workflows perform local `git merge --no-ff` + `git branch -d` in their Phase Completion section. This means phase transitions happen silently, bypassing code review and PR-based governance. This story removes auto-merge from every router, replacing it with a push-only workflow. Subsequent stories (S1.2–S1.5) will add PR creation, state tracking, and merge validation.

---

## Objective

Replace the phase-completion merge-and-delete behavior in all 7 phase routers with push-only behavior. After this change, phase branches will be pushed to origin but NOT merged locally — PRs will handle merging.

---

## Target Files

All files are relative to `TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/`:

| # | File | Section to Modify |
|---|------|-------------------|
| 1 | `workflows/router/pre-plan/workflow.md` | Phase Completion (typically last numbered step) |
| 2 | `workflows/router/spec/workflow.md` | Phase Completion |
| 3 | `workflows/router/plan/workflow.md` | Phase Completion |
| 4 | `workflows/router/tech-plan/workflow.md` | Phase Completion |
| 5 | `workflows/router/story-gen/workflow.md` | Phase Completion |
| 6 | `workflows/router/review/workflow.md` | Phase Completion |
| 7 | `workflows/router/dev/workflow.md` | Phase Completion |

---

## Implementation Steps

### Step 1: Identify the Phase Completion Section
In each of the 7 router workflows, locate the section that contains git merge operations. Look for patterns like:
```yaml
# Current pattern to find:
git checkout {audience_branch}
git merge --no-ff {phase_branch}
git branch -d {phase_branch}
git push origin {audience_branch}
```

### Step 2: Replace with Push-Only
Replace the merge section with:
```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
invoke: casey.commit-and-push
params:
  branch: ${phase_branch}
  message: "[${initiative.id}] P${N} ${phase_name} complete"
# Phase branch remains alive — PR handles merge to audience branch
```

### Step 3: Remove Branch Deletion
Ensure no `git branch -d` or `git branch -D` commands remain in the Phase Completion section. Phase branches must survive for PR-based review.

### Step 4: Verify No Checkout of Audience Branch
The router must NOT `git checkout {audience_branch}` in the completion section. The working branch stays on the phase branch after completion.

---

## Constitutional Compliance

| Article | Requirement | How This Story Complies |
|---|---|---|
| Article I: Source-First | All changes in `TargetProjects/.../src/modules/lens-work/` | All 7 files are in source directory |
| Article II: Module Builder | Structural changes require Morgan | These are behavioral edits to existing files (content change, not structural) — Module Builder not required for in-file modifications |

---

## Acceptance Criteria

- [ ] **AC1:** No phase router contains `git merge` in its Phase Completion section
- [ ] **AC2:** All 7 routers push the phase branch after committing artifacts
- [ ] **AC3:** Phase branches remain alive (not deleted) after workflow completion
- [ ] **AC4:** No `git checkout {audience_branch}` in Phase Completion
- [ ] **AC5:** Each modified section includes `# REQ-7` comment for traceability

---

## Verification Script

```bash
# Run from TargetProjects/bmad/lens/BMAD.Lens/src/modules/lens-work/
# Should return 0 results (no merge in phase completion):
grep -rn "git merge" workflows/router/*/workflow.md | grep -i "phase.completion" 

# Should return 7 results (one push per router):
grep -rn "git push" workflows/router/*/workflow.md | grep -i "phase.completion"

# Should return 0 results (no branch delete):
grep -rn "git branch -d" workflows/router/*/workflow.md
```

---

## Dependencies

- **Upstream:** None — this is the first story in Sprint 1
- **Downstream:** S1.2 (PR creation), S1.3 (pre-flight), S1.4 (pr_pending state), S1.5 (merge validation)

---

## Notes

- This story is intentionally scoped to REMOVAL only. It does not add PR creation (that's S1.2).
- After this story, phase completion will push the branch but take no further action — the user must manually create a PR until S1.2 is implemented.
- Test by running any phase router to completion and verifying the phase branch exists on origin without a local merge having occurred.
