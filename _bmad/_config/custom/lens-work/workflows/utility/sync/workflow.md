---
name: sync
description: Fetch + re-validate + update state
agent: tracey
trigger: "@tracey SY"
category: utility
---

# Sync Workflow

**Purpose:** Fetch latest from remote, re-validate all gates, update state.

---

## Execution Sequence

### 1. Git Fetch

```yaml
# Delegate to Casey
invoke: casey.git-fetch

output: "🔄 Fetching from remote..."
```

```bash
git fetch origin --prune
```

### 2. Re-validate Gates

```yaml
state = load("_bmad-output/lens-work/state.yaml")

for gate in state.gates:
  if gate.status == "completed":
    # Verify it's still merged
    is_merged = git_merge_base_check(gate.branch, gate.target)
    if not is_merged:
      discrepancies.append({
        gate: gate.name,
        expected: "merged",
        actual: "not merged"
      })
```

### 3. Check for External Changes

```yaml
# Check if branches were modified externally
for branch in state.branches:
  local_head = git_rev_parse(branch, "local")
  remote_head = git_rev_parse(branch, "remote")
  
  if local_head != remote_head:
    external_changes.append({
      branch: branch,
      local: local_head,
      remote: remote_head,
      action: "pull needed" if local_behind else "push needed"
    })
```

### 4. Update State

```yaml
if discrepancies.length > 0 or external_changes.length > 0:
  # Update state to reflect reality
  for discrepancy in discrepancies:
    update_gate_status(discrepancy.gate, discrepancy.actual)
  
  save(state, "_bmad-output/lens-work/state.yaml")
```

### 5. Output Report

```
🔄 Sync Complete

Remote: ${remote_url}
Fetched: ${fetch_timestamp}

${if discrepancies.length == 0 and external_changes.length == 0}
✅ State is in sync with remote
${else}
⚠️ Discrepancies found:

${for d in discrepancies}
├── ${d.gate}: expected ${d.expected}, found ${d.actual}
${endfor}

${for c in external_changes}
├── ${c.branch}: ${c.action}
${endfor}

State updated to reflect current reality.
${endif}
```
