---
name: sprintplan
description: Sprint planning phase — sprint-status, story files, dev handoff
agent: compass
trigger: /sprintplan command
aliases: [/review, /sprint]
category: router
phase_name: sprintplan
display_name: SprintPlan
agent_owner: bob
agent_role: Scrum Master
imports: lifecycle.yaml
---

# /sprintplan — SprintPlan Phase Router

**Purpose:** Validate readiness, run sprint planning, create dev-ready stories, and hand off to developers.

**Lifecycle:** `sprintplan` phase, audience `large` (stakeholder approval), owned by Bob (Scrum Master).

---

## Role Authorization

**Authorized:** Scrum Master (phase owner: Bob/SM)

```yaml
# This is the SM's phase
if user_role != "Scrum Master":
  advisory: "Typically SM owns /sprintplan. Proceeding with ${user_role}."
```

---

## Prerequisites

- [x] Medium → Large audience promotion complete (stakeholder-approval gate passed)
- [x] `/devproposal` complete (devproposal phase merged into medium audience branch)
- [x] Stories exist
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] devproposal gate passed (DevProposal artifacts committed)

---

## Gate Chain Position

```
(none) → preplan → businessplan → techplan → [small→medium] → devproposal → [medium→large] → [sprintplan] → [large→base] → dev
```

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Validate audience promotion (medium → large must be complete)
# 4. Determine correct phase branch: {initiative_root}-{audience}-{phase_name}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to sprint planning
# NOTE: sprintplan is the FIRST phase in large audience — requires medium→large promotion

# Verify working directory is clean
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Load lifecycle contract for phase → audience mapping
lifecycle = load("lifecycle.yaml")

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix

# Derive audience from lifecycle contract (sprintplan → large)
current_phase = "sprintplan"
audience = lifecycle.phases[current_phase].audience    # "large"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"     # {initiative_root}-large

# === Path Resolver (S01-S06: Context Enhancement) ===
docs_path = initiative.docs.path
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."

output_path = "${docs_path}/reviews/"
ensure_directory("${docs_path}/reviews/")

# REQ-10: Resolve BmadDocs path for per-initiative output co-location
bmad_docs = initiative.docs.bmad_docs
if bmad_docs != null and bmad_docs != "":
  ensure_directory("${bmad_docs}")

# REQ-9: Validate audience promotion gate (medium → large)
# sprintplan is in large — requires stakeholder-approval gate to have passed
prev_audience = "medium"
prev_audience_branch = "${initiative_root}-medium"

if initiative.audience_status exists:
  if initiative.audience_status.medium_to_large != "complete":
    # Check if audience promotion PR was merged
    result = casey.exec("git merge-base --is-ancestor origin/${prev_audience_branch} origin/${audience_branch}")

    if result.exit_code == 0:
      # Promotion was merged! Auto-update status
      invoke: tracey.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          audience_status:
            medium_to_large: "complete"
      output: "✅ Audience promotion (medium → large) complete — stakeholder approval gate passed"
    else:
      output: |
        ❌ Audience promotion (medium → large) not complete
        ├── Gate: stakeholder-approval
        ├── All medium-audience phases (devproposal) must be complete
        └── Run audience promotion before starting sprintplan

      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0
else:
  warning: "⚠️ No audience_status in initiative config — legacy format detected"

# Determine phase branch [REQ-9]
phase_branch = "${initiative_root}-${audience}-sprintplan"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: casey.start-phase
  params:
    phase_name: "sprintplan"
    display_name: "SprintPlan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}
  if start_phase.exit_code != 0:
    FAIL("❌ Pre-flight failed: Could not create branch ${phase_branch}")

# Step 6: Checkout phase branch
invoke: casey.checkout-branch
params:
  branch: ${phase_branch}
invoke: casey.pull-latest

# Step 7: Confirm to user [REQ-9]
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: SprintPlan (sprintplan)
  ├── Audience: large (stakeholder approval)
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify devproposal phase is complete and medium→large promotion done
devproposal_branch = "${initiative_root}-medium-devproposal"
medium_branch = "${initiative_root}-medium"

# Ancestry check: devproposal must be merged into medium audience branch
result = casey.exec("git merge-base --is-ancestor origin/${devproposal_branch} origin/${medium_branch}")

if result.exit_code != 0:
  error: "DevProposal phase not complete. Run /devproposal first or merge pending PRs."

# Verify audience promotion gate (medium → large) passed
if initiative.audience_status.medium_to_large != "complete":
  error: "Audience promotion (medium → large) not complete. Run audience-promotion first."
```

### 1a. Checklist Enforcement — Verify Required Artifacts

```yaml
# Verify all required artifacts exist for sprint planning
required_artifacts:
  - path: "${docs_path}/product-brief.md"
    phase: "preplan"
    name: "Product Brief"
  - path: "${docs_path}/prd.md"
    phase: "businessplan"
    name: "PRD"
  - path: "${docs_path}/architecture.md"
    phase: "techplan"
    name: "Architecture"
  - path: "${docs_path}/epics.md"
    phase: "devproposal"
    name: "Epics"
  - path: "${docs_path}/stories.md"
    phase: "devproposal"
    name: "Stories"
  - path: "${docs_path}/readiness-checklist.md"
    phase: "devproposal"
    name: "Readiness Checklist"

missing = []
for artifact in required_artifacts:
  if not file_exists(artifact.path):
    missing.append("${artifact.name} (${artifact.phase}): ${artifact.path}")

if missing.length > 0:
  output: |
    ⚠️ Missing required artifacts:
    ${missing.join("\n")}

    These must exist before passing the sprint planning gate.

  offer: "Continue anyway? [Y]es / [N]o — (choosing Yes will mark gate as 'passed_with_warnings')"
```

### 1b. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for gate checks and downstream workflows
constitutional_context = invoke("scribe.resolve-context")

if constitutional_context.status == "parse_error":
  error: |
    Constitutional context parse error:
    ${constitutional_context.error_details.file}
    ${constitutional_context.error_details.error}

session.constitutional_context = constitutional_context
```

### 2. Re-run Readiness Checklist

```yaml
invoke: bmm.readiness-checklist
params:
  mode: "validate"  # Check, don't create
  constitutional_context: ${constitutional_context}

if readiness.blockers > 0:
  output: |
    ⚠️ Readiness blockers found:
    ${readiness.blockers}

    Resolve blockers before proceeding to sprint planning.
  exit: 1
```

### 2a. Constitutional Compliance Gate (Required)

```yaml
# Evaluate required artifacts against resolved constitutional rules
compliance_targets:
  - path: "${docs_path}/product-brief.md"
    type: "PRD"
  - path: "${docs_path}/prd.md"
    type: "PRD"
  - path: "${docs_path}/architecture.md"
    type: "Architecture document"
  - path: "${docs_path}/epics.md"
    type: "Story/Epic"
  - path: "${docs_path}/stories.md"
    type: "Story/Epic"
  - path: "${docs_path}/readiness-checklist.md"
    type: "Story/Epic"

compliance_failures = []
compliance_warnings = []
compliance_checked = 0

for target in compliance_targets:
  if file_exists(target.path):
    compliance_result = invoke("scribe.compliance-check")
    params:
      artifact_path: ${target.path}
      artifact_type: ${target.type}
      constitutional_context: ${constitutional_context}

    compliance_checked = compliance_checked + 1

    if compliance_result.fail_count > 0:
      compliance_failures.append("${target.path}: ${compliance_result.fail_count} FAIL")

    if compliance_result.warn_count > 0:
      compliance_warnings.append("${target.path}: ${compliance_result.warn_count} WARN")

if compliance_failures.length > 0:
  output: |
    FAIL Constitutional compliance failures detected:
    ${compliance_failures.join("\n")}

    Sprint planning blocked until violations are resolved.
  exit: 1
```

### 3. Sprint Planning

```yaml
invoke: casey.start-workflow
params:
  workflow_name: sprint-planning

invoke: bmm.sprint-planning
params:
  stories: "${docs_path}/stories.md"
  output_path: "${bmad_docs}"   # REQ-10: Sprint backlog to BmadDocs
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow

output: |
  📋 Sprint Planning
  ├── Stories prioritized
  ├── Capacity allocated
  ├── Sprint backlog: ${bmad_docs}/sprint-backlog.md
  └── Sprint backlog created
```

### 4. Create Dev-Ready Story

```yaml
invoke: casey.start-workflow
params:
  workflow_name: dev-story

invoke: bmm.create-dev-story
params:
  story_id: "${selected_story}"
  output_path: "${bmad_docs}"   # REQ-10: Dev stories to BmadDocs
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow

output: |
  📝 Dev Story Created
  ├── Story: ${story_id}
  ├── Location: ${bmad_docs}/dev-story-${story_id}.md
  ├── Acceptance Criteria: ✅
  ├── Technical Notes: ✅
  └── Ready for developer pickup
```

### 5. Phase Completion — Push & PR

```yaml
# REQ-7: Never auto-merge. PR created.
invoke: casey.commit-and-push
params:
  branch: ${phase_branch}
  message: "[${initiative.id}] SprintPlan complete"

# REQ-8: Create PR for phase merge
invoke: casey.create-pr
params:
  head: ${phase_branch}
  base: ${audience_branch}
  title: "[sprintplan] SprintPlan: ${initiative.name}"
  body: "SprintPlan phase complete for ${initiative.id}.\n\nArtifacts: sprint-backlog.md, dev-story-*.md"
capture: pr_result

# REQ-7/REQ-8: Phase enters pr_pending after PR creation
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    phase_status:
      sprintplan:
        status: "pr_pending"
        pr_url: "${pr_result.url}"
        pr_number: ${pr_result.number}
if pr_result.fallback:
  invoke: tracey.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phase_status:
        sprintplan:
          status: "pr_pending"
          pr_url: null
          pr_number: null
```

### 6. Gate Updates — Mark Pass/Block

```yaml
# Update gate status in initiatives/{id}.yaml
gate_status = (missing.length > 0 or compliance_warnings.length > 0) ? "passed_with_warnings" : "passed"

invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "sprintplan"
    phase_status:
      sprintplan:
        status: ${gate_status}
        verified_at: "${ISO_TIMESTAMP}"
        reviewer: "${user_role}"
        warnings: ${(missing + compliance_warnings).length > 0 ? (missing + compliance_warnings) : null}
        readiness_blockers: ${readiness.blockers || 0}
    audience_status:
      medium_to_large: "complete"
```

### 7. Update State Files

```yaml
# Update state.yaml
invoke: tracey.update-state
params:
  updates:
    current_phase: "sprintplan"
    workflow_status: "pr_pending"
    active_branch: "${phase_branch}"
```

### 8. Event Logging

```yaml
# Log sprint planning actions to event-log.jsonl
events:
  - {"ts":"${ISO_TIMESTAMP}","event":"sprintplan-start","id":"${initiative.id}","phase":"sprintplan","audience":"large"}
  - {"ts":"${ISO_TIMESTAMP}","event":"sprintplan-checklist","id":"${initiative.id}","phase":"sprintplan","missing_artifacts":${missing.length},"readiness_blockers":${readiness.blockers || 0}}
  - {"ts":"${ISO_TIMESTAMP}","event":"sprintplan-compliance","id":"${initiative.id}","phase":"sprintplan","checked_artifacts":${compliance_checked || 0},"warn_count":${compliance_warnings.length || 0},"fail_count":0}
  - {"ts":"${ISO_TIMESTAMP}","event":"sprintplan-complete","id":"${initiative.id}","phase":"sprintplan","audience":"large","status":"${gate_status}"}

invoke: tracey.append-events
params:
  events: ${events}
```

### 9. Commit State Changes

```yaml
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${bmad_docs}/"
    - "${docs_path}/"
  message: "[lens-work] /sprintplan: SprintPlan — ${initiative.id}"
  branch: ${phase_branch}
```

### 10. Hand Off to Developer

```
✅ /sprintplan complete — SprintPlan ${gate_status}

The following story is ready for development:

**Story:** ${story_title}
**ID:** ${story_id}
**Assigned:** ${developer_name} (or unassigned)

**Phase:** SprintPlan (sprintplan)
**Audience:** large (stakeholder approval)
**Branch:** ${phase_branch}
**PR:** ${pr_result}
**Status:** pr_pending (awaiting merge)

**Next steps:**
1. Merge sprintplan PR into large audience branch
2. Run audience promotion (large → base) for constitution gate
3. Run /dev to start implementation

Hand off to developer? [Y]es / [N]o
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Dev Story | `${initiative.docs.bmad_docs}/dev-story-${id}.md` |
| Sprint Backlog | `${initiative.docs.bmad_docs}/sprint-backlog.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |
| Event Log | `_bmad-output/lens-work/event-log.jsonl` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| DevProposal not complete | Error with merge instructions |
| Audience promotion (medium→large) not done | Error — run audience-promotion first |
| Missing artifacts | Warn with list, offer override (passed_with_warnings) |
| Readiness blockers | Block — must resolve before proceeding |
| Dirty working directory | Prompt to stash or commit changes first |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |
| PR link generation failed | Output manual PR instructions |
| Sprint planning failed | Allow manual story selection |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] On phase branch: `{initiative_root}-large-sprintplan` (REQ-7: no auto-merge)
- [ ] All required artifacts verified at `${docs_path}/` (or warnings acknowledged)
- [ ] Readiness checklist passed (zero blockers)
- [ ] Dev story created at `${bmad_docs}/`
- [ ] phase_status.sprintplan updated in initiatives/{id}.yaml
- [ ] audience_status.medium_to_large marked complete
- [ ] Sprint planning events logged to event-log.jsonl
- [ ] state.yaml updated with phase sprintplan
- [ ] All changes pushed to origin
- [ ] Developer handoff ready (story + PR link)
