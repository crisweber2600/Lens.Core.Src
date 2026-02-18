---
name: pre-plan
description: Launch Analysis phase (brainstorm/research/product brief)
agent: compass
trigger: /pre-plan command
category: router
phase: 1
phase_name: Analysis
---

# /pre-plan — Analysis Phase Router

**Purpose:** Guide users through the Analysis phase, invoking brainstorming, research, and product brief workflows.

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead

```yaml
# Advisory check (logged, not blocking)
if user_role not in ["PO", "Architect", "Tech Lead"]:
  log_warning("Role ${user_role} typically doesn't initiate /pre-plan")
```

---

## User Interaction Keywords

This workflow supports special keywords to control prompting behavior:

- **"defaults" / "best defaults"** → Apply defaults to **CURRENT STEP ONLY**; resume normal prompting for subsequent steps
- **"yolo" / "keep rolling"** → Apply defaults to **ENTIRE REMAINING WORKFLOW**; auto-complete all steps
- **"all questions" / "batch questions"** → Present **ALL QUESTIONS UPFRONT** → wait for batch answers → follow-up questions → adversarial review → final questions → generate artifacts
- **"skip"** → Jump to a named optional step (e.g., "skip to product brief")
- **"pause"** → Halt workflow, save progress, resume later
- **"back"** → Roll back to previous step, re-answer questions

Full documentation: [User Interaction Keywords](../../docs/user-interaction-keywords.md)

**Critical Rule:** 
- "defaults" applies only to the current question/step
- "yolo" applies to all remaining steps in the workflow
- "all questions" presents comprehensive questionnaire, then iteratively refines with follow-ups and party mode review
- Other workflows and phases are unaffected

---

## Prerequisites

- [x] Initiative created via `#new-*` command
- [x] Layer detected with confidence ≥ 75%
- [x] state.yaml exists with active initiative
- [x] Initiative file exists at `_bmad-output/lens-work/initiatives/{id}.yaml`

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Check previous phase status (if applicable)
# 4. Determine correct phase branch: {featureBranchRoot}-{audience}-p{N}
# 5. Create phase branch if it doesn't exist
# 6. Checkout phase branch
# 7. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding to artifact work

# Verify working directory is clean
invoke: casey.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Derive audience for P1 from review_audience_map
audience = initiative.review_audience_map.p1    # "small"
featureBranchRoot = initiative.featureBranchRoot
domain_prefix = initiative.domain_prefix

# Compute branch names for this phase
audience_branch = initiative.branches.audiences[audience]    # {featureBranchRoot}-small
phase_branch = "${featureBranchRoot}-${audience}-p1"          # {featureBranchRoot}-small-p1

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

output_path = docs_path
ensure_directory(output_path)

# === Context Loader (S08: Context Enhancement) ===
# Pre-plan has no prior artifacts to load — this is the first phase
# repo_docs_path provides optional context from target repo
if repo_docs_path != null:
  repo_readme = load_if_exists("${repo_docs_path}/README.md")
  repo_contributing = load_if_exists("${repo_docs_path}/CONTRIBUTING.md")
  repo_context = { readme: repo_readme, contributing: repo_contributing }
else:
  repo_context = null

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: casey.start-phase
  params:
    phase_number: 1
    phase_name: "Analysis"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}
  # Casey creates: ${phase_branch} from ${audience_branch}
  # Casey pushes: git push -u origin ${phase_branch}
  if start_phase.exit_code != 0:
    FAIL("❌ Pre-flight failed: Could not create branch ${phase_branch}")

# Step 6: Checkout phase branch
invoke: casey.checkout-branch
params:
  branch: ${phase_branch}
invoke: casey.pull-latest

# Step 7: Confirm to user
output: |
  📋 Pre-flight complete [REQ-9]
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Phase: P1 Analysis
  ├── Branch: ${phase_branch}
  └── Working directory: clean ✅
```

### 1. Validate State & Constitution

```yaml
# Check active initiative
if state.active_initiative == null:
  error: "No active initiative. Run #new-domain, #new-service, or #new-feature first."

# Constitution enforcement — verify required fields
required_fields: [name, layer, target_repos]
for field in required_fields:
  if initiative.${field} == null or initiative.${field} == "":
    error: "Initiative missing required field: ${field}. Re-run #new-* to fix."

# Phase check
if initiative.current_phase not in [null, "p1"]:
  warning: "Current phase is ${initiative.current_phase}. /pre-plan is for Phase 1."
```

### 1a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for the active initiative context
constitutional_context = invoke("scribe.resolve-context")

# Parse errors are hard failures because governance cannot be evaluated
if constitutional_context.status == "parse_error":
  error: |
    Constitutional context parse error:
    ${constitutional_context.error_details.file}
    ${constitutional_context.error_details.error}

# Make constitutional context available to downstream workflows
session.constitutional_context = constitutional_context
```

### 1b. Discovery Validation

```yaml
# Check that repo-discover has been run for target repos
for repo in initiative.target_repos:
  inventory_path = "_bmad-output/lens-work/repo-inventory.yaml"
  inventory = load(inventory_path)
  
  if repo not in inventory.repos:
    warning: |
      ⚠️ Discovery not run for repo: ${repo}
      Run @scout discover for better analysis context.
      Proceeding without discovery data.
```

### 1b. Constitution Compliance Gate (ADVISORY)

```yaml
# Invoke compliance-check to verify inherited constitution constraints
# Mode: ADVISORY (log warnings, do not block)
invoke: lens-work.compliance-check
params:
  phase: "p1"
  phase_name: "Analysis"
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

### 2a. Batch Mode (Single-File Questions)

```yaml
if initiative.question_mode == "batch":
  invoke: lens-work.batch-process
  params:
    phase_number: "1"
    phase_name: "Analysis"
    template_path: "templates/phase-1-analysis-questions.template.md"
    output_filename: "phase-1-analysis-questions.md"
  exit: 0
```

### 3. Offer Workflow Options

```
🧭 /pre-plan — Analysis Phase

You're starting the Analysis phase. Available workflows:

**[1] Brainstorming** (optional) — Creative exploration with CIS
**[2] Research** (optional) — Deep dive research with CIS  
**[3] Product Brief** (required) — Define problem, vision, and scope

Recommended path: 1 → 2 → 3 (or skip to 3 if you have clarity)

Select workflow(s) to run: [1] [2] [3] [A]ll [S]kip to Product Brief
```

### 4. Execute Selected Workflows

#### If Brainstorming selected:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: brainstorm

invoke: cis.brainstorming  # CIS module workflow
params:
  context: "${initiative.name} at ${initiative.layer} layer"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### If Research selected:
```yaml
invoke: casey.start-workflow
params:
  workflow_name: research

invoke: cis.research  # CIS module workflow
params:
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

#### Product Brief (always):
```yaml
invoke: casey.start-workflow
params:
  workflow_name: product-brief

invoke: bmm.product-brief  # BMM module workflow
params:
  output_path: "_bmad-output/planning-artifacts/"
  constitutional_context: ${constitutional_context}

invoke: casey.finish-workflow
```

### 5. Phase Completion — Push Only

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
if all_workflows_complete("p1"):
  # Push final state to phase branch
  invoke: casey.commit-and-push
  params:
    branch: ${phase_branch}
    message: "[${initiative.id}] P1 Analysis complete"
  # Phase branch remains alive — PR handles merge to audience branch

  # REQ-8: Create PR for phase merge
  invoke: casey.create-pr
  params:
    head: ${phase_branch}
    base: ${audience_branch}
    title: "[P1] Analysis: ${initiative.name}"
    body: "Phase 1 (Analysis) complete for ${initiative.id}.\n\nArtifacts: product-brief.md"
  capture: pr_result  # { url, number } or fallback message

  # REQ-7/REQ-8: Phase enters pr_pending after PR creation
  invoke: tracey.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phases:
        p1:
          status: "pr_pending"
          pr_url: "${pr_result.url}"
          pr_number: ${pr_result.number}
  # If manual fallback (no PAT), still set pr_pending with null PR info
  if pr_result.fallback:
    invoke: tracey.update-initiative
    params:
      initiative_id: ${initiative.id}
      updates:
        phases:
          p1:
            status: "pr_pending"
            pr_url: null
            pr_number: null

  output: |
    ✅ /pre-plan complete
    ├── Phase 1 (Analysis) finished
    ├── Artifacts: product-brief.md
    ├── Branch pushed: ${phase_branch}
    ├── PR: ${pr_result}
    ├── Status: pr_pending (awaiting merge)
    ├── Remaining on: ${phase_branch}
    └── Next: Run /spec to continue to Planning phase
```

### 6. Update State Files

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: tracey.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "p1"
    current_phase_name: "Analysis"
    phases:
      p1:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"

# Update state.yaml
invoke: tracey.update-state
params:
  updates:
    current_phase: "p1"
    current_phase_name: "Analysis"
    workflow_status: "pr_pending"
    active_branch: "${audience_branch}"
```

### 7. Commit State Changes

```yaml
# Casey commits all state and artifact changes
invoke: casey.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens-work] /pre-plan: Phase 1 Analysis — ${initiative.id}"
  branch: "${audience_branch}"
```

### 8. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"pre-plan","id":"${initiative.id}","phase":"p1","workflow":"pre-plan","status":"complete"}
```

### 9. Offer Next Step

```
Ready to continue?

**[C]** Continue to /spec (Planning phase)
**[P]** Pause here (resume later with @compass /spec)
**[S]** Show status (@tracey ST)
```

---

## Output Artifacts

| Artifact | Location |
|----------|----------|
| Product Brief | `${docs_path}/product-brief.md` |
| Brainstorm Notes | `${docs_path}/brainstorm-notes.md` |
| Research Summary | `${docs_path}/research-summary.md` |
| Initiative State | `_bmad-output/lens-work/initiatives/${id}.yaml` |

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No initiative | Prompt to run #new-* first |
| Wrong phase | Warn but allow override |
| CIS not installed | Skip brainstorm/research, proceed to product brief |
| Dirty working directory | Prompt to stash or commit changes first |
| Missing constitution fields | Error with specific field name, prompt #new-* rerun |
| Discovery not run | Warn but allow proceeding (non-blocking) |
| Branch creation failed | Check remote connectivity, retry with backoff |
| State file write failed | Retry (max 3 attempts), then fail with save instructions |

---

## Post-Conditions

- [ ] Working directory clean (all changes committed)
- [ ] Phase branch `{featureBranchRoot}-small-p1` pushed to origin (REQ-7: no auto-merge)
- [ ] Remaining on phase branch: `{featureBranchRoot}-small-p1`
- [ ] state.yaml updated with phase p1
- [ ] initiatives/{id}.yaml updated with p1 status
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (at minimum product-brief.md)
- [ ] All changes pushed to origin
