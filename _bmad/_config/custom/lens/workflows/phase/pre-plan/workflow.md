---
name: pre-plan
description: Brainstorming, discovery, and vision setting
agent: lens
trigger: /pre-plan command
category: phase
phase: 1
phase_name: Pre-Plan
---

# /pre-plan — Pre-Plan Phase

**Purpose:** Guide users through brainstorming, discovery, and vision setting for an initiative.

---

## User Interaction Keywords

- **"defaults"** → Apply defaults to current step only
- **"yolo"** → Apply defaults to entire remaining workflow
- **"all questions"** → Present all questions upfront → batch answers → refine
- **"skip"** → Jump to a named optional step
- **"pause"** → Save progress, resume later with `/resume`
- **"back"** → Roll back to previous step

---

## Prerequisites

- [x] Initiative created via `/new`
- [x] state.yaml exists with active initiative
- [x] Initiative config exists in initiatives/

---

## Execution Sequence

### 0. Git Discipline — Verify Clean State

```yaml
# Verify working directory is clean
skill: git-orchestration.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

# Derive audience for P1 from review_audience_map
audience = initiative.review_audience_map.p1    # "small"
featureBranchRoot = initiative.feature_branch_root

# Compute branch names for this phase
audience_branch = "${featureBranchRoot}-${audience}"    # {featureBranchRoot}-small
phase_branch = "${featureBranchRoot}-${audience}-p1"    # {featureBranchRoot}-small-p1

# Path resolver
docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
ensure_directory(docs_path)

# Validate branch
expected_branch = phase_branch
current_branch = skill: git-orchestration.get-current-branch()

if current_branch != expected_branch:
  if branch_exists(expected_branch):
    skill: git-orchestration.checkout-branch(expected_branch)
  # else: branch will be created in Step 2
```

### 1. Validate State & Constitution

```yaml
# Check active initiative
if state.active_initiative == null:
  error: "No active initiative. Run /new first."

# Constitution enforcement — verify required fields
skill: constitution.validate-initiative(initiative)

# Phase check
if initiative.current_phase not in [null, "p1"]:
  warning: "Current phase is ${initiative.current_phase}. /pre-plan is for Phase 1."

# Constitutional context injection
constitutional_context = skill: constitution.resolve-context()

if constitutional_context.status == "parse_error":
  error: "Constitutional context parse error: ${constitutional_context.error_details}"

# Discovery validation
inventory = load_if_exists("_bmad-output/lens/repo-inventory.yaml")
if inventory == null:
  warning: "⚠️ Discovery not run. Run /discover for better context. Proceeding without."
```

### 2. Start Phase — Create P1 Branch

```yaml
# Create phase branch if it doesn't exist
# Phase branches are created by phase routers, NOT at init.
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 1
    phase_name: "Pre-Plan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}
  # Creates: ${phase_branch} from ${audience_branch}
  # Pushes immediately: git push -u origin ${phase_branch}

  skill: git-orchestration.checkout-branch(phase_branch)

# Update state
skill: state-management.update
params:
  workflow_status: "running"
  current_phase: "p1"
  current_phase_branch: ${phase_branch}

# Log event
skill: state-management.log-event("workflow_start", {phase: "p1", workflow: "pre-plan"})
```

### 3. Offer Workflow Options

```
🔭 /pre-plan — Pre-Plan Phase

You're starting the Pre-Plan phase. Available workflows:

**[1] Brainstorming** (optional) — Creative exploration with CIS
**[2] Research** (optional) — Deep dive research with CIS
**[3] Product Brief** (required) — Define problem, vision, and scope

Recommended path: 1 → 2 → 3 (or skip to 3 if you have clarity)

Select workflow(s): [1] [2] [3] [A]ll [S]kip to Product Brief
```

### 4. Execute Selected Workflows

#### If Brainstorming selected:
```yaml
skill: git-orchestration.start-workflow("brainstorm")

route: cis.brainstorming
params:
  context: "${initiative.name} at ${initiative.type} layer"
  constitutional_context: ${constitutional_context}

skill: git-orchestration.finish-workflow
```

#### If Research selected:
```yaml
skill: git-orchestration.start-workflow("research")

route: cis.research
params:
  constitutional_context: ${constitutional_context}

skill: git-orchestration.finish-workflow
```

#### Product Brief (always):
```yaml
skill: git-orchestration.start-workflow("product-brief")

route: bmm.product-brief
params:
  output_path: ${docs_path}
  constitutional_context: ${constitutional_context}

skill: git-orchestration.finish-workflow
```

### 5. Phase Completion — PR, Delete, Checkout

```yaml
if all_workflows_complete("p1"):
  # Push final state
  skill: git-orchestration.commit-and-push
  params:
    branch: ${phase_branch}
    message: "finish-phase(p1): Pre-Plan complete — ${initiative.id}"

  # Create PR: phase → audience branch (HARD GATE)
  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}                # {featureBranchRoot}-small-p1
    target: ${audience_branch}             # {featureBranchRoot}-small
    title: "P1 Pre-Plan: ${initiative.name}"
    body: |
      ## Phase 1 Summary
      **Initiative:** ${initiative.id}
      **Phase:** Pre-Plan
      **Audience:** ${audience}
      **Branch:** ${phase_branch} → ${audience_branch}

  # Delete phase branch locally
  skill: git-orchestration.delete-local-branch(phase_branch)

  # Checkout audience branch
  skill: git-orchestration.checkout-branch(audience_branch)

  output: |
    ✅ /pre-plan complete
    ├── Phase 1 (Pre-Plan) finished
    ├── Artifacts: product-brief.md
    ├── PR created: ${pr_result.url}
    │   └── ${phase_branch} → ${audience_branch}
    ├── Phase branch deleted locally
    ├── Now on: ${audience_branch}
    └── Next: Run /plan to continue
```

### 6. Update State

```yaml
skill: state-management.update
params:
  gate_status.pre-plan: "passed"
  workflow_status: "idle"
  active_branch: ${audience_branch}

skill: state-management.log-event("phase_transition", {
  phase: "p1",
  phase_name: "Pre-Plan",
  status: "complete",
  pr_url: ${pr_result.url}
})

# Auto-commit state files
skill: git-orchestration.commit-and-push
params:
  paths:
    - "_bmad-output/lens/state.yaml"
    - "_bmad-output/lens/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens] /pre-plan: Phase 1 Pre-Plan — ${initiative.id}"
  branch: ${audience_branch}
```

### 7. Update Checklist

```yaml
skill: checklist.auto-update
params:
  phase: "pre-plan"
  artifacts_produced:
    - product-brief
    - brainstorm-notes     # if brainstorming was run
    - research-summary     # if research was run
```

### 8. Offer Next Step

```
Ready to continue?

**[C]** Continue to /plan (Plan phase)
**[P]** Pause here (resume later with /plan)
**[S]** Show status (/status)
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Product Brief | `${docs_path}/product-brief.md` |
| Brainstorm Notes | `${docs_path}/brainstorm-notes.md` (optional) |
| Research Summary | `${docs_path}/research-summary.md` (optional) |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No initiative | Prompt to run /new first |
| Wrong phase | Warn but allow override |
| CIS not installed | Skip brainstorm/research, proceed to product brief |
| Dirty working directory | Prompt to stash or commit first |
| Branch creation failed | Check remote, retry with backoff |
| PR creation failed | HARD GATE — block and report error |
| State write failed | Retry (max 3), then fail with manual save instructions |

---

## Post-Conditions

- [ ] Working directory clean
- [ ] PR created: `${phase_branch}` → `${audience_branch}`
- [ ] Phase branch deleted locally
- [ ] Checked out to audience branch
- [ ] state.yaml updated (pre-plan gate → passed)
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/`
- [ ] All changes pushed to origin
