---
name: preplan
description: Launch PrePlan phase (brainstorm/research/product brief)
agent: "@lens"
trigger: /preplan command
aliases: [/pre-plan]
category: router
phase_name: preplan
display_name: PrePlan
agent_owner: mary
agent_role: Analyst
imports: lifecycle.yaml
---

# /preplan — PrePlan Phase Router

**Purpose:** Guide users through the PrePlan phase, invoking brainstorming, research, and product brief workflows.

**Lifecycle:** `preplan` phase, audience `small`, owned by Mary (Analyst).

---

## Role Authorization

**Authorized:** PO, Architect, Tech Lead (phase owner: Mary/Analyst)

```yaml
# Advisory check (logged, not blocking)
if user_role not in ["PO", "Architect", "Tech Lead"]:
  log_warning("Role ${user_role} typically doesn't initiate /preplan")
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
# 3. Check previous phase status (if applicable — preplan is first phase, no predecessor)
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

# Load lifecycle contract for phase → audience mapping
lifecycle = load("lifecycle.yaml")

# Derive audience from lifecycle contract (preplan → small)
current_phase = "preplan"
audience = lifecycle.phases[current_phase].audience    # "small"
initiative_root = initiative.initiative_root
domain_prefix = initiative.domain_prefix

# Compute branch names for this phase
audience_branch = "${initiative_root}-${audience}"              # {initiative_root}-small
phase_branch = "${initiative_root}-${audience}-${current_phase}" # {initiative_root}-small-preplan

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
# PrePlan has no prior artifacts to load — this is the first phase
# repo_docs_path provides optional context from target repo
if repo_docs_path != null:
  repo_readme = load_if_exists("${repo_docs_path}/README.md")
  repo_contributing = load_if_exists("${repo_docs_path}/CONTRIBUTING.md")
  repo_context = { readme: repo_readme, contributing: repo_contributing }
else:
  repo_context = null

# Step 5: Create phase branch if it doesn't exist [REQ-9]
if not branch_exists(phase_branch):
  invoke: git-orchestration.start-phase
  params:
    phase_name: "preplan"
    display_name: "PrePlan"
    initiative_id: ${initiative.id}
    audience: ${audience}
    initiative_root: ${initiative_root}
    parent_branch: ${audience_branch}
  # git-orchestration creates: ${phase_branch} from ${audience_branch}
  # git-orchestration pushes: git push -u origin ${phase_branch}
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
  ├── Phase: PrePlan (preplan)
  ├── Audience: small
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
if initiative.current_phase not in [null, "preplan"]:
  warning: "Current phase is ${initiative.current_phase}. /preplan is for the PrePlan phase."
```

### 1a. Constitutional Context Injection (Required)

```yaml
# Resolve constitutional governance for the active initiative context
constitutional_context = invoke("constitution.resolve-context")

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
      Run @lens discover for better analysis context.
      Proceeding without discovery data.
```

### 1b. Constitution Compliance Gate (ADVISORY)

```yaml
# Invoke compliance-check to verify inherited constitution constraints
# Mode: ADVISORY (log warnings, do not block)
invoke: lens-work.compliance-check
params:
  phase: "preplan"
  phase_name: "PrePlan"
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
    phase_name: "preplan"
    display_name: "PrePlan"
    template_path: "templates/preplan-questions.template.md"
    output_filename: "preplan-questions.md"
  exit: 0
```

### 3. Offer Workflow Options

```
🧭 /preplan — PrePlan Phase

You're starting the Analysis phase. Available workflows:

**[1] Brainstorming** (optional) — Creative exploration with CIS
**[2] Research** (optional) — Deep dive research with CIS  
**[3] Product Brief** (required) — Define problem, vision, and scope

Recommended path: 1 → 2 → 3 (or skip to 3 if you have clarity)

Select workflow(s) to run: [1] [2] [3] [A]ll [S]kip to Product Brief
```

### 4. Execute Selected Workflows

**⚠️ CRITICAL — Interactive Workflow Rules:**
Each sub-workflow uses sequential step-file architecture.
- 🛑 **NEVER** auto-complete or batch-generate content without user input
- ⏸️ **ALWAYS** STOP and wait for user input/confirmation at each step
- 🚫 **NEVER** load the next step file until user explicitly confirms (Continue / C)
- 📋 Back-and-forth dialogue is REQUIRED — you are a facilitator, not a generator
- 💾 Save/update frontmatter after completing each step before loading the next
- 🎯 Read the ENTIRE step file before taking any action within it

**Agent:** Adopt Mary (Analyst) persona — load `_bmad/bmm/agents/analyst.md`

#### If Brainstorming selected:
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: brainstorm

# RESOLVED: cis.brainstorming → Read fully and follow this workflow file:
#   _bmad/core/workflows/brainstorming/workflow.md
# Uses step-file architecture with steps/ folder — load step-01-session-setup.md first
# STOP and wait for user at each step — do NOT auto-generate brainstorm content
read_and_follow: "_bmad/core/workflows/brainstorming/workflow.md"
params:
  context: "${initiative.name} at ${initiative.layer} layer"
  constitutional_context: ${constitutional_context}

invoke: git-orchestration.finish-workflow
```

#### If Research selected:
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: research

# RESOLVED: cis.research → Ask user for research type, then follow the correct workflow:
#   Market:    _bmad/bmm/workflows/1-analysis/research/workflow-market-research.md
#   Domain:    _bmad/bmm/workflows/1-analysis/research/workflow-domain-research.md
#   Technical: _bmad/bmm/workflows/1-analysis/research/workflow-technical-research.md
# Each uses step-file architecture — load steps one at a time, wait for user at each step
prompt_user: "Which type of research? [M]arket / [D]omain / [T]echnical"
if research_type == "market":
  read_and_follow: "_bmad/bmm/workflows/1-analysis/research/workflow-market-research.md"
elif research_type == "domain":
  read_and_follow: "_bmad/bmm/workflows/1-analysis/research/workflow-domain-research.md"
elif research_type == "technical":
  read_and_follow: "_bmad/bmm/workflows/1-analysis/research/workflow-technical-research.md"
params:
  constitutional_context: ${constitutional_context}

invoke: git-orchestration.finish-workflow
```

#### Product Brief (always):
```yaml
invoke: git-orchestration.start-workflow
params:
  workflow_name: product-brief

# RESOLVED: bmm.product-brief → Read fully and follow this workflow file:
#   _bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md
# Uses JIT step-file architecture:
#   1. Load step-01-init.md first
#   2. Only load next step when directed by the current step
#   3. NEVER load multiple step files simultaneously
#   4. ALWAYS halt at menus and wait for user input
#   5. Output goes to: ${docs_path}/product-brief.md
# Agent persona: Mary (Analyst) — _bmad/bmm/agents/analyst.md
read_and_follow: "_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md"
params:
  output_path: "${docs_path}/"
  constitutional_context: ${constitutional_context}
  context:
    brainstorm_notes: "${docs_path}/brainstorm-notes.md"   # if exists from step [1]
    research_summary: "${docs_path}/research-summary.md"   # if exists from step [2]
    repo_readme: "${repo_context.readme}"
    repo_contributing: "${repo_context.contributing}"

invoke: git-orchestration.finish-workflow
```

### 5. Phase Completion — Push Only

```yaml
# REQ-7: Never auto-merge. PR created in S1.2.
if all_workflows_complete("preplan"):
  # Push final state to phase branch
  invoke: git-orchestration.commit-and-push
  params:
    branch: ${phase_branch}
    message: "[${initiative.id}] PrePlan complete"
  # Phase branch remains alive — PR handles merge to audience branch

  # REQ-8: Create PR for phase merge
  invoke: git-orchestration.create-pr
  params:
    head: ${phase_branch}
    base: ${audience_branch}
    title: "[preplan] PrePlan: ${initiative.name}"
    body: "PrePlan phase complete for ${initiative.id}.\n\nArtifacts: product-brief.md"
  capture: pr_result  # { url, number } or fallback message

  # REQ-7/REQ-8: Phase enters pr_pending after PR creation
  invoke: state-management.update-initiative
  params:
    initiative_id: ${initiative.id}
    updates:
      phase_status:
        preplan:
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
          preplan:
            status: "pr_pending"
            pr_url: null
            pr_number: null

  output: |
    ✅ /preplan complete
    ├── Phase: PrePlan (preplan) finished
    ├── Audience: small
    ├── Artifacts: product-brief.md
    ├── Branch pushed: ${phase_branch}
    ├── PR: ${pr_result}
    ├── Status: pr_pending (awaiting merge)
    ├── Remaining on: ${phase_branch}
    └── Next: Run /businessplan to continue to BusinessPlan phase
```

### 6. Update State Files

```yaml
# Update initiative file: _bmad-output/lens-work/initiatives/${initiative.id}.yaml
invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: "preplan"
    phase_status:
      preplan:
        status: "in_progress"
        started_at: "${ISO_TIMESTAMP}"

# Update state.yaml
invoke: state-management.update-state
params:
  updates:
    current_phase: "preplan"
    workflow_status: "pr_pending"
    active_branch: "${phase_branch}"
```

### 7. Commit State Changes

```yaml
# git-orchestration commits all state and artifact changes
invoke: git-orchestration.commit-and-push
params:
  paths:
    - "_bmad-output/lens-work/state.yaml"
    - "_bmad-output/lens-work/initiatives/${initiative.id}.yaml"
    - "_bmad-output/lens-work/event-log.jsonl"
    - "${docs_path}/"
  message: "[lens-work] /preplan: PrePlan — ${initiative.id}"
  branch: "${phase_branch}"
```

### 8. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"preplan","id":"${initiative.id}","phase":"preplan","audience":"small","workflow":"preplan","status":"complete"}
```

### 9. Offer Next Step

```
Ready to continue?

**[C]** Continue to /businessplan (BusinessPlan phase)
**[P]** Pause here (resume later with @lens /businessplan)
**[S]** Show status (@lens ST)
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
- [ ] Phase branch `{initiative_root}-small-preplan` pushed to origin (REQ-7: no auto-merge)
- [ ] Remaining on phase branch: `{initiative_root}-small-preplan`
- [ ] state.yaml updated with phase preplan
- [ ] initiatives/{id}.yaml phase_status.preplan updated
- [ ] event-log.jsonl entry appended
- [ ] Planning artifacts written to `${docs_path}/` (at minimum product-brief.md)
- [ ] All changes pushed to origin
