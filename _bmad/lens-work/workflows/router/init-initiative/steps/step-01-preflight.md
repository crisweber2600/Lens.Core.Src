---
name: 'step-01-preflight'
description: 'Run shared preflight and initialize scope for initiative creation'
nextStepFile: './step-02-collect-scope.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
moduleConfigPath: '../../../../bmadconfig.yaml'
governanceSetupPath: '{project-root}/_bmad-output/lens-work/governance-setup.yaml'
profilePath: '{project-root}/_bmad-output/lens-work/personal/profile.yaml'
---

# Step 1: Preflight And Scope Initialization

**Goal:** Confirm the environment is ready, determine which creation command the user invoked, and initialize the shared state for the rest of the workflow.

---

## EXECUTION SEQUENCE

### 1. Shared Preflight And Scope Detection

```yaml
invoke: include
path: "{preflightInclude}"
params:
  skip_constitution: true

command_name = inputs.command_name
requested_scope = lower(inputs.scope || "")

if command_name == "/new-domain":
  scope = "domain"
else if command_name == "/new-service":
  scope = "service"
else if command_name == "/new-feature":
  scope = "feature"
else if command_name == "/new-initiative":
  if requested_scope == "domain" or requested_scope == "service" or requested_scope == "feature":
    scope = requested_scope
  else:
    # Backward-compatible default: generic new-initiative behaves as new-feature.
    scope = "feature"
else:
  FAIL("❌ Unsupported command for init-initiative: ${command_name}")

lifecycle = load("{lifecycleContract}")
module_config = load("{moduleConfigPath}")
profile = load_if_exists("{personal_output_folder}/profile.yaml")
current_context = invoke: git-state.current-initiative

governance_setup = load_if_exists("{governanceSetupPath}")
target_projects_path = profile.target_projects_path || module_config.target_projects_path || "TargetProjects"
module_governance_path = module_config.governance_repo_path || ""
if module_governance_path == "{project-root}" or module_governance_path == ".":
  module_governance_path = ""

governance_repo_path = governance_setup.governance_repo_path || profile.governance_repo_path || module_governance_path || "${target_projects_path}/lens/lens-governance"

if governance_repo_path == "" or not directory_exists(governance_repo_path):
  FAIL("❌ Governance repo not found. Run `/onboard` so initiative metadata can be written to the governance repo before creating new initiatives.")

session.target_projects_path = target_projects_path
session.governance_repo_path = governance_repo_path
```

### 2. Early Dirty-State Check

Fail immediately if uncommitted work would interfere with branch creation in later steps.

```yaml
dirty_state = invoke: git-orchestration.check-dirty

if dirty_state.status == "dirty":
  output: |
    ❌ Working tree is not clean.
    ├── Files changed: ${dirty_state.files_changed || 0}
    └── Files: ${(dirty_state.files || []).join(', ')}

    Commit or stash the pending work, then rerun the initiative creation command.
  FAIL("❌ Initiative creation stopped to avoid mixing uncommitted work with new branch setup.")

output: |
  🌱 Initiative creation initialized
  ├── Command: ${command_name}
  ├── Scope: ${scope}
  └── Governance repo: ${governance_repo_path}
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`