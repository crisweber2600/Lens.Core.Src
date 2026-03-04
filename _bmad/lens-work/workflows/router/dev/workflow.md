---
name: dev
description: Implementation loop (dev-story/code-review/retro)
agent: "@lens"
trigger: /dev command
category: router
phase: dev
phase_name: Dev
---

# /dev — Implementation Phase Router

**Purpose:** Guide developers through implementation, constitution-aware adversarial code review, epic-completion teardown, and retrospective.

---

## Role Authorization

**Authorized:** Developer (post-review only)

```yaml
# Dev story check deferred to Step 0 for batch mode support
```

---

## Prerequisites

- [x] `/sprintplan` complete (large → base promotion passed)
- [x] Dev story exists (interactive mode)
- [x] Developer assigned (or self-assigned)
- [x] state.yaml + initiatives/{id}.yaml exist
- [x] Constitution gate passed (large → base audience promotion)

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Check previous phase status (if applicable)
# 4. Determine correct phase branch: {initiative_root}-{audience}-{phase_name}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to artifact work

# Verify working directory is clean
invoke: git-orchestration.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Read initiative config
size = initiative.size
domain_prefix = initiative.domain_prefix

# Derive audience for dev phase (base) [REQ-9]
audience = "base"
initiative_root = initiative.initiative_root
audience_branch = "base"

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

# NOTE: docs_path is READ-ONLY in /dev — used for context loading (S11)
# Dev outputs go to _bmad-output/implementation-artifacts/ (unchanged)

# REQ-10: Resolve BmadDocs path for per-initiative output co-location
bmad_docs = initiative.docs.bmad_docs   # REQ-10

# === Context Loader (S11: Context Enhancement) ===
# Load planning context for dev reference (read-only)
if docs_path != "_bmad-output/planning-artifacts/":
  architecture = load_if_exists("${docs_path}/architecture.md")
  stories = load_if_exists("${docs_path}/stories.md")
  planning_context = { architecture: architecture, stories: stories }
else:
  planning_context = null

# REQ-7/REQ-9: Validate previous phase (sprintplan) and audience promotion [S1.5]
prev_phase = "sprintplan"
prev_audience = "large"
prev_phase_branch = "${initiative.initiative_root}-${prev_audience}-sprintplan"
prev_audience_branch = "${initiative.initiative_root}-${prev_audience}"

if initiative.phase_status[prev_phase] exists:
  if initiative.phase_status[prev_phase] == "pr_pending":
    # Check if the audience branch contains the phase commits (merged via PR)
    result = git-orchestration.exec("git merge-base --is-ancestor origin/${prev_phase_branch} origin/${prev_audience_branch}")

    if result.exit_code == 0:
      # PR was merged! Auto-update status
      invoke: state-management.update-initiative
      params:
        initiative_id: ${initiative.id}
        updates:
          phase_status:
            sprintplan: "complete"
      output: "✅ Previous phase (sprintplan) PR merged — status updated to complete"
    else:
      # PR not merged yet — warn but allow proceeding
      pr_url = initiative.phase_status.sprintplan_pr_url || "(no PR URL recorded)"
      output: |
        ⚠️  Previous phase (sprintplan) PR not yet merged
        ├── Status: pr_pending
        ├── PR: ${pr_url}
        └── You may continue, but phase artifacts may not be on the audience branch

      ask: "Continue anyway? [Y]es / [N]o"
      if no:
        exit: 0  # User chose to wait for merge

# Require dev story for interactive mode
if initiative.question_mode != "batch" and not dev_story_exists():
  error: "/sprintplan has not produced a dev-ready story. Run /sprintplan first."

# Audience validation — verify large→base promotion passed
if initiative.audience_status.large_to_base not in ["passed", "passed_with_warnings"]:
  output: |
    ⏳ Audience promotion validation pending
    ├── Required: large → base promotion (constitution gate)
    └── ▶️  Auto-triggering audience promotion now
  invoke_command: "@lens promote"
  exit: 0

# Determine phase branch [REQ-9]
phase_branch = "${initiative.initiative_root}-dev"

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "dev"
    initiative_id: ${initiative.id}
    audience: ${audience}
    initiative_root: ${initiative.initiative_root}
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
  ├── Phase: Dev (Implementation)
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Audience Promotion Check — large → base Complete

```yaml
# Verify large→base audience promotion gate passed (constitution gate via constitution skill)
# All large-audience phases (sprintplan) must be merged
sprintplan_branch = "${initiative.initiative_root}-large-sprintplan"
large_branch = "${initiative.initiative_root}-large"

# Ancestry check: sprintplan must be merged into large audience branch
result = git-orchestration.exec("git merge-base --is-ancestor origin/${sprintplan_branch} origin/${large_branch}")

if result.exit_code != 0:
  error: |
    ❌ Merge gate blocked
    ├── SprintPlan not merged into large audience branch
    ├── Expected: ${sprintplan_branch} is ancestor of ${large_branch}
    └── Action: Complete /sprintplan and merge PR first

# Verify constitution gate (large→base) passed
if initiative.audience_status.large_to_base not in ["passed", "passed_with_warnings"]:
  output: |
    ⏳ Constitution gate still not passed for large → base
    ▶️  Auto-triggering audience promotion now
  invoke_command: "@lens promote"
  exit: 0
```

### 1a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for this context before implementation loop
constitutional_context = invoke("constitution.resolve-context")

if constitutional_context.status == "parse_error":
  error: |
    Constitutional context parse error:
    ${constitutional_context.error_details.file}
    ${constitutional_context.error_details.error}

session.constitutional_context = constitutional_context
```

### 1b. Branch Verification (consolidated into Pre-Flight)

```yaml
# Branch creation and checkout handled in Step 0 Pre-Flight [REQ-9]
# Phase branch ${phase_branch} is already checked out at this point.
assert: current_branch == phase_branch
```

### 1c. Batch Mode (Single-File Questions)

```yaml
if initiative.question_mode == "batch":
  invoke: lens-work.batch-process
  params:
    phase_name: "dev"
    template_path: "templates/phase-4-implementation-questions.template.md"
    output_filename: "dev-implementation-questions.md"
  exit: 0
```

### 2. Load Dev Story

```yaml
# REQ-10: Read dev story from BmadDocs first, fallback to legacy location
if bmad_docs != null and file_exists("${bmad_docs}/dev-story-${id}.md"):   # REQ-10
  dev_story = load("${bmad_docs}/dev-story-${id}.md")
  dev_story_source = "${bmad_docs}/dev-story-${id}.md"
else:
  dev_story = load("_bmad-output/implementation-artifacts/dev-story-${id}.md")
  dev_story_source = "_bmad-output/implementation-artifacts/dev-story-${id}.md"

output: |
  🚀 /dev — Implementation Phase
  
  **Story:** ${dev_story.title}
  **Source:** ${dev_story_source}   # REQ-10
  **Acceptance Criteria:**
  ${dev_story.acceptance_criteria}
  
  **Technical Notes:**
  ${dev_story.technical_notes}
  
  **Branch:** ${initiative.initiative_root}-dev
```

### 2a. Dev Story Constitution Check (Required)

```yaml
# REQ-10: Use BmadDocs path if available, fallback to legacy
dev_story_path = dev_story_source   # REQ-10: set by Step 2 fallback logic

dev_story_compliance = invoke("constitution.compliance-check")
params:
  artifact_path: ${dev_story_path}
  artifact_type: "Story/Epic"
  constitutional_context: ${constitutional_context}

if dev_story_compliance.fail_count > 0:
  error: |
    Dev story failed constitutional compliance gate.
    FAIL count: ${dev_story_compliance.fail_count}
    Resolve story/compliance issues in /review before implementation.
```

### 3. Checkout Target Repo

**IMPORTANT:** This is where we switch from BMAD control repo to TargetProjects.

```yaml
# git-orchestration checks out the feature branch in the actual repo
invoke: git-orchestration.checkout-target
params:
  target_repo: "${initiative.target_repos[0]}"
  target_path: "TargetProjects/${domain}/${service}/${repo}"
  branch: "feature/${story_id}"

output: |
  📂 Target Repo Ready
  ├── Repo: ${target_repo}
  ├── Path: ${target_path}
  ├── Branch: feature/${story_id}
  └── You can now implement in the target repo
```

### 4. Implementation Guidance

```
🔧 Implementation Mode

You're now working in: ${target_path}

**Remember:**
- Implement the story in the target repo
- Commit frequently with meaningful messages
- Return to BMAD directory when ready for code review

**Commands available:**
- `@lens done` — Signal implementation complete, start code review (auto-signaled by agent after implementation; human can also invoke manually)
- `@lens ST` — Check status
- `@lens help` — Show available commands
```

```yaml
# Conditional halt — only if unresolved enforced-mode gate failures exist (safety net)
# Steps 2a/2b should have already caught these, but this guards against edge cases
if article_gates and article_gates.failed_gates > 0 and enforcement_mode == "enforced":
  halt: true
  output: |
    ⛔ BLOCKED — Unresolved enforced gate failures detected at Step 4
    ├── ${article_gates.failed_gates} gate(s) still failing
    ├── Resolve violations and re-run /dev
    └── Implementation cannot proceed until all enforced gates pass
else:
  output: |
    ✅ No blockers — proceeding with implementation
    ├── All pre-implementation gates passed
    ├── Agent will implement story tasks in the target repo
    └── Agent will signal @lens done automatically when complete
```

**Agent Implementation Flow:**
The agent now proceeds to implement the story tasks in the target repo.
After all story tasks are implemented and committed, the agent **automatically
signals `@lens done`** and continues to Step 5 (code review).

### 5. Adversarial Code Review + Constitutional Gates (when signaled)

**⚠️ CRITICAL — Workflow Engine Rules:**
Code review and retrospective use YAML-based workflow.yaml files with the workflow engine.
- Load `_bmad/core/tasks/workflow.yaml` FIRST as the execution engine
- Pass the `workflow.yaml` path to the engine
- Follow engine instructions precisely — execute steps sequentially
- Save outputs after completing EACH engine step (never batch)
- STOP and wait for user at decision points

```yaml
# Agent signals @lens done after implementation completes (or human invokes manually)

# Pre-condition gate: verify story is ready for review
story_check = load(${dev_story_path})
story_status_check = story_check.status || story_check.Status || "unknown"
if story_status_check not in ["review", "in-progress", "implementing"]:
  error: |
    ⛔ Code review blocked — story status is "${story_status_check}", not ready for review.
    Complete implementation and signal @lens done before proceeding.
  halt: true
invoke: git-orchestration.start-workflow
params:
  workflow_name: code-review

# RESOLVED: bmm.code-review → Load workflow engine then execute YAML workflow:
#   1. Load engine: _bmad/core/tasks/workflow.yaml
#   2. Pass config: _bmad/bmm/workflows/4-implementation/code-review/workflow.yaml
# Agent persona: Quinn (QA) — load and adopt _bmad/bmm/agents/qa.md
# BMM code-review is explicitly adversarial and must challenge implementation claims
# Engine executes steps sequentially — save outputs after EACH step
# STOP and wait for user at decision points
agent_persona: "_bmad/bmm/agents/qa.md"
load_engine: "_bmad/core/tasks/workflow.yaml"
execute_workflow: "_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml"
params:
  target_repo: "${target_path}"
  branch: "feature/${story_id}"
  constitutional_context: ${constitutional_context}

# Re-check constitutional compliance on review outputs before allowing progression
code_review_path = "_bmad-output/implementation-artifacts/code-review-${id}.md"
code_review_compliance = invoke("constitution.compliance-check")
params:
  artifact_path: ${code_review_path}
  artifact_type: "Code file"
  constitutional_context: ${constitutional_context}

if code_review_compliance.fail_count > 0:
  error: |
    Code review compliance gate failed.
    FAIL count: ${code_review_compliance.fail_count}
    Resolve violations and re-run @lens done.

# RESOLVED: core.party-mode → Read fully and follow:
#   _bmad/core/workflows/party-mode/workflow.md
# Multi-agent teardown pass to aggressively probe edge cases
# Uses step-file architecture — halt at each step, wait for user input
read_and_follow: "_bmad/core/workflows/party-mode/workflow.md"
params:
  input_file: ${code_review_path}
  artifacts_path: ${target_path}
  output_file: "_bmad-output/implementation-artifacts/party-mode-review-${story_id}.md"
  constitutional_context: ${constitutional_context}

if party_mode.status not in ["pass", "complete"]:
  error: |
    Party mode teardown found unresolved issues.
    Address _bmad-output/implementation-artifacts/party-mode-review-${story_id}.md and re-run @lens done.

# Epic-level teardown is mandatory when this story completes its parent epic
current_epic_id = resolve_story_epic_id(
  "${story_id}",
  "${docs_path}/stories.md",
  ${dev_story_path}
)

if current_epic_id:
  epic_completion = evaluate_epic_completion(
    "${current_epic_id}",
    "${docs_path}/stories.md",
    "_bmad-output/implementation-artifacts/"
  )

  if epic_completion.status == "complete":
    # RESOLVED: bmm.check-implementation-readiness → Read fully and follow:
    #   _bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md
    read_and_follow: "_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md"
    params:
      scope: "epic"
      epic_id: ${current_epic_id}
      stories: "${docs_path}/stories.md"
      implementation_artifacts: "_bmad-output/implementation-artifacts/"
      constitutional_context: ${constitutional_context}

    if epic_adversarial.status in ["blocked", "fail", "failed"]:
      error: |
        Epic adversarial review failed for ${current_epic_id}.
        Resolve implementation-readiness findings and re-run @lens done.

    # RESOLVED: core.party-mode → Read fully and follow:
    #   _bmad/core/workflows/party-mode/workflow.md
    # Epic teardown participants: Winston (Arch), Mary (Analyst), Quinn (QA)
    read_and_follow: "_bmad/core/workflows/party-mode/workflow.md"
    params:
      input_file: "${docs_path}/epics.md"
      focus_epic: ${current_epic_id}
      artifacts_path: ${target_path}
      output_file: "_bmad-output/implementation-artifacts/epic-${current_epic_id}-party-mode-review.md"
      constitutional_context: ${constitutional_context}

    if party_mode.status not in ["pass", "complete"]:
      error: |
        Epic party-mode teardown found unresolved issues for ${current_epic_id}.
        Address _bmad-output/implementation-artifacts/epic-${current_epic_id}-party-mode-review.md and re-run @lens done.

# After code review: switch back to Amelia (Developer) — _bmad/bmm/agents/dev.md
invoke: git-orchestration.finish-workflow
```

### 6. Retrospective (optional)

```yaml
offer: "Run retrospective? [Y]es / [N]o"

if yes:
  invoke: git-orchestration.start-workflow
  params:
    workflow_name: retro

  # RESOLVED: bmm.retrospective → Load workflow engine then execute YAML workflow:
  #   1. Load engine: _bmad/core/tasks/workflow.yaml
  #   2. Pass config: _bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml
  # Agent persona: Switch to Bob (Scrum Master) — load and adopt _bmad/bmm/agents/sm.md
  # Engine executes steps sequentially — save outputs after EACH step
  agent_persona: "_bmad/bmm/agents/sm.md"
  load_engine: "_bmad/core/tasks/workflow.yaml"
  execute_workflow: "_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml"
  params:
    constitutional_context: ${constitutional_context}
  invoke: git-orchestration.finish-workflow
```

### 7. Update State Files & Initiative Config

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "dev"
    phase_status:
      dev: "in_progress"
    gates:
      large_to_base:
        status: "passed"
        verified_at: "${ISO_TIMESTAMP}"
      dev_started:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"
        story_id: "${story_id}"

# Update state.yaml current phase to dev
invoke: state-management.update-state
params:
  updates:
    current_phase: "dev"
    active_branch: "${initiative.initiative_root}-dev"
    workflow_status: "in_progress"
```

### 8. Commit State Changes

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
# git-orchestration commits all state and artifact changes
invoke: git-orchestration.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "_bmad-output/implementation-artifacts/"
  message: "[lens-work] /dev: Dev Implementation — ${initiative.id} — ${story_id}"
  branch: "${initiative.initiative_root}-dev"
```

### 9. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"dev","id":"${initiative.id}","phase":"dev","workflow":"dev","story":"${story_id}","status":"in_progress"}
```

### 10. Complete Initiative (when all done)

```yaml
if all_phases_complete():
  invoke: state-management.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      status: "complete"
      completed_at: "${ISO_TIMESTAMP}"
      phase_status:
        dev: "complete"

  invoke: state-management.archive
  
  # Final commit
  invoke: git-orchestration.commit-and-push
  params:
    paths:
      - "_bmad-output/lens-work/"
    message: "[lens-work] Initiative complete — ${initiative.id}"
  
  output: |
    🎉 Initiative Complete!
    ├── All phases finished
    ├── Code merged to main
    ├── Initiative archived
    └── Great work, team!
```

---

## Control-Plane Rule Reminder

Throughout `/dev`, the user may work in TargetProjects for actual coding, but all lens-work commands continue to execute from the BMAD directory:

| Action | Location |
|--------|----------|
| Write code | TargetProjects/${repo} |
| Run /dev commands | BMAD directory |
| Code review | BMAD directory |
| Status checks | BMAD directory |

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Code Review Report | `_bmad-output/implementation-artifacts/code-review-${id}.md` |
| Party Mode Review Report | `_bmad-output/implementation-artifacts/party-mode-review-${story_id}.md` |
| Epic Party Mode Review Report | `_bmad-output/implementation-artifacts/epic-*-party-mode-review.md` |
| Retro Notes | `_bmad-output/implementation-artifacts/retro-${id}.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |
| Event Log | `_bmad-output/lens-work/event-log.jsonl` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No dev story | Prompt to run /sprintplan first |
| SprintPlan not merged | Error with merge gate blocked message |
| Constitution gate not passed | Auto-triggers audience promotion (large → base) |
| Audience promotion failed | Error — must complete large → base promotion |
| Dirty working directory | Prompt to stash or commit changes first |
| Target repo checkout failed | Check target_repos config, retry |
| Branch creation failed | Check remote connectivity, retry with backoff |
| Dev story compliance gate failed | Resolve constitution FAILs in /review before coding |
| Code review failed | Allow retry or manual review |
| Code review compliance gate failed | Resolve constitutional violations and re-run code review |
| Party mode teardown failed | Address party-mode findings and re-run code review |
| Epic adversarial review failed | Resolve implementation-readiness findings for the epic and re-run code review |
| Epic party mode teardown failed | Address epic party-mode findings and re-run code review |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] On correct branch: `{initiative_root}-dev`
- [ ] Audience promotion validated (large → base passed)
- [ ] state.yaml updated with phase dev
- [ ] initiatives/{id}.yaml updated with dev status and gate entries
- [ ] event-log.jsonl entries appended
- [ ] Dev story loaded and implementation started
- [ ] Dev story compliance gate passed
- [ ] Target repo feature branch checked out
- [ ] Adversarial code review executed
- [ ] Party mode teardown executed and report generated
- [ ] Epic adversarial review executed when epic completion is detected
- [ ] Epic party-mode teardown executed when epic completion is detected
- [ ] All state changes pushed to origin


