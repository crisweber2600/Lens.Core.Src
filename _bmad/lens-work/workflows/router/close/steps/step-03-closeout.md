---
name: 'step-03-closeout'
description: 'Update initiative-state.yaml with close state, commit the close marker, push, and open a control-repo PR'
---

# Step 3: Update State, Commit Close Marker, and Create Control Repo PR

**Goal:** Atomically update initiative-state.yaml with the terminal close state, commit and push the close marker, then open a pull request in the control repo to bring the initiative branch into the default branch.

---

## EXECUTION SEQUENCE

### 1. Update Initiative State

```yaml
invoke: git-orchestration.update-close
params:
  close_state: ${close_state}
  superseded_by: ${superseded_by}
  reason: ${close_reason}
```

### 2. Push Close Marker

```yaml
invoke: git-orchestration.push
```

### 3. Create Control Repo PR

```yaml
pr_result = invoke: git-orchestration.create-control-repo-close-pr
params:
  initiative: ${initiative}
  close_state: ${close_state}
  close_reason: ${close_reason}
  tombstone_path: ${tombstone_result.status == "published" ? tombstone_result.target_path : null}
```

### 4. Report Final Close Status

```yaml
output: |
  ✅ Initiative Closed
  ├── Initiative: ${initiative}
  ├── Close State: ${close_state}
  ├── Superseded By: ${superseded_by || 'N/A'}
  ├── Reason: ${close_reason}
  ├── Commit Marker: [CLOSE:${close_state.toUpperCase()}] ${initiative} — ${close_reason}
  ├── Tombstone: ${tombstone_result.status == "published" ? tombstone_result.target_path : "skipped"}
  ├── initiative-state.yaml: lifecycle_status = ${close_state}
  └── Control Repo PR: ${pr_result.status == "created" ? pr_result.url : pr_result.status + " (" + pr_result.reason + ")"}

  The initiative is now formally closed.
  ${pr_result.status == "created" ? "Review and merge the PR above to archive planning artifacts into the default branch." : ""}
  ${pr_result.fallback == true ? "⚠️  No PAT available — open the PR manually at the URL above." : ""}
```
