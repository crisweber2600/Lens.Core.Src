---
name: devproposal
description: Implementation proposal (Epics/Stories/Readiness)
agent: "@lens"
trigger: /devproposal command
aliases: [/plan]
category: router
phase_name: devproposal
display_name: DevProposal
agent_owner: john
agent_role: PM
imports: lifecycle.yaml
---

# /devproposal — DevProposal Phase Router

**Purpose:** Complete the DevProposal phase with Epics, Stories, and Readiness checklist, including mandatory adversarial and party-mode stress tests for epic quality.

**Lifecycle:** `devproposal` phase, audience `medium`, owned by John (PM).

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead (phase owner: John/PM)

---

## Prerequisites

- [x] Small → Medium audience promotion complete (adversarial review gate passed)
- [x] `/techplan` complete (techplan phase merged into small audience branch)
- [x] PRD + Architecture exist
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] techplan gate passed (TechPlan artifacts committed)

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Validate audience promotion (small → medium must be complete)
# 4. Determine correct phase branch: {initiative_root}-{audience}-{phase_name}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to artifact work
# NOTE: devproposal is the FIRST phase in medium audience — requires small→medium promotion

# Verify working directory is clean
invoke: git-orchestration.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Load lifecycle contract for phase → audience mapping
lifecycle = load("lifecycle.yaml")

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix

# Derive audience from lifecycle contract (devproposal → medium)
current_phase = "devproposal"
audience = lifecycle.phases[current_phase].audience    # "medium"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"     # {initiative_root}-medium

# === Path Resolver (S01-S06: Context Enhancement) ===
docs_path = initiative.docs.path    # e.g., "docs/BMAD/LENS/BMAD.Lens/context-enhancement-9bfe4e"
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  # Fallback for older initiatives without docs block
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
  warning: "  → Run: /lens migrate <initiative-id> to add docs.path"
  warning: "  → This fallback will be removed in a future version."

output_path = docs_path
ensure_directory(output_path)

# === Context Loader (S08: Context Enhancement) ===
product_brief = load_file("${docs_path}/product-brief.md")
prd = load_file("${docs_path}/prd.md")
architecture = load_file("${docs_path}/architecture.md")

if product_brief == null or prd == null or architecture == null:
  FAIL("Required planning artifacts missing from ${docs_path}/")

if repo_docs_path != null:
  repo_readme = load_if_exists("${repo_docs_path}/README.md")
  repo_setup = load_if_exists("${repo_docs_path}/SETUP.md")
  repo_context = { readme: repo_readme, setup: repo_setup }
else:
  repo_context = null

# REQ-9: Validate audience promotion gate (small → medium)
# devproposal is in medium — requires adversarial-review gate to have passed
prev_audience = "small"
prev_audience_branch = "${initiative_root}-small"

if initiative.audience_status exists:
  if initiative.audience_status.small_to_medium != "complete":
    # Check if audience promotion PR was merged
    result = git-orchestration.exec("git merge-base --is-ancestor origin/${prev_audience_branch} origin/${audience_branch}")

    if result.exit_code == 0:
      # Promotion was merged! Auto-update status
      invoke: state-management.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          audience_status:
            small_to_medium: "complete"
      output: "✅ Audience promotion (small → medium) complete — adversarial review gate passed"
    else:
      output: |
        ❌ Audience promotion (small → medium) not complete
        ├── Gate: adversarial-review (party mode)
        ├── All small-audience phases (preplan, businessplan, techplan) must be complete
        └── Run audience promotion before starting devproposal

      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0
else:
  warning: "⚠️ No audience_status in initiative config — legacy format detected"

# Determine phase branch [REQ-9]
phase_branch = "${initiative_root}-${audience}-devproposal"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "devproposal"
    display_name: "DevProposal"
    initiative_id: ${initiative.id}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}
  if start_phase.exit_code != 0:
    FAIL("❌ Pre-flight failed: Could not create branch ${phase_branch}")

# Step 6: Checkout phase branch
invoke: git-orchestration.checkout-branch
params:
  branch: ${phase_branch}
invoke: git-orchestration.pull-latest

# Step 7: Confirm to user
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: DevProposal (devproposal)
  ├── Audience: medium (lead review)
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate Prerequisites & Gate Check

```yaml
# Gate check — verify techplan phase artifacts exist and small→medium promotion done
# devproposal is in medium audience — all small phases must be complete
techplan_branch = "${initiative_root}-small-techplan"
small_branch = "${initiative_root}-small"

# Ancestry check: techplan must be merged into small audience branch
result = git-orchestration.exec("git merge-base --is-ancestor origin/${techplan_branch} origin/${small_branch}")

if result.exit_code != 0:
  error: "TechPlan phase not complete. Run /techplan first or merge pending PRs."

# Verify audience promotion gate (small → medium) passed
if initiative.audience_status.small_to_medium != "complete":
  error: "Audience promotion (small → medium) not complete. Run audience-promotion first."

# Verify prior artifacts exist
required_artifacts:
  - "${docs_path}/prd.md"
  - "${docs_path}/architecture.md"

for artifact in required_artifacts:
  if not file_exists(artifact):
    # Fallback: check legacy path for backward compatibility
    legacy_path = artifact.replace("${docs_path}/", "_bmad-output/planning-artifacts/")
    if file_exists(legacy_path):
      warning: "Found artifact at legacy path: ${legacy_path}. Consider migrating."
    else:
      warning: "Required artifact not found: ${artifact}."
```

### 1a. Constitution Compliance Gate (ADVISORY)

```yaml
# Invoke compliance-check to verify inherited constitution constraints
# Mode: ADVISORY (log warnings, do not block)
invoke: lens-work.compliance-check
params:
  phase: "devproposal"
  phase_name: "DevProposal"
  initiative_id: ${initiative.id}
  target_repos: ${initiative.target_repos}
  mode: "ADVISORY"

# Compliance check logs findings to _bmad-output/lens-work/compliance-reports/
# Warnings are surfaced to user but do not block workflow progression
```

### 2. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation and checkout handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
```

### 2a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for this context before solutioning workflows
constitutional_context = invoke("constitution.resolve-context")

if constitutional_context.status == "parse_error":
  error: |
    Constitutional context parse error:
    ${constitutional_context.error_details.file}
    ${constitutional_context.error_details.error}

session.constitutional_context = constitutional_context
```

### 2b. Batch Mode (Single-File Questions)

```yaml
if initiative.question_mode == "batch":
  invoke: lens-work.batch-process
  params:
    phase_name: "devproposal"
    display_name: "DevProposal"
    template_path: "templates/devproposal-questions.template.md"
    output_filename: "devproposal-questions.md"
  exit: 0
```

### 3. Execute Workflows

**⚠️ CRITICAL — Interactive Workflow Rules:**
Each sub-workflow uses sequential step-file architecture.
- 🛑 **NEVER** auto-complete or batch-generate content without user input
- ⏸️ **ALWAYS** STOP and wait for user input/confirmation at each step
- 🚫 **NEVER** load the next step file until user explicitly confirms (Continue / C)
- 📋 Back-and-forth dialogue is REQUIRED — you are a facilitator, not a generator
- 💾 Save/update frontmatter after completing each step before loading the next
- 🎯 Read the ENTIRE step file before taking any action within it

**Agent:** Adopt John (PM) persona — load `_bmad/bmm/agents/pm.md`

#### Epics — Story Breakdown Integration:
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: epics

# RESOLVED: bmm.create-epics → Read fully and follow this workflow file:
#   _bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md
# Agent persona: John (PM) — _bmad/bmm/agents/pm.md
# Uses step-file architecture with steps/ folder
# Load steps one at a time (JIT) — NEVER load multiple step files simultaneously
# ALWAYS halt at menus and wait for user input before proceeding
agent_persona: "_bmad/bmm/agents/pm.md"
read_and_follow: "_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md"
params:
  architecture: "${docs_path}/architecture.md"
  prd: "${docs_path}/prd.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: git-orchestration.finish-workflow
```

#### Epic Stress Gate (Required: Adversarial + Party Mode):
```yaml
# Run adversarial + party-mode teardown for EACH generated epic
epic_ids = extract_epic_ids("${docs_path}/epics.md")

for epic_id in epic_ids:
  # RESOLVED: bmm.check-implementation-readiness → Read fully and follow:
  #   _bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md
  # Run in adversarial mode scoped to individual epic
  read_and_follow: "_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md"
  params:
    mode: "adversarial"
    scope: "epic"
    epic_id: ${epic_id}
    prd: "${docs_path}/prd.md"
    architecture: "${docs_path}/architecture.md"
    epics: "${docs_path}/epics.md"
    constitutional_context: ${constitutional_context}

  if readiness_adversarial.status in ["blocked", "fail"]:
    error: |
      Epic adversarial review failed for ${epic_id}.
      Resolve implementation-readiness findings before continuing.

  # RESOLVED: core.party-mode → Read fully and follow:
  #   _bmad/core/workflows/party-mode/workflow.md
  # Uses step-file architecture — halt at each step, wait for user input
  read_and_follow: "_bmad/core/workflows/party-mode/workflow.md"
  params:
    input_file: "${docs_path}/epics.md"
    focus_epic: ${epic_id}
    artifacts_path: "${docs_path}/"
    output_file: "${docs_path}/epic-${epic_id}-party-mode-review.md"
    constitutional_context: ${constitutional_context}

  if party_mode.status not in ["pass", "complete"]:
    error: |
      Epic party-mode review flagged unresolved issues for ${epic_id}.
      Address ${docs_path}/epic-${epic_id}-party-mode-review.md and re-run /plan.
```
#### Stories — Story Breakdown Integration:
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: stories

# RESOLVED: bmm.create-stories → Continue the epics-and-stories workflow:
#   _bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md
# Story generation portion — continues from epic output
# Agent persona: John (PM) — _bmad/bmm/agents/pm.md
# Uses step-file architecture — halt at each step, wait for user input
read_and_follow: "_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md"
params:
  mode: "stories"  # Continue from epic output, generate stories
  epics: "${docs_path}/epics.md"
  architecture: "${docs_path}/architecture.md"
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: git-orchestration.finish-workflow
```

#### Readiness Checklist:
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: readiness

# RESOLVED: bmm.readiness-checklist → Read fully and follow:
#   _bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md
# Final full-scope readiness validation across all artifacts
# Agent persona: John (PM) — _bmad/bmm/agents/pm.md
# Halt and present readiness findings to user before marking complete
read_and_follow: "_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md"
params:
  artifacts:
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
    - stories.md
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}

invoke: git-orchestration.finish-workflow
```

### 4. Phase Completion — Push Only

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
if all_workflows_complete("devproposal"):
  invoke: git-orchestration.commit-and-push
  params:
    branch: ${phase_branch}
    message: "[${initiative.id}] DevProposal complete"
  # Phase branch remains alive — PR handles merge to audience branch

  # REQ-8: Create PR for phase merge
  invoke: git-orchestration.create-pr
  params:
    head: ${phase_branch}
    base: ${audience_branch}
    title: "[devproposal] DevProposal: ${initiative.name}"
    body: "DevProposal phase complete for ${initiative.id}.\n\nArtifacts: epics.md, stories.md, readiness-checklist.md"
  capture: pr_result  # { url, number } or fallback message

  # REQ-7/REQ-8: Phase enters pr_pending after PR creation
  invoke: state-management.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phase_status:
        devproposal:
          status: "pr_pending"
          pr_url: "${pr_result.url}"
          pr_number: ${pr_result.number}
  # If manual fallback (no PAT), still set pr_pending with null PR info
  if pr_result.fallback:
    invoke: state-management.update-initiative
    params:
      initiative_id: ${initiative.id}
      updates:
        phase_status:
          devproposal:
            status: "pr_pending"
            pr_url: null
            pr_number: null

  output: |
    ✅ /devproposal complete
    ├── Phase: DevProposal (devproposal) finished
    ├── Audience: medium (lead review)
    ├── Branch pushed: ${phase_branch}
    ├── PR: ${pr_result}
    ├── Status: pr_pending (awaiting merge)
    ├── Stories ready for sprint planning
    └── Next: Run audience promotion (medium → large), then /sprintplan
```

### 5. Update State Files

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "devproposal"
    phase_status:
      devproposal:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"
    audience_status:
      small_to_medium: "complete"

# Update state.yaml
invoke: state-management.update-state
params:
  updates:
    current_phase: "devproposal"
    workflow_status: "pr_pending"
    active_branch: "${phase_branch}"
```

### 6. Commit State Changes

```yaml
# git-orchestration commits all state and artifact changes
invoke: git-orchestration.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens-work] /devproposal: DevProposal — ${initiative.id}"
  branch: "${phase_branch}"
```

### 7. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"devproposal","id":"${initiative.id}","phase":"devproposal","audience":"medium","workflow":"devproposal","status":"complete"}
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Epics | `${docs_path}/epics.md` |
| Epic Party-Mode Review | `_bmad-output/planning-artifacts/epic-*-party-mode-review.md` |
| Implementation Readiness Adversarial Report | `_bmad-output/planning-artifacts/implementation-readiness-report-*.md` |
| Stories | `${docs_path}/stories.md` |
| Readiness | `${docs_path}/readiness-checklist.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| TechPlan not complete | Error with merge instructions |
| Audience promotion (small→medium) not done | Error — run audience-promotion first |
| PRD/Architecture missing | Warn, proceeding may produce incomplete epics |
| Dirty working directory | Prompt to stash or commit changes first |
| Branch creation failed | Check remote connectivity, retry with backoff |
| Audience promotion check failed | Prompt to run audience-promotion before continuing |
| Epic/Story generation failed | Retry or allow manual creation |
| Epic adversarial review failed | Resolve implementation-readiness findings and re-run /plan |
| Epic party-mode review failed | Address party-mode findings and re-run /plan |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] On phase branch: `{initiative_root}-medium-devproposal` (REQ-7: no auto-merge)
- [ ] state.yaml updated with phase devproposal
- [ ] initiatives/{id}.yaml phase_status.devproposal updated
- [ ] audience_status.small_to_medium marked complete
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (epics, stories, readiness-checklist)
- [ ] Epic adversarial review executed and passed
- [ ] Epic party-mode review executed and report generated
- [ ] All changes pushed to origin

