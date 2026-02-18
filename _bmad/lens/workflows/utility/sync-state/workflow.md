---
name: sync-state
description: Reconcile state.yaml with git branch reality
agent: lens
trigger: /sync command
category: utility
idempotent: true
---

# /sync — State Synchronization

**Purpose:** Compare state.yaml against actual git branches, identify drift, and repair.

---

## Execution Sequence

### 1. Read State

```yaml
state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")
featureBranchRoot = initiative.feature_branch_root
```

### 2. Fetch Remote

```yaml
skill: git-orchestration.fetch-all()
```

### 3. List Actual Branches

```yaml
# Get all branches matching this initiative's patterns
actual_branches = skill: git-orchestration.list-matching-branches(featureBranchRoot)

# Expected branches based on state
expected_branches = compute_expected_branches(initiative)
```

### 4. Compare & Identify Drift

```yaml
drift_report = {
  missing_expected: [],     # In state but not in git
  unexpected_found: [],     # In git but not in state
  branch_mismatches: []     # Current branch doesn't match state
}

for branch in expected_branches:
  if branch not in actual_branches:
    drift_report.missing_expected.push(branch)

for branch in actual_branches:
  if branch not in expected_branches:
    drift_report.unexpected_found.push(branch)

current_branch = skill: git-orchestration.get-current-branch()
if current_branch != state.active_initiative.current_phase_branch:
  drift_report.branch_mismatches.push({
    state_says: state.active_initiative.current_phase_branch,
    actual: current_branch
  })
```

### 5. Repair

```yaml
repairs = []

# Fix state to match git reality
if drift_report.branch_mismatches.length > 0:
  skill: state-management.update({current_phase_branch: current_branch})
  repairs.push("Updated current branch in state")

# Clear background errors if branches are healthy
if drift_report.missing_expected.length == 0:
  skill: state-management.update({background_errors: []})
  repairs.push("Cleared background errors")
```

### 6. Log Event

```yaml
skill: state-management.log-event("state_synced", {
  drift: drift_report,
  repairs: repairs
})
```

### 7. Report

```yaml
skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/state.yaml", "_bmad-output/lens/event-log.jsonl"]
  message: "[lens] /sync: state reconciliation — ${initiative.id}"

has_drift = drift_report.missing_expected.length > 0 || drift_report.unexpected_found.length > 0

output: |
  🔭 Sync Report
  ═══════════════════════════════════════════════════
  
  ${has_drift ? "⚠️ Drift detected" : "✅ State is consistent"}
  
  ${drift_report.missing_expected.length > 0 ? 
    "Missing branches (in state, not in git):\n${drift_report.missing_expected.map(b => `  ⚠️ ${b}`).join('\n')}" : ""}
  
  ${drift_report.unexpected_found.length > 0 ?
    "Unexpected branches (in git, not in state):\n${drift_report.unexpected_found.map(b => `  📌 ${b}`).join('\n')}" : ""}
  
  Repairs applied: ${repairs.length > 0 ? repairs.join(", ") : "none needed"}
  
  ${drift_report.missing_expected.length > 0 ? "💡 Run /fix for deeper recovery or /new to recreate missing topology" : ""}
  ═══════════════════════════════════════════════════
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No state file | Run /onboard or /new |
| Fetch failed | Report connectivity issue, continue with local data |
| Cannot repair | Show manual instructions |
