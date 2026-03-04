---
name: next
description: Determine and execute the next required action
agent: "@lens/state-management"
trigger: "@lens next or @lens NX"
category: utility
---

# Next Workflow

**Purpose:** Automatically determine and execute the next required action based on current state, eliminating the need for users to check status first.

---

## Execution Sequence

### 1. Load State (Two-File Architecture)

```yaml
# Load personal state
state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  # No state → prompt for new initiative
  output: |
    🚀 No active initiative found.
    
    Let's start a new one! Choose:
    
    [1] #new-domain "domain-name" — Create new organizational domain
    [2] #new-service "service-name" — Create new service
    [3] #new-feature "feature-name" — Create new feature
    
    Which would you like to create?
  
  choice = prompt_user()
  
  if choice == "1":
    output: "Domain name?"
    domain = prompt_user()
    invoke_command: "#new-domain ${domain}"
    exit: 0
  else if choice == "2":
    output: "Service name?"
    service = prompt_user()
    invoke_command: "#new-service ${service}"
    exit: 0
  else if choice == "3":
    output: "Feature name?"
    feature = prompt_user()
    invoke_command: "#new-feature ${feature}"
    exit: 0
  else:
    error: "Invalid choice. Run @lens next again."
    exit: 1

# Load initiative config from state (two-file architecture with legacy fallback)
# NOTE: /next has a unique null-state branch above (prompts to create initiative).
# The initiative loading below mirrors shared.load-state.
# Fragment: _bmad/lens-work/workflows/shared/load-state.fragment.md
if state.active_initiative != null:
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  if initiative == null:
    error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
    hint: "Run @lens migrate to convert legacy state, or check initiatives/ directory."
    exit: 1
  legacy_warning: false
else if state.initiative != null:
  # LEGACY single-file format
  initiative = state.initiative
  legacy_warning: true
  output: "⚠️  Legacy state detected. Consider running @lens migrate."
else:
  # Malformed state
  error: "State file exists but contains no initiative data."
  hint: "Run @lens fix or @lens migrate."
  exit: 1
```

### 2. Load Lifecycle Contract

```yaml
lifecycle = load("_bmad/lens-work/lifecycle.yaml")
phase_order = lifecycle.phase_order  # [preplan, businessplan, techplan, devproposal, sprintplan]
audiences = lifecycle.audiences  # {small, medium, large, base}
```

### 3. Analyze Current State

```yaml
current_phase = state.current.phase_name
current_workflow_status = state.current.workflow_status
current_audience = determine_audience(initiative.branches.active, current_phase, lifecycle)  # e.g., "small", "medium", "large", "base"

# Load track to determine which phases are active
track = initiative.track
active_phases = get_active_phases_for_track(track, lifecycle)  # e.g., [preplan, businessplan, techplan]

# Check blocks
blocks = initiative.blocks || []
has_blocks = blocks.length > 0

# Check gates
gates = initiative.gates || []
pending_gates = gates.filter(g => g.status == "pending")
failed_gates = gates.filter(g => g.status == "failed")
```

### 4. Determine Next Action

```yaml
# Priority 1: Active blocks
if has_blocks:
  output: |
    🚫 Active Blocks Detected
    
    Cannot proceed until these are resolved:
    ${for block in blocks}
    - ${block.description}
    ${endfor}
    
    To clear blocks:
    └── Run @lens override (with justification)
  exit: 0

# Priority 2: Failed gates
if failed_gates.length > 0:
  output: |
    ⚠️  Failed Gates Detected
    
    ${for gate in failed_gates}
    - ${gate.name}: ${gate.status}
    ${endfor}
    
    Next steps:
    ├── Address gate requirements
    └── Or run @lens override (with justification)
  exit: 0

# Priority 3: Workflow in progress
if current_workflow_status == "in_progress":
  output: |
    🔄 Continuing current workflow
    
    Phase: ${current_phase}
    Workflow: ${state.current.workflow}
    
    To finish:
    └── Complete your work, then run @lens done
  
  # Don't auto-continue — user is mid-workflow
  exit: 0

# Priority 3.25: In dev phase, force review/fix cycle before broader progression
if current_phase == "dev":
  sprint_status = load_if_exists("_bmad-output/implementation-artifacts/sprint-status.yaml")
  pending_review = []

  if sprint_status != null and sprint_status.development_status != null:
    for story_key, status in sprint_status.development_status:
      if status == "review":
        pending_review.push(story_key)

  if pending_review.length > 0:
    output: |
      🔒 Review cycle required before next progression

      Stories awaiting review/fix completion:
      ${for story in pending_review}
      - ${story}
      ${endfor}

      ▶️  Continuing /dev to complete review fixes before PR progression

    invoke_command: "/dev"
    exit: 0

# Priority 3.5: All sub-workflows complete but phase not yet finalized
lifecycle = load("_bmad/lens-work/lifecycle.yaml")
sub_workflow_defs = lifecycle.phases[current_phase].sub_workflows || []
sub_workflow_status = initiative.sub_workflows[current_phase] || {}
all_required_done = true
for sw in sub_workflow_defs:
  if sw.required == true && sub_workflow_status[sw.name] != "complete":
    all_required_done = false
    break

phase_status = initiative.phase_status[current_phase]
if all_required_done && phase_status not in ["pr_pending", "passed", "complete"]:
  output: |
    ✅ All required sub-workflows for ${current_phase} are complete!
    
    ▶️  Loading phase-completion skill to finalize phase...
  
  # Load and execute phase-completion.md which handles PR, state, and stop
  load_skill: "_bmad/lens-work/skills/phase-completion.md"
  exit: 0

# Priority 3.75: PR Merge Hard Gate
# If the current phase has a pending PR, the user MUST merge it before /next
# will advance to the next phase or workflow. This is a HARD gate — no bypass.
phase_status = initiative.phase_status[current_phase]
if phase_status == "pr_pending":
  # Check if the PR has actually been merged by verifying branch ancestry
  audience = determine_audience(initiative.branches.active, current_phase, lifecycle)
  audience_branch = "${initiative.branches.root}-${audience}"
  phase_branch = "${initiative.branches.root}-${audience}-${current_phase}"
  
  # Fetch latest remote state
  run: git fetch origin ${audience_branch} ${phase_branch} 2>/dev/null || true
  
  # Check if phase branch is ancestor of audience branch (PR merged)
  pr_merged = run: git merge-base --is-ancestor origin/${phase_branch} origin/${audience_branch} 2>/dev/null
  
  if pr_merged == true:
    # PR was merged — update state and allow advancement
    initiative.phase_status[current_phase] = "complete"
    state.phase_status[current_phase] = "complete"
    dual_write(state, initiative)
    append_event: {"ts":"ISO8601","event":"phase_pr_merged","initiative":"{id}","details":{"phase":"{current_phase}"}}
    
    output: |
      ✅ PR for ${current_phase} has been merged!
      
      Phase status updated to complete.
      Continuing to next action...
    
    # Fall through to Priority 4+ to determine next action
  else:
    # PR not yet merged — HARD STOP
    output: |
      🔒 PR Merge Required
      
      Phase ${current_phase} has a pending PR that must be merged before
      /next will advance to the next phase.
      
      Current phase branch: ${phase_branch}
      Target branch: ${audience_branch}
      
      Next steps:
      ├── Review and merge the PR for ${current_phase}
      └── Then run @lens next again
      
      To check PR status:
      └── gh pr list --head ${phase_branch}
    exit: 0

# Priority 4: Current phase incomplete
current_phase_index = phase_order.indexOf(current_phase)
if current_phase_index >= 0:
  phase_complete = (state.phase_status[current_phase] == "complete")
  
  if not phase_complete:
    # Stay in current phase
    output: |
      ▶️  Continuing ${current_phase}
      
    invoke_command: "/${current_phase}"
    exit: 0

# Priority 5: Next phase in track
next_phase = find_next_phase_in_track(current_phase, active_phases, phase_order)

if next_phase != null:
  output: |
    ▶️  Starting next phase: ${next_phase}
    
  invoke_command: "/${next_phase}"
  exit: 0

# Priority 6: All phases in current audience complete → promote
# HARD GATE: All phase PRs must be merged (status == "complete") before promotion.
# If any phase is still "pr_pending", stop and require the PR merge first.
if current_audience == "small":
  # Check if all active phases are complete (not pr_pending)
  all_complete = true
  pr_pending_phases = []
  for phase in active_phases:
    if state.phase_status[phase] == "pr_pending":
      pr_pending_phases.push(phase)
      all_complete = false
    else if state.phase_status[phase] != "complete":
      all_complete = false
  
  if pr_pending_phases.length > 0:
    output: |
      🔒 PR Merge Required Before Promotion
      
      The following phases have pending PRs that must be merged first:
      ${for phase in pr_pending_phases}
      - ${phase}
      ${endfor}
      
      Merge all pending PRs, then run @lens next again.
    exit: 0
  
  if all_complete:
    output: |
      ✅ All small-audience phases complete!
      
      ▶️  Promoting to medium for adversarial review
      
    invoke_command: "@lens promote"
    exit: 0

if current_audience == "medium":
  # Check if adversarial review gate passed
  medium_gate = gates.find(g => g.name == "adversarial-review")
  if medium_gate && medium_gate.status == "passed":
    output: |
      ✅ Medium audience approved!
      
      ▶️  Promoting to large for stakeholder approval
      
    invoke_command: "@lens promote"
    exit: 0
  else:
    output: |
      ⏳ Adversarial review gate not yet marked passed
      
      Current status: ${medium_gate ? medium_gate.status : "pending"}
      
      ▶️  Running audience promotion check now
      (this validates and advances as far as gate status allows)
    invoke_command: "@lens promote"
    exit: 0

if current_audience == "large":
  # Check if stakeholder approval gate passed
  large_gate = gates.find(g => g.name == "stakeholder-approval")
  if large_gate && large_gate.status == "passed":
    output: |
      ✅ Large audience approved!
      
      ▶️  Promoting to base (ready for development)
      
    invoke_command: "@lens promote"
    exit: 0
  else:
    output: |
      ⏳ Stakeholder approval gate not yet marked passed
      
      Current status: ${large_gate ? large_gate.status : "pending"}
      
      ▶️  Running audience promotion check now
      (this validates and advances as far as gate status allows)
    invoke_command: "@lens promote"
    exit: 0

# Priority 7: Base approved → start dev
if current_audience == "base":
  constitution_gate = gates.find(g => g.name == "constitution-gate")
  if constitution_gate && constitution_gate.status == "passed":
    output: |
      ✅ Constitution gate passed!
      
      ▶️  Starting development phase
      
    invoke_command: "/dev"
    exit: 0
  else:
    output: |
      ⏳ Constitution gate validation not yet marked passed
      
      Current status: ${constitution_gate ? constitution_gate.status : "pending"}
      
      ▶️  Running audience promotion check now
      (this validates constitution gate status and advances when ready)
    invoke_command: "@lens promote"
    exit: 0

# Fallback: unclear state
output: |
  ❓ Unable to determine next action automatically
  
  Current state:
  ├── Initiative: ${initiative.name}
  ├── Phase: ${current_phase}
  ├── Audience: ${current_audience}
  └── Status: ${current_workflow_status}
  
  Try:
  ├── @lens ST — full status report
  ├── @lens RS — resume from last checkpoint
  └── @lens fix — repair state issues

exit: 0
```

### 5. Helper Functions

```yaml
# Determine audience for current phase using lifecycle contract
# Primary: use branching_audience from lifecycle (authoritative)
# Fallback: parse from branch name (handles legacy/manual scenarios)
function determine_audience(branch_name, current_phase, lifecycle):
  # 1. Check lifecycle for authoritative branching_audience
  if current_phase != null and lifecycle != null:
    phase_config = lifecycle.phases[current_phase]
    if phase_config != null:
      if phase_config.branching_audience != null:
        return phase_config.branching_audience  # e.g., "medium" for devproposal, "large" for sprintplan
      return phase_config.audience  # e.g., "small" for preplan/businessplan/techplan
  
  # 2. Fallback: parse audience from branch name
  if branch_name.includes("-small"):
    return "small"
  if branch_name.includes("-medium"):
    return "medium"
  if branch_name.includes("-large"):
    return "large"
  # Dev phase or initiative root branch → base
  if branch_name.endsWith("-dev") or not branch_name.includes("-"):
    return "base"
  return "unknown"

# Get active phases for a track
function get_active_phases_for_track(track, lifecycle):
  track_config = lifecycle.tracks[track]
  if track_config == null:
    return lifecycle.phase_order  # Full track as fallback
  return track_config.active_phases

# Find next phase in sequence
function find_next_phase_in_track(current_phase, active_phases, phase_order):
  current_index = phase_order.indexOf(current_phase)
  if current_index < 0:
    return null
  
  # Find next phase that's in the active track
  for i from (current_index + 1) to phase_order.length:
    candidate = phase_order[i]
    if active_phases.includes(candidate):
      return candidate
  
  return null  # No more phases in track
```

---

## Design Notes

**Why This Workflow Exists:**
- Eliminates two-step "check status → execute" pattern
- Maintains flow state by reducing context switching
- Reduces prompt overhead for routine actions
- Provides intelligent defaults based on state machine

**Decision Priority:**
1. Blocks (stop)
2. Failed gates (stop)
3. In-progress workflow (pause)
3.5. All sub-workflows complete — finalize phase (phase-completion skill)
3.75. PR merge hard gate — phase `pr_pending` blocks advancement until merged
4. Incomplete current phase (continue)
5. Next phase in track (advance)
6. Audience promotion (advance) — also gates on all phase PRs merged
7. Start dev (advance)
8. Unclear state (report & exit)

**PR Gate Enforcement:**
- When a phase completes, a PR is created and `phase_status` is set to `pr_pending`
- `/next` will NOT advance to the next phase until the PR is merged
- On each `/next` call, Priority 3.75 checks if the PR has been merged via `git merge-base --is-ancestor`
- If merged, status is updated to `complete` and the workflow falls through to the next priority
- If not merged, the workflow stops with a hard gate message
- Audience promotion (Priority 6) also requires all phase PRs to be merged
- This prevents work on a new branch/phase without the prior PR being reviewed and merged

**When NOT to Use Next:**
- Exploring options (use `@lens ST` instead)
- Skipping phases deliberately (use explicit phase commands)
- Debugging state issues (use `@lens fix` or `@lens RS`)
- Manual workflow control (use explicit workflow commands)

---

## Related Workflows

- **status:** Comprehensive state report with next steps (read-only)
- **resume:** Rehydrate context and explain current state
- **fix-state:** Repair topology and state drift
- **promote:** Advance between audiences
