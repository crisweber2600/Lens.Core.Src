---
name: review
description: Implementation gate (readiness/sprint planning)
agent: compass
trigger: /review command
category: router
phase: gate
phase_name: Implementation Gate
---

# /review — Implementation Gate Router

**Purpose:** Validate readiness, run sprint planning, create dev-ready story, and hand off to developers.

---

## Role Authorization

**Authorized:** Scrum Master (gate owner)

```yaml
# This is the SM's gate
if user_role != "Scrum Master":
  advisory: "Typically SM owns /review. Proceeding with ${user_role}."
```

---

## Prerequisites

- [x] `/plan` complete (Phase 3 merged)
- [x] Final PBR approved (large → base merged)
- [x] Stories exist
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] P3 gate passed (Solutioning artifacts committed)

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Check previous phase status (if applicable)
# 4. Confirm current branch
# 5. Pull latest
# 6. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to gate checks
# NOTE: /review is a gate phase — no new branch creation

# Verify working directory is clean
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Read size from initiative config (shared, canonical)
size = initiative.size
domain_prefix = initiative.domain_prefix

# === Path Resolver (S01-S06: Context Enhancement) ===
docs_path = initiative.docs.path    # e.g., "docs/BMAD/LENS/BMAD.Lens/context-enhancement-9bfe4e"
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  # Fallback for older initiatives without docs block
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
  warning: "  → Run: /compass migrate <initiative-id> to add docs.path"
  warning: "  → This fallback will be removed in a future version."

output_path = "${docs_path}/reviews/"
ensure_directory("${docs_path}/reviews/")

# REQ-10: Resolve BmadDocs path for per-initiative output co-location
bmad_docs = initiative.docs.bmad_docs   # REQ-10
if bmad_docs != null and bmad_docs != "":
  ensure_directory("${bmad_docs}")   # REQ-10: Auto-create BmadDocs if missing

# REQ-7/REQ-9: Validate previous phase PR merged [S1.5]
prev_phase = "p3"
prev_phase_audience = initiative.review_audience_map.p3
prev_phase_branch = "${initiative.featureBranchRoot}-${prev_phase_audience}-p3"
prev_audience_branch = initiative.branches.audiences[prev_phase_audience]

if initiative.phases[prev_phase] exists:
  if initiative.phases[prev_phase].status == "pr_pending":
    # Check if the audience branch contains the phase commits (merged via PR)
    result = casey.exec("git merge-base --is-ancestor origin/${prev_phase_branch} origin/${prev_audience_branch}")
    
    if result.exit_code == 0:
      # PR was merged! Auto-update status
      invoke: tracey.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          phases:
            p3:
              status: "complete"
              completed_at: "${ISO_TIMESTAMP}"
      output: "✅ Previous phase (p3 plan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phases[prev_phase].pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (p3 plan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch
      
      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Validate we're on the correct branch
# /review operates on the current phase branch (typically small-3 or base)
current_branch = casey.get-current-branch()
invoke: casey.pull-latest

# Confirm to user [REQ-9]
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: Implementation Gate (review)
  ├── Branch: ${current_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify P3 (Solutioning) is complete
# Branch pattern: {featureBranchRoot}-{audience}-p{N}
p3_branch = "${initiative.featureBranchRoot}-${audience}-p3"
audience_branch = "${initiative.featureBranchRoot}-${audience}"

# Ancestry check: P3 must be merged into audience branch
result = casey.exec("git merge-base --is-ancestor origin/${p3_branch} origin/${audience_branch}")

if result.exit_code != 0:
  error: "Phase 3 (Solutioning) not complete. Run /plan first or merge pending PRs."

# Verify final PBR is merged
if not final_pbr_merged():
  error: "Final PBR not approved. Merge large → base PR first."
```

### 1a. Checklist Enforcement — Verify Required Artifacts

```yaml
# Verify all required artifacts exist for current phase
required_artifacts:
  - path: "${docs_path}/product-brief.md"
    phase: "p1"
    name: "Product Brief"
  - path: "${docs_path}/prd.md"
    phase: "p2"
    name: "PRD"
  - path: "${docs_path}/architecture.md"
    phase: "p2"
    name: "Architecture"
  - path: "${docs_path}/epics.md"
    phase: "p3"
    name: "Epics"
  - path: "${docs_path}/stories.md"
    phase: "p3"
    name: "Stories"
  - path: "${docs_path}/readiness-checklist.md"
    phase: "p3"
    name: "Readiness Checklist"

missing = []
for artifact in required_artifacts:
  if not file_exists(artifact.path):
    missing.append("${artifact.name} (${artifact.phase}): ${artifact.path}")

if missing.length > 0:
  output: |
    ⚠️ Missing required artifacts:
    ${missing.join("\n")}
    
    These must exist before passing the implementation gate.
  
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
    
    Resolve blockers before proceeding to implementation.
  exit: 1
```

### 2a. Constitutional Compliance Gate (Required)

```yaml
# Evaluate required artifacts against resolved constitutional rules
compliance_targets:
  - path: "_bmad-output/planning-artifacts/product-brief.md"
    type: "PRD"
  - path: "_bmad-output/planning-artifacts/prd.md"
    type: "PRD"
  - path: "_bmad-output/planning-artifacts/architecture.md"
    type: "Architecture document"
  - path: "_bmad-output/planning-artifacts/epics.md"
    type: "Story/Epic"
  - path: "_bmad-output/planning-artifacts/stories.md"
    type: "Story/Epic"
  - path: "_bmad-output/planning-artifacts/readiness-checklist.md"
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

    Implementation gate blocked until violations are resolved.
  exit: 1
```

### 3. Sprint Planning (if Scrum)

```yaml
invoke: bmm.sprint-planning
params:
  stories: "${docs_path}/stories.md"
  output_path: "${bmad_docs}"   # REQ-10: Sprint backlog to BmadDocs
  constitutional_context: ${constitutional_context}
  
output: |
  📋 Sprint Planning
  ├── Stories prioritized
  ├── Capacity allocated
  ├── Sprint backlog: ${bmad_docs}/sprint-backlog.md   # REQ-10
  └── Sprint backlog created
```

### 4. Create Dev-Ready Story

```yaml
invoke: bmm.create-dev-story
params:
  story_id: "${selected_story}"
  output_path: "${bmad_docs}"   # REQ-10: Dev stories to BmadDocs
  constitutional_context: ${constitutional_context}
  
output: |
  📝 Dev Story Created   # REQ-10
  ├── Story: ${story_id}
  ├── Location: ${bmad_docs}/dev-story-${story_id}.md   # REQ-10
  ├── Acceptance Criteria: ✅
  ├── Technical Notes: ✅
  └── Ready for developer pickup
```

### 5. PR Validation — Generate PR Link

```yaml
# Casey generates PR link for current phase branch → audience branch
invoke: casey.generate-pr-link
params:
  source_branch: "${initiative.featureBranchRoot}-${audience}-p3"
  target_branch: "${initiative.featureBranchRoot}-${audience}"
  title: "[Review] Implementation Gate — ${initiative.name}"
  
output: |
  🔗 Review PR
  ├── Source: ${source_branch}
  ├── Target: ${target_branch}
  └── PR: ${pr_link}
```

### 6. Gate Updates — Mark Pass/Block

```yaml
# Update gate status in initiatives/{id}.yaml
gate_status = (missing.length > 0 or compliance_warnings.length > 0) ? "passed_with_warnings" : "passed"

invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    gates:
      p3_complete:
        status: "passed"
        verified_at: "${ISO_TIMESTAMP}"
      implementation_gate:
        status: ${gate_status}
        verified_at: "${ISO_TIMESTAMP}"
        reviewer: "${user_role}"
        warnings: ${(missing + compliance_warnings).length > 0 ? (missing + compliance_warnings) : null}
        readiness_blockers: ${readiness.blockers || 0}
```

### 7. Update State Files

```yaml
# Update initiative file
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase_name: "Implementation Gate"
    workflow_status: "review_complete"

# Update state.yaml
invoke: tracey.update-state
params:
  updates:
    workflow_status: "review_complete"
    last_review_at: "${ISO_TIMESTAMP}"
```

### 8. Review Event Logging

```yaml
# Log review actions to event-log.jsonl
events:
  - {"ts":"${ISO_TIMESTAMP}","event":"review-start","id":"${initiative.id}","phase":"gate","workflow":"review"}
  - {"ts":"${ISO_TIMESTAMP}","event":"review-checklist","id":"${initiative.id}","phase":"gate","missing_artifacts":${missing.length},"readiness_blockers":${readiness.blockers || 0}}
  - {"ts":"${ISO_TIMESTAMP}","event":"review-compliance","id":"${initiative.id}","phase":"gate","checked_artifacts":${compliance_checked || 0},"warn_count":${compliance_warnings.length || 0},"fail_count":0}
  - {"ts":"${ISO_TIMESTAMP}","event":"review-complete","id":"${initiative.id}","phase":"gate","workflow":"review","status":"${gate_status}"}

invoke: tracey.append-events
params:
  events: ${events}
```

### 9. Commit State Changes

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
# Casey commits all state and artifact changes
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${bmad_docs}/"   # REQ-10: BmadDocs (dev stories, sprint backlog)
    - "${docs_path}/"
  message: "[lens-work] /review: Implementation Gate ${gate_status} — ${initiative.id}"
  branch: ${current_branch}
```

### 10. Hand Off to Developer

```
✅ /review complete — Implementation Gate ${gate_status}

The following story is ready for development:

**Story:** ${story_title}
**ID:** ${story_id}
**Assigned:** ${developer_name} (or unassigned)

**Developer Instructions:**
1. Run `/dev` to start implementation
2. Casey will checkout the feature branch in TargetProjects
3. Implement the story
4. Return to BMAD directory for code review

Hand off to developer? [Y]es / [N]o
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Dev Story | `${initiative.docs.bmad_docs}/dev-story-${id}.md` |   <!-- REQ-10 -->
| Sprint Backlog | `${initiative.docs.bmad_docs}/sprint-backlog.md` |   <!-- REQ-10 -->
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |
| Event Log | `_bmad-output/lens-work/event-log.jsonl` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| P3 not complete | Error with merge instructions |
| Final PBR not merged | Error — must merge large → base PR first |
| Missing artifacts | Warn with list, offer override (passed_with_warnings) |
| Readiness blockers | Block — must resolve before proceeding |
| Dirty working directory | Prompt to stash or commit changes first |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |
| PR link generation failed | Output manual PR instructions |
| Sprint planning failed | Allow manual story selection |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] All required artifacts verified at `${docs_path}/` (or warnings acknowledged)
- [ ] Readiness checklist passed (zero blockers)
- [ ] Dev story created in implementation-artifacts/
- [ ] Gate status recorded in initiatives/{id}.yaml
- [ ] Review events logged to event-log.jsonl
- [ ] state.yaml workflow_status updated to review_complete
- [ ] All changes pushed to origin
- [ ] Developer handoff ready (story + PR link)

