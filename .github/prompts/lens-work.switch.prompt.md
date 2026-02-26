````prompt
```prompt
---
description: Switch context — initiative, lens, phase, or audience
---

Activate @lens agent and execute /switch:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Load current state: `_bmad-output/lens-work/state.yaml`
3. Determine switch type from user input or present menu
4. Perform switch operation (git checkout + state update)
5. Confirm new context

Use `#think` before determining the appropriate switch operation.

**Switch Types:**

**1. Switch Initiative (domain/service/feature)**
   - Discover all available initiatives by scanning:
     - `initiatives/*/Domain.yaml` → domain initiatives
     - `initiatives/*/*/Service.yaml` → service initiatives  
     - `initiatives/*/*/*.yaml` (feature configs) → feature initiatives
   - For each initiative, query remote branches: `git branch -r | grep {featureBranchRoot}`
   - List all initiatives with their available branches and status
   - User selects target initiative (by name, ID, or number from list)
   - Checkout the appropriate branch for that initiative (see Branch Selection Logic below)
   - Update `state.yaml` → `active_initiative` = new initiative ID

**2. Switch Phase (within current initiative)**
   - Only applies to feature-level initiatives (domains and services have no phases)
   - Read current initiative config: `initiatives/{active_initiative}.yaml`
   - Query remote for available phase branches matching pattern: `{featureBranchRoot}-*-{phaseName}`
   - List available phases that have corresponding remote branches
   - Example phase branch patterns:
     - `-small-preplan` → preplan phase (p1)
     - `-small-businessplan` → businessplan phase (p2)
     - `-small-techplan` → techplan phase (p3)
     - `-small-devproposal` → devproposal phase (p4)
     - `-small-sprintplan` → sprintplan phase (p5)
   - Checkout target phase branch (if exists) or fallback to audience branch
   - Update `state.yaml` → `current_phase` = new phase

**3. Switch Audience (within current initiative)**
   - Only applies to feature-level initiatives (domains and services have no audiences)
   - Query remote for available audience branches: `-small`, `-medium`, `-large`
   - List available audience branches
   - If currently in a phase (e.g., `-small-preplan`), check if target audience+phase branch exists (e.g., `-medium-preplan`); if not, fallback to audience branch (e.g., `-medium`)
   - If in audience branch (e.g., `-small`), switch to target audience (e.g., `-medium`)
   - Update `state.yaml` → update audience context

**Interactive Mode (no arguments):**

Present menu:
```
🔀 Switch Context

Current:
  Initiative: {active_initiative} ({layer})
  Branch:     {current_branch}
  Phase:      {current_phase} 
  Audience:   {current_audience}

What do you want to switch?
  [1] Initiative (feature/service/domain)
  [2] Phase (preplan/businessplan/techplan/devproposal/sprintplan)
  [3] Audience (small/medium/large/base)
  [4] Cancel

Enter choice [1-4]:
```

**Direct Mode (with arguments):**

Parse user input to determine switch target:
- Initiative names/IDs: `/switch {initiative-name}` or `/switch lens-lens-work`
- Phase names: `/switch preplan` or `/switch p2` or `/switch businessplan`
- Audience names: `/switch small` or `/switch medium` or `/switch large`

**Discovery Logic:**

**List all initiatives:**
```bash
# Find all domains
find initiatives/ -name "Domain.yaml" -type f

# Find all services
find initiatives/ -name "Service.yaml" -type f

# Find all features
find initiatives/ -type f -name "*.yaml" ! -name "Domain.yaml" ! -name "Service.yaml"
```

**Query remote branches:**
```bash
# Fetch all remote branches
git fetch origin

# Get list of all remote branches
git branch -r --format='%(refname:short)' | sed 's|origin/||'

# Find branches matching an initiative prefix
git branch -r --format='%(refname:short)' | grep "^origin/{featureBranchRoot}" | sed 's|origin/||'
```

**Map initiative → available branches (query remote):**
- Domain: check if `{domain_prefix}` exists in remote
- Service: check if `{domain_prefix}-{service_prefix}` exists in remote
- Feature: query remote for all branches matching `{featureBranchRoot}*`

**Branch Selection Logic (Phase-First Strategy):**

Given a feature initiative, current audience, and target phase/audience:

1. **If switching to a phase** (e.g., `/switch preplan`):
   - Query remote: `git branch -r | grep "{featureBranchRoot}-.*-{phaseName}"`
   - **Priority 1:** Check if `{featureBranchRoot}-{currentAudience}-{phaseName}` exists → use it
   - **Priority 2:** Check if any `{featureBranchRoot}-{audience}-{phaseName}` exists (prefer existing audience) → use it
   - **Priority 3:** Fallback to `{featureBranchRoot}-{audience}` (latest or first available)
   - **Priority 4:** Fallback to `{featureBranchRoot}` (base branch)

2. **If switching to an audience** (e.g., `/switch medium`):
   - Query remote: `git branch -r | grep "{featureBranchRoot}-{audience}"`
   - **Priority 1:** Check if `{featureBranchRoot}-{audience}-{currentPhase}` exists → use it (preserve phase with new audience)
   - **Priority 2:** Check if `{featureBranchRoot}-{audience}` exists → use it
   - **Priority 3:** Fallback to `{featureBranchRoot}` (base branch)

3. **If switching initiative:**
   - Query remote: `git branch -r | grep "{newFeatureBranchRoot}"`
   - **Priority 1:** Check if `{newFeatureBranchRoot}-small-preplan` exists → use it (start from small preplan)
   - **Priority 2:** Check if any phase branch exists → use it
   - **Priority 3:** Check if audience branch exists → use it
   - **Priority 4:** Use `{newFeatureBranchRoot}` (base branch)

**Git Operations:**

```bash
# Fetch latest remote branches
git fetch origin

# Determine target branch using Branch Selection Logic above
# Example: switching to phase 'preplan' from 'small' audience
target_branch="{featureBranchRoot}-small-preplan"

# Check if branch exists in remote
if git branch -r | grep -q "origin/${target_branch}"; then
  # Exists in remote
  # Check if it exists locally
  if ! git branch | grep -q "^  ${target_branch}$"; then
    # Create local tracking branch
    git checkout -b ${target_branch} origin/${target_branch}
  else
    # Already exists locally
    git checkout ${target_branch}
  fi
else
  # Try fallback branch (audience only, no phase)
  fallback_branch="{featureBranchRoot}-{audience}"
  if git branch -r | grep -q "origin/${fallback_branch}"; then
    if ! git branch | grep -q "^  ${fallback_branch}$"; then
      git checkout -b ${fallback_branch} origin/${fallback_branch}
    else
      git checkout ${fallback_branch}
    fi
  else
    # Final fallback to base
    base_branch="{featureBranchRoot}"
    if ! git branch | grep -q "^  ${base_branch}$"; then
      git checkout -b ${base_branch} origin/${base_branch}
    else
      git checkout ${base_branch}
    fi
  fi
fi

# Verify switch succeeded
git branch --show-current
```

**State Update:**

Update `_bmad-output/lens-work/state.yaml`:
```yaml
active_initiative: "{new_initiative_id}"
current_phase: "{new_phase}"  # null if non-feature or no phase
active_track: null  # v2 compatibility
workflow_status: "{status_from_initiative_config}"
last_activity: "{timestamp}"
```

**Output:**

```
✅ Switched to: {initiative_name}

Context:
  Initiative: {initiative_name} ({layer})
  Branch:     {current_branch}
  Phase:      {current_phase}
  Audience:   {current_audience}
  Status:     {workflow_status}

Next steps:
  • Run /start to see orientation
  • Continue with current phase workflow
  • Run /help for available commands
```

**Error Handling:**

- Branch doesn't exist → "Branch {branch} not found. Run /new-initiative first."
- Invalid initiative ID → "Initiative {id} not found. Run /list-initiatives to see available initiatives."
- Invalid phase → "Phase {phase} not available for this initiative."
- No initiatives found → "No initiatives found. Run /new-initiative to create one."
- Uncommitted changes → "Warning: You have uncommitted changes. Commit or stash before switching."

**Pre-flight Checks:**

1. Check for uncommitted changes: `git status --porcelain`
2. Warn if dirty working tree (but don't block — user may be intentionally saving work)
3. Verify target branch exists (local or remote)
4. Verify initiative config exists before switching

**Special Cases:**

**Switch back to previous:** `/switch -` uses git's `git checkout -` to return to previous branch

**Switch with phase context:** If user says `/switch preplan` while on `lens-feature-x-medium`, switch to `lens-feature-x-small-preplan` (phases default to small audience)

**Switch with audience context:** If user says `/switch medium` while on `lens-feature-x-small-preplan`, switch to `lens-feature-x-medium-preplan` (preserve phase)

```
````
