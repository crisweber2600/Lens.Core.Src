---
name: recreate-branches
description: Recreate missing lens-work branches from initiative topology
agent: casey
trigger: "@casey recreate-branches"
category: utility
mutates: true
---

# Recreate Branches Workflow

**Purpose:** Scan for missing branches and recreate them from initiative topology definitions stored in `_bmad-output/lens-work/initiatives/{id}.yaml`.

**Agent:** Casey (all git operations). Recovery logged through Tracey.

---

## Prerequisites

```yaml
# Initiative config provides the canonical branch topology
initiative_config_path: "_bmad-output/lens-work/initiatives/{id}.yaml"

# Personal state provides active initiative pointer
state_path: "_bmad-output/lens-work/state.yaml"

# Branch naming pattern (CRITICAL)
# Flat, hyphen-separated: {featureBranchRoot}[-{audience}[-p{N}]]
# featureBranchRoot = {domain}-{service}-{feature} or {domain}-{service}-{repo}-{feature}
# Examples:
#   chat-spark-backend-alignment-50cf37                    (root)
#   chat-spark-backend-alignment-50cf37-small              (audience: small)
#   chat-spark-backend-alignment-50cf37-large              (audience: large)
#   chat-spark-backend-alignment-50cf37-small-p1           (phase 1)
#   chat-spark-backend-alignment-50cf37-small-p2           (phase 2)
```

> **CRITICAL:** Branch names use flat hyphen-separated format `{featureBranchRoot}-{audience}-p{N}`. The old `{domain}/{id}/{size}-{N}` pattern is obsolete. `lead` is now `large`. `lane` is now audience.

---

## Execution Sequence

### Step 0: Verify Clean Git State

```bash
# Casey verifies clean working tree
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before recreate-branches."
  exit 1
fi

# Fetch latest remote state
git fetch origin --prune
```

### Step 1: Load Initiative Topology

#### 1a. Resolve Active Initiative

```yaml
state = load("_bmad-output/lens-work/state.yaml")
initiative_id = state.active_initiative

if not initiative_id:
  error: "No active initiative in state.yaml. Set active_initiative first."
  exit: 1

initiative = load("_bmad-output/lens-work/initiatives/${initiative_id}.yaml")
```

#### 1b. Extract Expected Branches

```yaml
# Build the expected branch list from initiative config
expected_branches = {}

# Root branch (always expected)
if initiative.branches.root:
  expected_branches.root = initiative.branches.root

# Audience branches
if initiative.branches.audiences:
  if initiative.branches.audiences.small:
    expected_branches.small = initiative.branches.audiences.small
  if initiative.branches.audiences.medium:
    expected_branches.medium = initiative.branches.audiences.medium
  if initiative.branches.audiences.large:
    expected_branches.large = initiative.branches.audiences.large

# Phase branches (e.g., -small-p1, -small-p2)
for phase_key in [p1, p2, p3, p4, p5]:
  if initiative.branches[phase_key]:
    expected_branches[phase_key] = initiative.branches[phase_key]

# Active branch
if initiative.branches.active:
  expected_branches.active = initiative.branches.active

output: |
  Initiative: ${initiative_id}
  Domain prefix: ${initiative.domain_prefix}
  Size: ${initiative.size}
  Expected branches: ${expected_branches.keys().length}
```

### Step 2: Scan for Missing Branches

#### 2a. Check Local and Remote

```bash
# Get all local branches
local_branches=$(git branch --list | sed 's/^[* ] //')

# Get all remote branches
remote_branches=$(git branch -r --list "origin/*" | sed 's/^ *origin\///')
```

#### 2b. Compare Expected vs Actual

```yaml
scan_results:
  present_local: []      # Branch exists locally
  present_remote: []     # Branch exists on remote only
  missing_both: []       # Branch missing from both local and remote
  local_only: []         # Branch exists locally but not on remote

for name, branch in expected_branches:
  local_exists = branch in local_branches
  remote_exists = branch in remote_branches

  if local_exists and remote_exists:
    scan_results.present_local.append({name: name, branch: branch, status: "ok"})
  elif not local_exists and remote_exists:
    scan_results.present_remote.append({name: name, branch: branch, status: "remote_only"})
  elif local_exists and not remote_exists:
    scan_results.local_only.append({name: name, branch: branch, status: "local_only"})
  else:
    scan_results.missing_both.append({name: name, branch: branch, status: "missing"})

output: |
  Branch Scan Results

  Present (local + remote): ${scan_results.present_local.length}
  Remote only: ${scan_results.present_remote.length}
  Local only: ${scan_results.local_only.length}
  Missing: ${scan_results.missing_both.length}
```

### Step 3: Recreate Missing Branches

> **Partial reconstruction:** This workflow handles the case where some branches exist and others are missing. Each branch is recreated independently based on its parent in the topology.

#### 3a. Determine Recreation Strategy

```yaml
# Branch hierarchy for recreation:
#   root -> small -> small-p{N} (phase branches)
#   root -> medium
#   root -> large
#
# Each missing branch is created from its logical parent.

recreation_plan = []

for missing in scan_results.missing_both:
  parent = resolve_parent(missing.name, expected_branches)
  recreation_plan.append({
    branch: missing.branch,
    name: missing.name,
    from: parent.branch,
    strategy: "create_from_parent"
  })

# Remote-only branches just need local checkout
for remote_only in scan_results.present_remote:
  recreation_plan.append({
    branch: remote_only.branch,
    name: remote_only.name,
    from: "origin/${remote_only.branch}",
    strategy: "checkout_remote"
  })

# Local-only branches need push to remote
for local_only in scan_results.local_only:
  recreation_plan.append({
    branch: local_only.branch,
    name: local_only.name,
    strategy: "push_to_remote"
  })
```

#### 3b. Resolve Parent Branch

```yaml
# Parent resolution rules:
resolve_parent(branch_name, topology):
  if branch_name == "root":
    return { branch: "main" }                # Root branch comes from main
  elif branch_name == "small":
    return { branch: topology.root }          # Audience branches come from root
  elif branch_name == "medium":
    return { branch: topology.root }          # Audience branches come from root
  elif branch_name == "large":
    return { branch: topology.root }          # Large branch comes from root
  elif branch_name matches /^p\d+$/:
    return { branch: topology.audiences.small }  # Phase branches come from small
  elif branch_name == "active":
    # Active is typically a phase branch alias - skip recreation
    return null
  else:
    return { branch: topology.root }          # Default fallback
```

#### 3c. Execute Recreation

```bash
# Process each branch in recreation plan
recreated = []
failed = []

for plan_entry in recreation_plan:
  case plan_entry.strategy:

    "create_from_parent":
      # Verify parent exists
      if ! git rev-parse --verify "${plan_entry.from}" 2>/dev/null; then
        echo "ERROR: Parent branch ${plan_entry.from} does not exist. Skipping ${plan_entry.branch}."
        failed.append(plan_entry)
        continue
      fi

      git checkout "${plan_entry.from}"
      git checkout -b "${plan_entry.branch}"
      git push -u origin "${plan_entry.branch}"
      recreated.append(plan_entry)

    "checkout_remote":
      git checkout -b "${plan_entry.branch}" "origin/${plan_entry.branch}"
      recreated.append(plan_entry)

    "push_to_remote":
      git push -u origin "${plan_entry.branch}"
      recreated.append(plan_entry)
```

### Step 4: Log Recovery Through Tracey

```yaml
# Append recovery event to event log
append_event({
  ts: "${ISO_TIMESTAMP}",
  event: "recreate-branches",
  initiative: "${initiative_id}",
  recreated_count: ${recreated.length},
  failed_count: ${failed.length},
  branches_recreated: ${recreated.map(r => r.branch)},
  branches_failed: ${failed.map(f => f.branch)}
})
```

### Step 5: Return to Active Branch

```bash
# Return to the active branch from initiative config
active_branch="${initiative.branches.active}"
if git rev-parse --verify "${active_branch}" 2>/dev/null; then
  git checkout "${active_branch}"
else
  # Fallback to root if active doesn't exist
  git checkout "${initiative.branches.root}"
fi
```

### Step 6: Output Summary

```
Branch Recreation Complete

Initiative: ${initiative_id}
Domain: ${initiative.domain_prefix}
Size: ${initiative.size}

Results:
  Recreated: ${recreated.length}
  ${for r in recreated}
    - ${r.branch} (${r.strategy})
  ${endfor}

  ${if failed.length > 0}
  Failed: ${failed.length}
  ${for f in failed}
    - ${f.branch}: parent ${f.from} not found
  ${endfor}
  ${endif}

  Already present: ${scan_results.present_local.length}
  ${for p in scan_results.present_local}
    - ${p.branch}
  ${endfor}

Current branch: ${current_branch}

${if failed.length > 0}
WARNING: Some branches could not be recreated.
Verify parent branches exist and retry.
${else}
All expected branches are now present locally and on remote.
${endif}

Recovery logged to: _bmad-output/lens-work/event-log.jsonl
```

---

## Branch Topology Reference

The branch hierarchy for a lens-work initiative follows this pattern:

```
main
  └── {featureBranchRoot}                              (initiative root)
        ├── {featureBranchRoot}-small                   (audience: small)
        │     ├── {featureBranchRoot}-small-p1           (phase 1)
        │     ├── {featureBranchRoot}-small-p2           (phase 2)
        │     └── {featureBranchRoot}-small-p3           (phase 3)
        ├── {featureBranchRoot}-medium                  (audience: medium)
        └── {featureBranchRoot}-large                   (audience: large)
```

**Naming rules:**
- `{featureBranchRoot}` = flat hyphen-separated root (e.g., `chat-spark-backend-alignment-50cf37`)
- Built from: `{domain}-{service}-{feature}` or `{domain}-{service}-{repo}-{feature}`
- `-small` / `-medium` / `-large` = audience branches (old naming `lane` / `lead` is obsolete)
- `-small-p{N}` = phase branches (e.g., `-small-p1`, `-small-p2`)

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No active initiative | Set `active_initiative` in state.yaml |
| Initiative config missing | Run init-initiative to create config |
| Parent branch missing | Skip and report; recreate parent first |
| Push failed | Retry with backoff; check remote access |
| Branch already exists | Skip (already present) |
| Uncommitted changes | Block until resolved |

---

## Checklist

- [ ] Clean git state verified (Step 0)
- [ ] Initiative topology loaded from `initiatives/{id}.yaml`
- [ ] Local and remote branches scanned
- [ ] Missing branches identified
- [ ] Recreation plan determined with parent resolution
- [ ] Branches recreated (partial reconstruction supported)
- [ ] Recovery event logged through Tracey
- [ ] Returned to active branch
