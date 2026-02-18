---
name: plan
description: Product requirements, epics, and feature definition
agent: lens
trigger: /plan command
category: phase
phase: 2
phase_name: Plan
---

# /plan — Plan Phase

**Purpose:** Guide users through product requirements, epics, and feature definition.

---

## Prerequisites

- [x] Pre-plan gate passed (state.gate_status.pre-plan == "passed")
- [x] Active initiative in state.yaml
- [x] Product brief exists from /pre-plan

---

## Execution Sequence

### 0. Git Discipline — Verify Clean State

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

audience = initiative.review_audience_map.p2    # "medium"
featureBranchRoot = initiative.feature_branch_root
audience_branch = "${featureBranchRoot}-${audience}"
phase_branch = "${featureBranchRoot}-${audience}-p2"

docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
ensure_directory(docs_path)
```

### 1. Validate State & Gate

```yaml
if state.active_initiative == null:
  error: "No active initiative. Run /new first."

if state.active_initiative.gate_status.pre-plan != "passed":
  error: "Pre-plan gate not passed. Run /pre-plan first."

skill: constitution.validate-initiative(initiative)
constitutional_context = skill: constitution.resolve-context()

# Load prior artifacts for context
product_brief = load_if_exists("${docs_path}/product-brief.md")
if product_brief == null:
  warning: "⚠️ No product brief found. /plan works best with /pre-plan artifacts."
```

### 2. Audience Cascade — Sync Prior Phase Content

```yaml
# P2 uses a different audience (medium) than P1 (small).
# Merge the prior audience branch into this one so P1 artifacts are available.
prev_audience = initiative.review_audience_map.p1    # "small"
if prev_audience != audience:    # small != medium → cascade needed
  prev_audience_branch = "${featureBranchRoot}-${prev_audience}"

  # Checkout this phase's audience branch
  skill: git-orchestration.checkout-branch(audience_branch)

  # Merge prior audience → this audience (brings P1 artifacts forward)
  merge_result = run: git merge ${prev_audience_branch} --no-edit -m "[lens] cascade: ${prev_audience_branch} → ${audience_branch}"

  if merge_result.conflict:
    error: |
      ⚠️ Cascade merge conflict: ${prev_audience_branch} → ${audience_branch}
      The P1 PR may not have been merged yet. Please:
      1. Merge the P1 PR into ${prev_audience_branch}
      2. Resolve any conflicts manually
      3. Run /plan again

  skill: git-orchestration.commit-and-push
  params:
    branch: ${audience_branch}
    message: "[lens] cascade: P1 artifacts from ${prev_audience_branch} → ${audience_branch}"

  output: |
    🔄 Audience cascade: ${prev_audience_branch} → ${audience_branch}
    └── Prior phase artifacts synced to ${audience} audience
```

### 3. Start Phase — Create P2 Branch

```yaml
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 2
    phase_name: "Plan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}

  skill: git-orchestration.checkout-branch(phase_branch)

skill: state-management.update
params:
  workflow_status: "running"
  current_phase: "p2"
  current_phase_branch: ${phase_branch}

skill: state-management.log-event("workflow_start", {phase: "p2", workflow: "plan"})
```

### 4. Route to BMM Planning Workflows

```yaml
# BMM product planning workflow handles:
# - PRD creation
# - Epic definition
# - User stories
# - Acceptance criteria

skill: git-orchestration.start-workflow("planning")

route: bmm.product-planning
params:
  output_path: ${docs_path}
  product_brief: ${product_brief}
  constitutional_context: ${constitutional_context}
  initiative_context:
    name: ${initiative.name}
    type: ${initiative.type}
    id: ${initiative.id}

skill: git-orchestration.finish-workflow
```

### 5. Artifact Validation

```yaml
# Verify required artifacts exist
include: artifact-validator
params:
  phase: "plan"
  docs_path: ${docs_path}
  required:
    - prd.md
    - epics.md
  optional:
    - user-stories.md
    - acceptance-criteria.md
```

### 6. Phase Completion — PR, Delete, Checkout

```yaml
if all_workflows_complete("p2"):
  skill: git-orchestration.commit-and-push
  params:
    branch: ${phase_branch}
    message: "finish-phase(p2): Plan complete — ${initiative.id}"

  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}
    target: ${audience_branch}
    title: "P2 Plan: ${initiative.name}"
    body: |
      ## Phase 2 Summary
      **Initiative:** ${initiative.id}
      **Phase:** Plan
      **Audience:** ${audience}
      **Branch:** ${phase_branch} → ${audience_branch}

      ### Artifacts
      - PRD
      - Epic definitions
      - User stories
      - Acceptance criteria

  skill: git-orchestration.delete-local-branch(phase_branch)
  skill: git-orchestration.checkout-branch(audience_branch)

  output: |
    ✅ /plan complete
    ├── Phase 2 (Plan) finished
    ├── Artifacts: PRD, epics, stories
    ├── PR created: ${pr_result.url}
    │   └── ${phase_branch} → ${audience_branch}
    ├── Phase branch deleted locally
    ├── Now on: ${audience_branch}
    └── Next: Run /tech-plan to continue
```

### 7. Update State

```yaml
skill: state-management.update
params:
  gate_status.plan: "passed"
  workflow_status: "idle"
  active_branch: ${audience_branch}

skill: state-management.log-event("phase_transition", {
  phase: "p2", phase_name: "Plan", status: "complete", pr_url: ${pr_result.url}
})

skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/state.yaml", "_bmad-output/lens/initiatives/${initiative.id}.yaml",
          "_bmad-output/lens/event-log.jsonl", "${docs_path}/"]
  message: "[lens] /plan: Phase 2 Plan — ${initiative.id}"
  branch: ${audience_branch}

skill: checklist.auto-update({phase: "plan", artifacts_produced: ["prd", "epics", "user-stories", "acceptance-criteria"]})
```

### 8. Offer Next Step

```
Ready to continue?

**[C]** Continue to /tech-plan (Architecture phase)
**[P]** Pause here
**[S]** Show status (/status)
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Pre-plan gate not passed | Run /pre-plan first |
| No product brief | Warn but continue |
| BMM not installed | Error — BMM is required dependency |
| PR creation failed | HARD GATE — block and report |

---

## Post-Conditions

- [ ] PR created: `${phase_branch}` → `${audience_branch}`
- [ ] Phase branch deleted locally
- [ ] state.yaml updated (plan gate → passed)
- [ ] Planning artifacts written
- [ ] All changes pushed
