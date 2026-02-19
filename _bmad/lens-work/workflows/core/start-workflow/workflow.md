---
name: start-workflow
description: Create workflow branch with merge-gate validation
agent: casey
trigger: Compass invokes when user begins a workflow
category: core
auto_triggered: true
---

# Start Workflow

**Purpose:** Create a workflow branch with merge-gate validation.

---

## Input Parameters

```yaml
workflow_name: string      # e.g., "discovery", "brainstorm", "product-brief"
phase: integer             # Phase number: 1, 2, 3, 4
initiative_id: string      # From state.active_initiative
domain_prefix: string      # From initiative.domain_prefix
# review_size derived from initiative.review_audience_map["p${phase}"]
```

---

## Execution Sequence

### 0. Pre-Flight Branch Check (HARD GATE)

```bash
# Verify we are in the BMAD control repo, not a TargetProject
control_repo_marker="_bmad"
if [ ! -d "$control_repo_marker" ]; then
  echo "❌ HARD GATE: Not in BMAD control repo"
  echo "├── Expected: _bmad/ directory at repo root"
  echo "├── Current dir: $(pwd)"
  echo "└── All BMAD operations must run from the control repo"
  exit 1
fi

# Verify clean working tree
if ! git diff-index --quiet HEAD --; then
  uncommitted=$(git status --porcelain | wc -l)
  echo "⚠️ ${uncommitted} uncommitted change(s) detected"
  echo "├── Auto-committing before workflow start..."
  
  # Trigger auto-commit to save any pending work
  git add -A
  git commit -m "chore: auto-save before starting ${workflow_name} [agent:casey]" --no-verify
  echo "└── ✅ Auto-committed"
fi

# Verify remote connectivity (non-blocking)
if ! git ls-remote --exit-code origin HEAD >/dev/null 2>&1; then
  echo "⚠️ Cannot reach remote origin"
  echo "├── Continuing offline (push will happen at finish-workflow)"
  echo "└── Verify network before finishing workflow"
fi

# Fetch latest
git fetch origin --prune
```

### 1. Load Current State

```yaml
# Read from two-file state architecture
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
initiative_id = initiative.id
current_phase = state.current.phase
review_size = initiative.review_audience_map[current_phase]  # Phase determines review audience
domain_prefix = initiative.domain_prefix
```

### 2. Validate Merge Gate

```bash
# Get previous workflow in this phase (if any)
previous_workflow=$(get_previous_workflow ${phase} ${workflow_name})

if [ -n "$previous_workflow" ]; then
  # Check if previous workflow is merged into phase branch
  # Branch pattern: {featureBranchRoot}-{audience}-p{phaseNumber}
  phase_branch="${featureBranchRoot}-${review_size}-p${phase}"
  workflow_branch="${featureBranchRoot}-${review_size}-p${phase}-${previous_workflow}"
  
  git fetch origin ${phase_branch} ${workflow_branch}
  
  if ! git merge-base --is-ancestor origin/${workflow_branch} origin/${phase_branch}; then
    # GATE BLOCKED
    echo "⚠️ Merge gate blocked"
    echo "├── Expected: ${previous_workflow} merged to phase ${phase}"
    echo "├── Actual: ${previous_workflow} not found in ancestry"
    echo "└── Action: Complete and merge previous workflow first"
    exit 1
  fi
fi
```

### 3. Create Workflow Branch & Push to Remote

```bash
# Branch from phase
# Branch pattern: {featureBranchRoot}-{audience}-p{phaseNumber}-{workflow}
phase_branch="${featureBranchRoot}-${review_size}-p${phase}"
workflow_branch="${featureBranchRoot}-${review_size}-p${phase}-${workflow_name}"

git checkout "${phase_branch}"
git pull origin "${phase_branch}"
git checkout -b "${workflow_branch}"

# CRITICAL: Push immediately to ensure remote backup exists
git push -u origin "${workflow_branch}"
```

### 4. Update State

```yaml
# Update _bmad-output/lens-work/state.yaml
current:
  workflow: ${workflow_name}
  workflow_status: in_progress

branches:
  active: "${featureBranchRoot}-${review_size}-p${phase}-${workflow_name}"

gates:
  - name: "${review_size}-p${phase}-${workflow_name}"
    status: in_progress
    started_at: "${ISO_TIMESTAMP}"
```

### 5. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"start-workflow","workflow":"${workflow_name}","branch":"${featureBranchRoot}-${review_size}-p${phase}-${workflow_name}","pushed":true}
```

### 6. Output

```
✅ Workflow branch created & pushed
└── Branch: ${featureBranchRoot}-${review_size}-p${phase}-${workflow_name}
├── Phase: p${phase}
├── Review audience: ${review_size}
├── Remote: pushed to origin
└── Status: in_progress
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| **Not in control repo** | **HARD GATE: Must run from BMAD control repo root** |
| **Uncommitted changes** | **Auto-commit pending work before proceeding** |
| Remote unreachable | Warn, continue offline, push at finish |
| Gate blocked | Return block message, do not create branch |
| Branch exists | Checkout existing, warn user |
| Fetch failed | Retry with backoff, then fail gracefully |
