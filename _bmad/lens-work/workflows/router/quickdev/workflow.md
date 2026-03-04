---
name: quickdev
description: "Rapid execution — delegates to target-project agents for implementation with parity verification"
agent: "@lens"
trigger: /quickdev command
category: router
phase_name: quickdev
display_name: QuickDev
agent_owner: amelia
agent_role: Developer
imports: lifecycle.yaml
---

# /quickdev — QuickDev Phase Router

**Purpose:** Rapidly delegate implementation and parity verification tasks to target-project agents (visual-parityV2, prod-local-parity-v2) without the full planning ceremony, then capture auditable parity evidence back into the BMAD planning repo.

**Lifecycle:** `quickdev` track, audience `small`, owned by Amelia (Developer).

---

## Role Authorization

**Authorized:** Developer, Tech Lead

---

## Prerequisites

- [x] Active initiative exists (state.yaml + initiatives/{id}.yaml)
- [x] Target project has parity agents in `.github/agents/` (visual-parityV2, prod-local-parity-v2)
- [x] Environment variables set: `NORTHSTARUSERNAME`, `NORTHSTARPASSWORD`
- [x] Aspire AppHost available for backend services

---

## Execution Sequence

### 0. Pre-Flight [REQ-9]

```yaml
# PRE-FLIGHT (mandatory, never skip) [REQ-9]
# 1. Verify working directory is clean
# 2. Load two-file state (state.yaml + initiative config)
# 3. Determine correct phase branch: {initiative_root}-{audience}-quickdev
# 4. Create phase branch if it doesn't exist
# 5. Checkout phase branch
# 6. Confirm to user: "Now on branch: {branch_name}"
# GATE: All steps must pass before proceeding

invoke: git-orchestration.verify-clean-state

# Load two-file state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Load lifecycle contract
lifecycle = load("lifecycle.yaml")

# Read initiative config
domain_prefix = initiative.domain_prefix

# QuickDev uses small audience (no promotion gates required)
current_phase = "quickdev"
audience = "small"
initiative_root = initiative.initiative_root
audience_branch = "${initiative_root}-${audience}"

# === Path Resolver ===
docs_path = initiative.docs.path
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null

output_path = docs_path
parity_reports_path = "${docs_path}/parity-reports"
ensure_directory(parity_reports_path)

# Derive phase branch
phase_branch = "${initiative_root}-${audience}-quickdev"

# Create phase branch from audience branch if missing
if not branch_exists(phase_branch):
  if branch_exists(audience_branch):
    git checkout ${audience_branch}
    git checkout -b ${phase_branch}
    git push -u origin ${phase_branch}
  else:
    FAIL("Audience branch ${audience_branch} does not exist. Run /init-initiative first.")
else:
  git checkout ${phase_branch}
  git pull origin ${phase_branch}

output: |
  ✅ QuickDev Pre-Flight Complete
  ├── Initiative: ${initiative.name} (${initiative.id})
  ├── Branch: ${phase_branch}
  ├── Parity Reports: ${parity_reports_path}/
  └── Ready to delegate to target-project agents
```

---

### 1. Target Selection

```yaml
# Ask user what they want to run parity verification on
output: |
  🎯 QuickDev — Select Target

  What page or component needs parity verification?

  Options:
  ├── [1] Single page parity (visual-parityV2 agent)
  ├── [2] Full page parity with test generation (prod-local-parity-v2 agent)
  ├── [3] Sprint task batch (sprint-task-picker → parity agents)
  ├── [4] Custom agent delegation
  └── [0] Cancel

read: target_choice

route:
  "1": goto Step 2a (Single Page Parity)
  "2": goto Step 2b (Full Parity with Tests)
  "3": goto Step 2c (Sprint Task Batch)
  "4": goto Step 2d (Custom Delegation)
  "0": |
    output: "Cancelled."
    exit: 0
```

---

### 2a. Single Page Parity (visual-parityV2)

```yaml
# Delegate to visual-parityV2 agent in target project
output: |
  📸 Single Page Parity — visual-parityV2
  
  Provide the page name (e.g., section-assessment-resultlist):

read: page_name

# Resolve target project path
target_project = initiative.target_repos[0] or "TargetProjects/northstar/migration/NorthStarET"

# Agent delegation: switch to target project and invoke agent
agent_file = "${target_project}/.github/agents/visual-parityV2.agent.md"

if not file_exists(agent_file):
  FAIL("visual-parityV2 agent not found at ${agent_file}")

# Record event: quickdev delegation started
invoke: event-log.append
params:
  event: quickdev_delegation_started
  agent: visual-parityV2
  page: ${page_name}
  timestamp: now()

# Delegate to agent
output: |
  🔀 Delegating to visual-parityV2 agent...
  ├── Target: ${target_project}
  ├── Agent: visual-parityV2.agent.md
  ├── Page: ${page_name}
  └── Mode: single page parity check

# Agent produces: differences found, fixes implemented, remaining issues
# Capture output for parity report

goto: Step 3 (Capture Report)
```

---

### 2b. Full Parity with Tests (prod-local-parity-v2)

```yaml
# Delegate to prod-local-parity-v2 for zero-tolerance 8-phase parity
output: |
  🔬 Full Parity with Test Generation — prod-local-parity-v2
  
  Provide the menu path as comma-separated items
  (e.g., Reports, Classroom Dashboard):

read: menu_path_raw

menu_path = menu_path_raw.split(",").map(s => s.trim())

target_project = initiative.target_repos[0] or "TargetProjects/northstar/migration/NorthStarET"

agent_file = "${target_project}/.github/agents/prod-local-parity-v2.agent.md"

if not file_exists(agent_file):
  FAIL("prod-local-parity-v2 agent not found at ${agent_file}")

# Record event
invoke: event-log.append
params:
  event: quickdev_delegation_started
  agent: prod-local-parity-v2
  menu_path: ${menu_path}
  timestamp: now()

# Delegate to agent with full 8-phase workflow:
# Phase 0: Missing page detection
# Phase 1: Production capture
# Phase 2: Localhost service check
# Phase 3: Localhost capture
# Phase 4: Sequential thinking comparison
# Phase 5: Fix API differences
# Phase 6: Fix UI differences
# Phase 7: Iteration loop until EXACT parity
# Phase 8: Generate tests
output: |
  🔀 Delegating to prod-local-parity-v2 agent...
  ├── Target: ${target_project}
  ├── Agent: prod-local-parity-v2.agent.md
  ├── Menu Path: ${menu_path}
  └── Mode: zero-tolerance 8-phase parity with test generation

goto: Step 3 (Capture Report)
```

---

### 2c. Sprint Task Batch (sprint-task-picker)

```yaml
# Delegate to sprint-task-picker for ADO-driven batch execution
output: |
  📋 Sprint Task Batch — sprint-task-picker → parity agents

  This mode queries ADO for the next sprint tasks, then invokes
  parity agents for each task automatically.

  Confirm batch execution? [Y/N]

read: batch_confirm

if batch_confirm != "Y" and batch_confirm != "y":
  output: "Cancelled."
  exit: 0

target_project = initiative.target_repos[0] or "TargetProjects/northstar/migration/NorthStarET"

agent_file = "${target_project}/.github/agents/sprint-task-picker.agent.md"

if not file_exists(agent_file):
  output: |
    ⚠️  sprint-task-picker agent not found at ${agent_file}
    └── Falling back to manual page selection
  goto: Step 1

# Record event
invoke: event-log.append
params:
  event: quickdev_batch_started
  agent: sprint-task-picker
  timestamp: now()

output: |
  🔀 Delegating to sprint-task-picker agent...
  ├── Target: ${target_project}
  ├── Agent: sprint-task-picker.agent.md
  └── Mode: ADO sprint task → parity pipeline

# sprint-task-picker pulls ADO tasks and delegates to parity agents
# Each completed task produces a parity report

goto: Step 3 (Capture Report)
```

---

### 2d. Custom Agent Delegation

```yaml
# Allow delegation to any agent in the target project
target_project = initiative.target_repos[0] or "TargetProjects/northstar/migration/NorthStarET"
agents_dir = "${target_project}/.github/agents"

if not dir_exists(agents_dir):
  FAIL("No agents directory found at ${agents_dir}")

# List available agents
agent_files = list_files(agents_dir, "*.agent.md")

output: |
  🤖 Available Agents in ${target_project}
  ═══════════════════════════════════════════════════
  ${for i, agent in enumerate(agent_files)}
    [${i+1}] ${agent.name}
  ${endfor}
  ═══════════════════════════════════════════════════
  [0] Cancel

read: agent_choice

if agent_choice == "0":
  output: "Cancelled."
  exit: 0

selected_agent = agent_files[int(agent_choice) - 1]

output: |
  Provide instructions for ${selected_agent.name}:

read: agent_instructions

invoke: event-log.append
params:
  event: quickdev_custom_delegation
  agent: ${selected_agent.name}
  instructions: ${agent_instructions}
  timestamp: now()

output: |
  🔀 Delegating to ${selected_agent.name}...
  ├── Target: ${target_project}
  ├── Agent: ${selected_agent.name}
  └── Instructions: ${agent_instructions}

goto: Step 3 (Capture Report)
```

---

### 3. Capture Parity Report

```yaml
# After agent delegation completes, capture the results as a parity report

# Generate report filename
timestamp = now().format("YYYY-MM-DD_HHmmss")
page_slug = (page_name or menu_path.join("-") or "custom").to_kebab_case()
report_file = "${parity_reports_path}/${page_slug}_${timestamp}.md"

# Collect results from agent execution
report_content = |
  # Parity Report: ${page_slug}
  
  **Date:** ${timestamp}
  **Initiative:** ${initiative.name} (${initiative.id})
  **Agent:** ${delegated_agent}
  **Branch:** ${phase_branch}
  
  ## Summary
  
  ${agent_output.summary or "Agent execution completed — see details below."}
  
  ## Differences Found
  
  ${agent_output.differences or "No differences catalogue returned by agent."}
  
  ## Fixes Applied
  
  ${agent_output.fixes or "No fix log returned by agent."}
  
  ## Remaining Issues
  
  ${agent_output.remaining or "None reported."}
  
  ## Tests Generated
  
  ${agent_output.tests or "No tests generated in this run."}
  
  ## Evidence
  
  - Agent file: ${agent_file}
  - Target project: ${target_project}
  - Related stories: S-009, S-032
  
  ---
  *Generated by /quickdev workflow*

write_file(report_file, report_content)

output: |
  📄 Parity report saved:
  └── ${report_file}
```

---

### 4. State Update

```yaml
# Update state and initiative config
invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id}
  updates:
    current_phase: quickdev
    workflow_status: complete
    last_quickdev_run: ${timestamp}
    parity_reports:
      - file: ${report_file}
        page: ${page_slug}
        agent: ${delegated_agent}
        timestamp: ${timestamp}

# Record completion event
invoke: event-log.append
params:
  event: quickdev_complete
  report: ${report_file}
  page: ${page_slug}
  agent: ${delegated_agent}
  timestamp: now()

output: |
  ✅ QuickDev Complete
  ├── Report: ${report_file}
  ├── State: updated
  └── Event log: appended
```

---

### 5. Commit and Continue

```yaml
# Commit parity report to planning repo
git add ${report_file}
git commit -m "quickdev: parity report for ${page_slug} via ${delegated_agent}"
git push origin ${phase_branch}

output: |
  📦 Committed and pushed parity report

  Next steps:
  ├── Review report at ${report_file}
  ├── Run /quickdev again for another page
  ├── Use /dev for implementation + required review/fix cycle before any PR flow
  ├── Run /status to see initiative progress
  └── When all pages pass, proceed to route removal

  Related stories:
  ├── S-009 — SectionDataEntry Parity Tests
  └── S-032 — Visual Regression Baseline Capture
```

---

## Error Handling

```yaml
on_error:
  # If agent delegation fails, capture the error context
  error_report = "${parity_reports_path}/ERROR_${page_slug}_${timestamp}.md"
  write_file(error_report, |
    # QuickDev Error Report
    
    **Date:** ${timestamp}
    **Agent:** ${delegated_agent}
    **Error:** ${error.message}
    
    ## Context
    ${error.stack or "No stack trace available"}
    
    ## Recovery
    - Check that Aspire services are running
    - Verify environment variables: NORTHSTARUSERNAME, NORTHSTARPASSWORD
    - Ensure target project agents exist in .github/agents/
    - Try running the agent directly in the target project
  )
  
  invoke: event-log.append
  params:
    event: quickdev_error
    error: ${error.message}
    agent: ${delegated_agent}
    timestamp: now()

  output: |
    ❌ QuickDev Error
    ├── Error: ${error.message}
    ├── Error report: ${error_report}
    └── Check Aspire services and environment variables
```
