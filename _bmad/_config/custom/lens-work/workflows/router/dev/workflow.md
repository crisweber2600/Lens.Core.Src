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
# Standard pre-flight: clean state, two-file state load, lifecycle load
# Post-conditions: state, initiative, lifecycle, size, domain_prefix, initiative_root
invoke: shared.preflight
# Fragment: _bmad/lens-work/workflows/shared/preflight.fragment.md
# GATE: All steps must pass before proceeding to artifact work

# Derive audience for dev phase (base) [REQ-9]
audience = "base"
audience_branch = "base"

# Resolve docs_path and repo_docs_path (read-only in /dev — outputs go to implementation-artifacts/)
invoke: shared.resolve-docs-path
params:
  readonly: true
# Fragment: _bmad/lens-work/workflows/shared/resolve-docs-path.fragment.md
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
    # Check if the audience branch still exists remotely (may be deleted after PR merge)
    branch_exists_result = git-orchestration.exec("git ls-remote --heads origin ${prev_audience_branch}")
    prev_audience_branch_exists = (branch_exists_result.stdout != "")

    if prev_audience_branch_exists:
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
    else:
      # Audience branch was deleted (e.g., GitHub auto-delete after PR merge)
      # Check if large→base promotion is already complete — if so, sprintplan is implicitly done
      if initiative.audience_status.large_to_base in ["complete", "passed", "passed_with_warnings"]:
        invoke: state-management.update-initiative
        params:
          initiative_id: ${initiative.id}
          updates:
            phase_status:
              sprintplan: "complete"
        output: "✅ Previous phase (sprintplan) complete — audience branch merged and deleted (large→base promotion passed)"
      else:
        pr_url = initiative.phase_status.sprintplan_pr_url || "(no PR URL recorded)"
        output: |
          ⚠️  Audience branch ${prev_audience_branch} not found remotely
          ├── May have been deleted after PR merge
          ├── PR: ${pr_url}
          └── Proceeding — verify manually if needed

# Require dev story for interactive mode
if initiative.question_mode != "batch" and not dev_story_exists():
  error: "/sprintplan has not produced a dev-ready story. Run /sprintplan first."

# Audience validation — verify large→base promotion passed
if initiative.audience_status.large_to_base not in ["complete", "passed", "passed_with_warnings"]:
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

# Check if audience branches still exist remotely (may be deleted after PR merge)
sprintplan_branch_exists = git-orchestration.exec("git ls-remote --heads origin ${sprintplan_branch}").stdout != ""
large_branch_exists = git-orchestration.exec("git ls-remote --heads origin ${large_branch}").stdout != ""

if sprintplan_branch_exists and large_branch_exists:
  # Ancestry check: sprintplan must be merged into large audience branch
  result = git-orchestration.exec("git merge-base --is-ancestor origin/${sprintplan_branch} origin/${large_branch}")

  if result.exit_code != 0:
    error: |
      ❌ Merge gate blocked
      ├── SprintPlan not merged into large audience branch
      ├── Expected: ${sprintplan_branch} is ancestor of ${large_branch}
      └── Action: Complete /sprintplan and merge PR first
else:
  # Audience branch(es) deleted post-PR-merge — check status instead
  if initiative.audience_status.large_to_base in ["complete", "passed", "passed_with_warnings"]:
    output: "✅ Audience branch(es) deleted post-merge — large→base promotion already complete"
  else:
    output: |
      ⚠️  Audience branch(es) not found remotely
      ├── sprintplan: ${sprintplan_branch} (${sprintplan_branch_exists ? 'found' : 'gone'})
      ├── large: ${large_branch} (${large_branch_exists ? 'found' : 'gone'})
      └── Proceeding — verify manually if needed

# Verify constitution gate (large→base) passed
if initiative.audience_status.large_to_base not in ["complete", "passed", "passed_with_warnings"]:
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
# REQ-10: Read dev story from BmadDocs first, fallback to legacy locations
# Supports multiple naming conventions:
#   1. dev-story-${id}.md (canonical from sprintplan router)
#   2. ${sprint}-${story_number}-${story_slug}.md (implementation-time naming)
#   3. Glob fallback: any .md file in BmadDocs or implementation-artifacts matching story id
if bmad_docs != null and file_exists("${bmad_docs}/dev-story-${id}.md"):   # REQ-10
  dev_story = load("${bmad_docs}/dev-story-${id}.md")
  dev_story_source = "${bmad_docs}/dev-story-${id}.md"
else if file_exists("_bmad-output/implementation-artifacts/dev-story-${id}.md"):
  dev_story = load("_bmad-output/implementation-artifacts/dev-story-${id}.md")
  dev_story_source = "_bmad-output/implementation-artifacts/dev-story-${id}.md"
else:
  # Glob fallback: search for story files by id pattern in both locations
  # Matches: {sprint}-{story_number}-{story_slug}.md or any file containing the story id
  candidates = []
  if bmad_docs != null:
    candidates += glob("${bmad_docs}/*${id}*.md") + glob("${bmad_docs}/${id}-*.md")
  candidates += glob("_bmad-output/implementation-artifacts/*${id}*.md") + glob("_bmad-output/implementation-artifacts/${id}-*.md")
  
  if candidates.length > 0:
    dev_story = load(candidates[0])
    dev_story_source = candidates[0]
  else:
    error: "No dev story found for story ${id}. Run /sprintplan to create dev stories."
    exit: 1

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

# Use article-specific gate results for richer error reporting (skill Part 7b)
if dev_story_compliance.article_gate_results.failed_gates > 0:
  # Display per-article gate results table
  display: dev_story_compliance.article_gate_results  # Uses Part 7b display format

  if enforcement_mode == "enforced":
    # Auto-resolve: create fix branch, resolve violations, open PR (Part 16)
    invoke: constitution.auto-resolve-gate-block
    params:
      failed_gates: ${dev_story_compliance.article_gate_results}
      artifact_path: ${dev_story_path}
      artifact_type: "Story/Epic"
      initiative_id: ${initiative.id}
      source_branch: current_branch()
      gate_stage: "dev-story-compliance"
    # Workflow halts here — developer merges PR and re-runs /dev
    halt: true
  else:
    # Advisory mode — log warnings, invoke complexity tracking
    warning: |
      ⚠️ Dev story has ${dev_story_compliance.article_gate_results.failed_gates} article gate warning(s).
    invoke: constitution.record-complexity-tracking
    params:
      article_gate_results: ${dev_story_compliance.article_gate_results}
      initiative_id: ${initiative.id}
      phase: "dev"

# Backward-compatible aggregate check
if dev_story_compliance.fail_count > 0 and enforcement_mode == "enforced":
  invoke: constitution.auto-resolve-gate-block
  params:
    fail_count: ${dev_story_compliance.fail_count}
    artifact_path: ${dev_story_path}
    artifact_type: "Story/Epic"
    initiative_id: ${initiative.id}
    source_branch: current_branch()
    gate_stage: "dev-story-compliance-legacy"
  halt: true
```

### 2b. Pre-Implementation Gates (Required)

Article-specific gate checkpoint before implementation begins. Mirrors spec-kit's
"Phase -1: Pre-Implementation Gates" pattern. Each constitutional article becomes
a named gate with discrete pass/fail checks.

```yaml
# Generate article-specific gates from resolved constitutional context (skill Part 7b)
article_gates = invoke("constitution.generate-article-gates")
params:
  constitutional_context: ${constitutional_context}
  artifact_path: ${dev_story_path}
  artifact_type: "Story/Epic"

# Display pre-implementation gate results
output: |
  ═══ Pre-Implementation Gates ═══
  ${for gate in article_gates.gates}
  Gate ${gate.article_id}: ${gate.title} (${gate.source_layer})  ${gate.status == "pass" ? "✓ PASS" : "✗ FAIL"}
    ${for item in gate.check_items}
    ${item.status == "pass" ? "✓" : "✗"} ${item.description}
      ${if item.status == "fail"}→ ${item.violation}${endif}
    ${endfor}
  ${endfor}
  ── Summary ──
    Passed: ${article_gates.passed_gates}/${article_gates.total_gates} gates
    Mode: ${enforcement_mode}

# Gate decision based on enforcement mode
if article_gates.failed_gates > 0:
  if enforcement_mode == "enforced":
    # Auto-resolve: create fix branch, resolve violations, open PR (Part 16)
    invoke: constitution.auto-resolve-gate-block
    params:
      failed_gates: ${article_gates}
      artifact_path: ${dev_story_path}
      artifact_type: "Story/Epic"
      initiative_id: ${initiative.id}
      source_branch: current_branch()
      gate_stage: "pre-implementation-gates"
    # Workflow halts here — developer merges PR and re-runs /dev
    halt: true
  else:
    # Advisory mode — record overrides in complexity tracking
    output: |
      ⚠️ ${article_gates.failed_gates} gate(s) have warnings (advisory mode).
    for gate in article_gates.gates where gate.status == "fail":
      ask: |
        Override gate ${gate.article_id}: ${gate.title}?
        Provide justification and simpler alternative considered:
      invoke: constitution.record-complexity-tracking
      params:
        gate: ${gate}
        initiative_id: ${initiative.id}
        phase: "dev"
        justification: ${user_justification}

# Run checklist quality gate (skill Part 12)
checklist_gate = invoke("constitution.checklist-quality-gate")
params:
  bmad_docs: ${bmad_docs}
  docs_path: ${docs_path}
  initiative_id: ${initiative.id}

# Checklist gate renders its own status table and handles user interaction
# per constitution skill Part 12c-12d
```

### 3. Checkout Target Repo — Epic & Story Branch Management

**IMPORTANT:** This is where we switch from BMAD control repo to TargetProjects.
Branch management follows `lifecycle.yaml → target_projects` and `git-orchestration → Target Project Branch Management`.

```yaml
# Resolve epic and story keys from the dev story
# Story key format: "1-2-user-authentication" → epic number is first segment
epic_num = story_key.split("-")[0]
epic_key = "epic-${epic_num}"
epic_branch = "feature/${epic_key}"
story_branch = "feature/${epic_key}-${story_key}"

target_repo = "${initiative.target_repos[0]}"
target_path = "TargetProjects/${domain}/${service}/${repo}"

# --- Epic Branch: Ensure parent epic branch exists ---
invoke: git-orchestration.ensure-epic-branch
params:
  target_repo_path: "${target_path}"
  epic_key: "${epic_key}"
  epic_branch: "${epic_branch}"
  integration_branch: "develop"  # fallback to "main" if develop doesn't exist

# --- Story Branch: Create or checkout story branch from epic ---
invoke: git-orchestration.ensure-story-branch
params:
  target_repo_path: "${target_path}"
  epic_key: "${epic_key}"
  epic_branch: "${epic_branch}" 
  story_key: "${story_key}"
  story_branch: "${story_branch}"

# Store branch references for use in Steps 5-9
session.epic_key = "${epic_key}"
session.epic_branch = "${epic_branch}"
session.story_branch = "${story_branch}"
session.target_path = "${target_path}"

output: |
  📂 Target Repo Ready
  ├── Repo: ${target_repo}
  ├── Path: ${target_path}
  ├── Epic Branch: ${epic_branch}
  ├── Story Branch: ${story_branch} (checked out)
  ├── Branch Chain: ${story_branch} → ${epic_branch} → develop
  └── Auto-commit: ON (tasks auto-committed after completion)
  └── Auto-PR: ON (PR created when all tasks complete)
```

### 4. Implementation Guidance + Constitutional Context

Surface relevant constitutional articles as active implementation guidance.
Developers see which rules govern their work BEFORE writing code.

```yaml
# Extract relevant articles from resolved constitutional context
articles = constitutional_context.resolved.articles  # from Part 7b extraction

# Categorize articles by implementation relevance
tdd_articles = filter(articles, rule_text contains "test" or "TDD" or "test-first")
arch_articles = filter(articles, rule_text contains "simplicity" or "abstraction" or "library")
quality_articles = filter(articles, rule_text contains "observability" or "logging" or "coverage")
integration_articles = filter(articles, rule_text contains "integration" or "contract" or "mock")

# Load complexity tracking for context on any overrides
complexity_tracking = load_if_exists("${bmad_docs}/complexity-tracking.md")
override_count = count_entries(complexity_tracking) if complexity_tracking else 0
```

```
🔧 Implementation Mode

You're now working in: ${target_path}

═══ Constitutional Guidance ═══

${if tdd_articles}
🧪 Test-First Requirements:
${for article in tdd_articles}
  Article ${article.article_id}: ${article.title}
  → ${article.rule_text_summary}
${endfor}
  ⚡ Action: Write tests FIRST. Verify they FAIL. Then implement.
${endif}

${if arch_articles}
🏗️ Architecture Constraints:
${for article in arch_articles}
  Article ${article.article_id}: ${article.title}
  → ${article.rule_text_summary}
${endfor}
${endif}

${if quality_articles}
📊 Quality Requirements:
${for article in quality_articles}
  Article ${article.article_id}: ${article.title}
  → ${article.rule_text_summary}
${endfor}
${endif}

${if integration_articles}
🔗 Integration Rules:
${for article in integration_articles}
  Article ${article.article_id}: ${article.title}
  → ${article.rule_text_summary}
${endfor}
${endif}

${if override_count > 0}
⚠️ Active Overrides: ${override_count} complexity tracking entries
   Review: ${bmad_docs}/complexity-tracking.md
${endif}

═══════════════════════════════

**Remember:**
- Follow constitutional articles above during implementation
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

```yaml
# Agent signals @lens done after implementation completes (or human invokes manually)

# Pre-condition gate: verify story is ready for review
story_check = load("${dev_story_path}")
story_status_check = story_check.status || story_check.Status || "unknown"
if story_status_check not in ["review", "in-progress"]:
  error: |
    ⛔ Code review blocked — story status is "${story_status_check}", not ready for review.
    Complete implementation and signal @lens done before proceeding.
  halt: true
invoke: git-orchestration.start-workflow
params:
  workflow_name: code-review

# BMM code-review is explicitly adversarial and must challenge implementation claims
invoke: bmm.code-review
params:
  target_repo: "${target_path}"
  branch: "${session.story_branch}"
  constitutional_context: ${constitutional_context}
  auto_fix_rerun: true
  auto_fix_severities: "CRITICAL,HIGH,MEDIUM"
  max_review_passes: 2
  on_max_passes: "needs_manual"

# Re-check constitutional compliance on review outputs before allowing progression
# Phase-transition re-validation: re-resolve context (articles may have been amended mid-sprint)
refreshed_context = invoke("constitution.resolve-context")
if refreshed_context.status != "parse_error":
  session.constitutional_context = refreshed_context  # Update session with latest

code_review_path = "_bmad-output/implementation-artifacts/code-review-${id}.md"
code_review_compliance = invoke("constitution.compliance-check")
params:
  artifact_path: ${code_review_path}
  artifact_type: "Code file"
  constitutional_context: ${session.constitutional_context}

# Use article-specific gates for code review validation (Part 7b)
if code_review_compliance.article_gate_results:
  review_gates = code_review_compliance.article_gate_results
  if review_gates.failed_gates > 0:
    output: |
      ═══ Post-Review Constitutional Re-Validation ═══
      ${for gate in review_gates.gates where gate.status == "fail"}
      ✗ Article ${gate.article_id}: ${gate.title} (${gate.source_layer})
        ${for item in gate.failed_items}
        → ${item.violation}
        ${endfor}
      ${endfor}
    if enforcement_mode == "enforced":
      # Auto-resolve: create fix branch, resolve violations, open PR (Part 16)
      invoke: constitution.auto-resolve-gate-block
      params:
        failed_gates: ${review_gates}
        artifact_path: ${code_review_path}
        artifact_type: "Code file"
        initiative_id: ${initiative.id}
        source_branch: current_branch()
        gate_stage: "post-review-revalidation"
      # Workflow halts — developer merges PR and re-runs @lens done
      halt: true
    else:
      warning: |
        ⚠️ ${review_gates.failed_gates} article gate warning(s) on code review.

# Load complexity tracking entries — pass to party mode for adversarial challenge
complexity_tracking = load_if_exists("${bmad_docs}/complexity-tracking.md")

if code_review_compliance.fail_count > 0 and enforcement_mode == "enforced":
  invoke: constitution.auto-resolve-gate-block
  params:
    fail_count: ${code_review_compliance.fail_count}
    artifact_path: ${code_review_path}
    artifact_type: "Code file"
    initiative_id: ${initiative.id}
    source_branch: current_branch()
    gate_stage: "post-review-compliance-legacy"
  halt: true

# Multi-agent teardown pass to aggressively probe edge cases
invoke: core.party-mode
params:
  input_file: ${code_review_path}
  artifacts_path: ${target_path}
  output_file: "_bmad-output/implementation-artifacts/party-mode-review-${story_id}.md"
  constitutional_context: ${session.constitutional_context}
  complexity_tracking: ${complexity_tracking}  # Party mode agents challenge override justifications

if party_mode.status not in ["pass", "complete"]:
  error: |
    Party mode teardown found unresolved issues.
    Address _bmad-output/implementation-artifacts/party-mode-review-${story_id}.md and re-run @lens done.
  halt: true
```

### 5a. Epic Completion Gate (Mandatory)

**⚠️ MANDATORY — Epic Completion Gate: Do NOT skip this section. Test specs 4.1.5.11-13 require this gate.**
**This step MUST execute when the current story completes its parent epic.**
**Both the adversarial review and party-mode teardown are hard gates — failure halts the workflow.**

```yaml
# Epic-level teardown is mandatory when this story completes its parent epic
current_epic_id = resolve_story_epic_id(
  "${story_id}",
  "_bmad-output/planning-artifacts/stories.md",
  ${dev_story_path}
)

if current_epic_id:
  epic_completion = evaluate_epic_completion(
    "${current_epic_id}",
    "_bmad-output/planning-artifacts/stories.md",
    "_bmad-output/implementation-artifacts/"
  )

  if epic_completion.status == "complete":
    epic_adversarial = invoke("bmm.check-implementation-readiness")
    params:
      scope: "epic"
      epic_id: ${current_epic_id}
      stories: "_bmad-output/planning-artifacts/stories.md"
      implementation_artifacts: "_bmad-output/implementation-artifacts/"
      constitutional_context: ${constitutional_context}

    if epic_adversarial.status in ["blocked", "fail", "failed"]:
      error: |
        ⛔ MANDATORY GATE — Epic adversarial review failed for ${current_epic_id}.
        Resolve implementation-readiness findings and re-run @lens done.
      halt: true

    invoke: core.party-mode
    params:
      input_file: "_bmad-output/planning-artifacts/epics.md"
      focus_epic: ${current_epic_id}
      artifacts_path: ${target_path}
      output_file: "_bmad-output/implementation-artifacts/epic-${current_epic_id}-party-mode-review.md"
      constitutional_context: ${constitutional_context}

    if party_mode.status not in ["pass", "complete"]:
      error: |
        ⛔ MANDATORY GATE — Epic party-mode teardown found unresolved issues for ${current_epic_id}.
        Address _bmad-output/implementation-artifacts/epic-${current_epic_id}-party-mode-review.md and re-run @lens done.
      halt: true

# ⚠️ MANDATORY — Review Fix Gate: Story must be status "done" before PR creation.
# Hard gate: review/fix loop must complete before PR creation
reviewed_story = load(${dev_story_path})
reviewed_story_status = reviewed_story.status || reviewed_story.Status || reviewed_story.story_status || "unknown"

if reviewed_story_status != "done":
  output: |
    ⛔ PR blocked for ${story_id}
    ├── Post-review story status: ${reviewed_story_status}
    ├── Meaning: review follow-ups or unresolved fixes remain
    └── Action: resolve review items and re-run @lens done

  # End review workflow without opening PR
  invoke: git-orchestration.finish-workflow
  halt: true

# Auto-create story PR in target repo only after all review gates pass
invoke: git-orchestration.create-pr
params:
  repo_path: ${target_path}
  head: ${session.story_branch}
  base: ${session.epic_branch}
  title: "feat(${session.epic_key}): ${story_id}"
  body: |
    Story ${story_id} completed and passed automated review flow.

    Source branch: ${session.story_branch}
    Target branch: ${session.epic_branch}

    This PR was auto-created by /dev after adversarial code review and constitutional gates.
capture: story_pr_result

if story_pr_result.fallback:
  warning: |
    ⚠️ Auto-PR fallback triggered for story ${story_id}.
    Run this in target repo (${target_path}):
    gh pr create --base "${session.epic_branch}" --head "${session.story_branch}" --title "feat(${session.epic_key}): ${story_id}"
else:
  output: |
    ✅ Story PR auto-created
    ├── Branch: ${session.story_branch} → ${session.epic_branch}
    └── URL: ${story_pr_result.url}

invoke: git-orchestration.finish-workflow
```

### 6. Retrospective (optional)

```yaml
offer: "Run retrospective? [Y]es / [N]o"

if yes:
  invoke: git-orchestration.start-workflow
  params:
    workflow_name: retro
    
  invoke: bmm.retrospective
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
| Complexity Tracking | `{bmad_docs}/complexity-tracking.md` |
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
| Dev story compliance gate failed | Auto-resolve: fix branch + PR created; merge and rerun /dev |
| Article-specific gate blocked | Auto-resolve: fix branch + PR created; merge and rerun /dev |
| Pre-implementation gate blocked | Auto-resolve: fix branch + PR created; merge and rerun /dev |
| Checklist quality gate failed | Complete checklist items or override with justification |
| Code review failed | Allow retry or manual review |
| Code review compliance gate failed | Auto-resolve: fix branch + PR created; merge and rerun @lens done |
| Post-review re-validation failed | Auto-resolve: fix branch + PR created; merge and rerun @lens done |
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
- [ ] Dev story compliance gate passed (article-specific)
- [ ] Pre-implementation gates evaluated (article-specific, per Part 7b)
- [ ] Checklist quality gate evaluated (per Part 12)
- [ ] Complexity tracking entries recorded for any overrides (per Part 13)
- [ ] Constitutional guidance surfaced to developer
- [ ] Target repo feature branch checked out
- [ ] Adversarial code review executed
- [ ] Post-review constitutional re-validation passed (refreshed context)
- [ ] Party mode teardown executed with complexity tracking context
- [ ] Epic adversarial review executed when epic completion is detected
- [ ] Epic party-mode teardown executed when epic completion is detected
- [ ] All state changes pushed to origin


