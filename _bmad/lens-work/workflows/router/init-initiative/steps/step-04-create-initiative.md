---
name: 'step-04-create-initiative'
description: 'Create governance metadata, scaffold local folders, and create feature branch topology when required'
nextStepFile: './step-05-respond.md'
---

# Step 4: Create The Initiative

**Goal:** Materialize initiative metadata in the governance repo, create any required local folders, and create feature git topology only when the selected scope requires it.

---

## EXECUTION SEQUENCE

### 1. Create Local Scaffold

```yaml
# Dirty-state check moved to step-01-preflight for early fail.
# If execution reaches here, the working tree was clean at preflight time.

target_projects_path = (profile != null and profile.target_projects_path != null and profile.target_projects_path != "") ? profile.target_projects_path : (module_config.target_projects_path || "TargetProjects")
init_ops_script = "{project-root}/lens.core/_bmad/lens-work/skills/bmad-lens-init-feature/scripts/init-feature-ops.py"
control_repo_path = "{project-root}"
track_config = scope == "feature" ? (lifecycle.tracks[track] || {}) : {}
topology = scope == "feature" ? (track_config.topology || "2-branch") : "scaffold-only"

if scope == "domain":
  ensure_directory("${target_projects_path}/${domain}")

if scope == "service":
  ensure_directory("${target_projects_path}/${domain}/${service}")
```

### 2. Create Governance Metadata And Branch Topology

```yaml
if scope == "domain":
  domain_result = run_json_command("python3 ${init_ops_script} create-domain --governance-repo ${governance_repo_path} --domain ${domain} --name '${inputs.name || domain}' --username ${user_name}")
  if domain_result.status != "pass":
    FAIL("❌ Failed to create governance metadata for domain `${domain}`: ${domain_result.error || 'unknown error'}")

  for command in domain_result.git_commands:
    invoke_command(command)

  created_marker_paths = domain_result.created_marker_paths || []
  session.pending_container_context = null

if scope == "service":
  service_result = run_json_command("python3 ${init_ops_script} create-service --governance-repo ${governance_repo_path} --domain ${domain} --service ${service} --name '${inputs.name || service}' --username ${user_name}")
  if service_result.status != "pass":
    FAIL("❌ Failed to create governance metadata for service `${domain}/${service}`: ${service_result.error || 'unknown error'}")

  for command in service_result.git_commands:
    invoke_command(command)

  created_marker_paths = service_result.created_marker_paths || []
  session.pending_container_context = {
    scope: "service",
    domain: ${domain},
    service: ${service},
    initiative_root: ${initiative_root},
    source_command: ${command_name}
  }

if scope == "feature":
  feature_result = run_json_command("python3 ${init_ops_script} create --governance-repo ${governance_repo_path} --control-repo ${control_repo_path} --feature-id ${initiative_root} --domain ${domain} --service ${service} --name '${feature_display_name || feature}' --track ${track} --username ${user_name}")
  if feature_result.status != "pass":
    FAIL("❌ Failed to initialize feature `${initiative_root}`: ${feature_result.error || 'unknown error'}")

  for command in feature_result.git_commands:
    invoke_command(command)

  for command in feature_result.gh_commands:
    invoke_command(command)

  created_marker_paths = feature_result.container_markers || []
  session.pending_container_context = null
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`