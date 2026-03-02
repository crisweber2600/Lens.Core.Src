# Utility Workflows — Manual Operations

**Module:** lens-work
**Category:** utility
**Agent:** @lens/state-management, @lens/discovery
**Status:** Specification

---

## State-Management Workflows

### Workflow: status (`ST`)

**Purpose:** Display current state, blocks, topology, next steps.

**Output:** Structured status report (see state-management spec).

---

### Workflow: resume (`RS`)

**Purpose:** Rehydrate from state.yaml, explain context.

**Sequence:**
1. Load state.yaml
2. Load last N events from event-log.jsonl
3. Explain current position and context
4. Suggest next action

---

### Workflow: sync (`SY`)

**Purpose:** Fetch + re-validate + update state.

**Sequence:**
1. git-orchestration: git fetch origin --prune
2. Re-validate all merge gates
3. Update state.yaml with current git state
4. Report any discrepancies

---

### Workflow: fix-state (`FIX`)

**Purpose:** Reconstruct state from event log or git scan.

**Sequence:**
1. Scan event-log.jsonl (authoritative)
2. Scan git branches matching `lens/` pattern
3. Reconcile: event log vs git reality
4. Write corrected state.yaml
5. Report what was fixed

---

### Workflow: override (`OVERRIDE`)

**Purpose:** Bypass merge validation with logged reason.

**Sequence:**
1. Prompt for reason (required, min 10 chars)
2. Log override to event-log.jsonl
3. Mark gate as "overridden" (not "passed")
4. Proceed to next step
5. ⚠️ Flag in all future status reports

---

### Workflow: archive (`ARCHIVE`)

**Purpose:** Archive completed initiative, clean state.

**Sequence:**
1. Verify all gates passed (or overridden)
2. Move state to `_bmad-output/lens-work/archive/{id}/`
3. Move event log segment to archive
4. Clear active state
5. Print summary report

---

## Discovery Workflows

### Workflow: bootstrap

**Purpose:** Setup TargetProjects from service map.

**Sequence:**
1. Run repo-discover
2. Run repo-reconcile
3. Run repo-document
4. Write bootstrap-report.md
5. Report summary

---

### Workflow: onboarding

**Purpose:** Create profile + run bootstrap.

**Sequence:**
1. Prompt for user info (name, role, team)
2. Create user profile in `_bmad/lens-work/profiles/{user}.yaml`
3. Determine user's domain/team scope
4. Run bootstrap for that scope
5. Report completion

---

### Workflow: setup-rollback

**Purpose:** Revert bootstrap to snapshot.

**Sequence:**
1. Load snapshot metadata
2. Delete current TargetProjects state
3. Restore from snapshot
4. Update repo-inventory.yaml
5. Report restoration

---

## @lens Workflows

### Workflow: fix-story (`#fix-story`)

**Purpose:** Quick correction loop (Quick-Spec → Adversarial Review → Quick-Dev).

**Sequence:**
1. Load existing initiative context
2. Create fix branch: `{featureBranchRoot}-fix-{fix_id}`
3. Run Quick-Spec (minimal)
4. Run Adversarial Review
5. Run Quick-Dev (implementation)
6. Merge fix branch
7. Report completion

**Estimated Time:** 45 minutes (with gates)

---

_Workflow spec created on 2026-02-03 via BMAD Module workflow_
