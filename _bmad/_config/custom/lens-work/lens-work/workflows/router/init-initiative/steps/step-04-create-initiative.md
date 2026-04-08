---
name: 'step-04-create-initiative'
description: 'Create the initiative config, scaffold local folders, and create feature branch topology when required'
nextStepFile: './step-05-respond.md'
---

# Step 4: Create The Initiative

**Goal:** Materialize the initiative config, create any required local folders, and create feature git topology only when the selected scope requires it.

---

## EXECUTION SEQUENCE

### 1. Create Config And Local Scaffold

```yaml
# Dirty-state check moved to step-01-preflight for early fail.
# If execution reaches here, the working tree was clean at preflight time.

target_projects_path = (profile != null and profile.target_projects_path != null and profile.target_projects_path != "") ? profile.target_projects_path : (module_config.target_projects_path || "TargetProjects")
commit_description = scope + " created"

initiative_config = {
  domain: domain,
  service: service,
  feature: feature,
  track: track,
  initiative_root: initiative_root,
  initiative_root_pattern: initiative_root_pattern,
  created: now_iso8601()
}

if scope == "domain":
  initiative_config.scope = "domain"
  initiative_config.initiative = domain

if scope == "service":
  initiative_config.scope = "service"
  initiative_config.initiative = service

if scope == "feature":
  initiative_config.scope = "feature"
  initiative_config.initiative = feature
  commit_description = "initiative created (track: " + track + ")"

write_yaml(config_path, initiative_config)

if scope == "domain":
  ensure_directory("${target_projects_path}/${domain}")

if scope == "service":
  ensure_directory("${target_projects_path}/${domain}/${service}")
```

### 2. Create Feature Topology When Required

```yaml
# v3.4: Only feature scope creates lifecycle branches.
track_config = scope == "feature" ? (lifecycle.tracks[track] || {}) : {}
topology = scope == "feature" ? (track_config.topology || "2-branch") : "scaffold-only"

if scope == "feature" and topology == "2-branch":
  # --- 2-BRANCH TOPOLOGY ---
  # Create featureId branch (code branch)
  invoke: git-orchestration.create-branch
  params:
    branch_name: ${initiative_root}

  # Create feature.yaml in initiative metadata path on the code branch
  feature_yaml_path = "{initiative_output_folder}/${domain}/${service}/${initiative_root}/feature.yaml"
  ensure_directory("{initiative_output_folder}/${domain}/${service}/${initiative_root}")

  feature_yaml = {
    feature: initiative_root,
    domain: domain,
    service: service,
    track: track,
    initiative_root_pattern: initiative_root_pattern,
    lifecycle_status: "active",
    status: "draft",
    owner: user_name,
    current_milestone: track_config.milestones[0] || "techplan",
    current_phase: track_config.start_phase,
    context:
      last_pulled: null
      stale: false
    created: now_iso8601(),
    updated_at: now_iso8601()
  }
  write_yaml(feature_yaml_path, feature_yaml)

  invoke: git-orchestration.commit-artifacts
  params:
    file_paths:
      - ${config_path}
      - ${feature_yaml_path}
    phase: INIT
    initiative: ${initiative_root}
    description: ${commit_description}

  invoke: git-orchestration.push
  params:
    branch: ${initiative_root}

  # Create featureId-plan branch (planning branch)
  invoke: git-orchestration.create-branch
  params:
    branch_name: "${initiative_root}-plan"
    parent_branch: ${initiative_root}

  # Create drafts/ directory on plan branch
  ensure_directory("drafts/")
  invoke: git-orchestration.push
  params:
    branch: "${initiative_root}-plan"

else:
  if scope == "feature":
    # --- LEGACY FEATURE TOPOLOGY FALLBACK ---
    invoke: git-orchestration.create-branch
    params:
      branch_name: ${initiative_root}

    invoke: git-orchestration.commit-artifacts
    params:
      file_paths:
        - ${config_path}
      phase: INIT
      initiative: ${initiative_root}
      description: ${commit_description}

    invoke: git-orchestration.push
    params:
      branch: ${initiative_root}
  else:
    # --- DOMAIN/SERVICE SCAFFOLDING ONLY ---
    # Keep the working tree clean for follow-up commands, but do not create or push a lifecycle branch.
    invoke: git-orchestration.commit-artifacts
    params:
      file_paths:
        - ${config_path}
      phase: INIT
      initiative: ${initiative_root}
      description: ${commit_description} + " (scaffold-only)"
```

### 3. Register In Feature Index And Create Summary Stub On Main *(v3.3)*

When `features_registry.enabled` is true, atomically register the new feature in
`feature-index.yaml` on main and create a stub `summary.md`. This ensures the feature
is visible to all other features from the moment of creation.

For 2-branch topology features, `feature_yaml: true` is also registered.

```yaml
features_registry_config = load("lifecycle.yaml").features_registry
features_registry_enabled = scope == "feature" ? true : (features_registry_config.enabled || false)
if features_registry_enabled and scope == "feature":

  # 3a. Switch to main
  CURRENT_BRANCH = git symbolic-ref --short HEAD
  git checkout main
  git pull origin main

  # 3b. Register in feature-index.yaml
  invoke: git-orchestration.update-feature-index
  params:
    feature: ${initiative_root}
    domain: ${domain}
    service: ${service}
    status: draft
    owner: ${user_name}
    plan_branch: ${scope == "feature" and topology == "2-branch" ? "${initiative_root}-plan" : ""}
    topology: ${topology}
    feature_yaml: ${scope == "feature" and topology == "2-branch"}
    summary: "New initiative — ${commit_description}"
    relationships:
      depends_on: []
      blocks: []
      related: []
    updated_at: now_iso8601()

  # 3c. Create stub summary.md on main
  summary_path = resolve_summary_path(domain, service, initiative_root)
  mkdir -p $(dirname ${summary_path})
  write "${summary_path}":
    "# ${initiative_root} — Summary\n\n"
    "**Status:** draft\n"
    "**Goal:** ${commit_description}\n"
    "**Updated:** ${now_iso8601()}\n\n"
    "## Key Decisions\n\n_None yet_\n\n"
    "## Open Questions\n\n_None yet_\n\n"
    "## Dependencies\n\n- **Depends on:** none\n- **Blocks:** none\n"

  # 3d. Commit and push visibility update
  git add "${feature_index_path}" "${summary_path}"
  git commit -m "[VISIBILITY] ${initiative_root} — initiative created"
  git push origin main

  # 3e. Return to working branch
  git checkout ${CURRENT_BRANCH}
```

### 4. Scaffold Governance Feature Directory (v3.4)

When the governance repo is available and this is a 2-branch topology feature,
create the feature directory with a problems.md template in the governance repo.

```yaml
governance_path = session.governance_repo_path || ""

if governance_path != "" and topology == "2-branch":
  feature_dir = "${governance_path}/features/${domain}/${service}/${initiative_root}"
  ensure_directory(feature_dir)

  # Create problems.md from template
  problems_path = "${feature_dir}/problems.md"
  if not file_exists(problems_path):
    template = load("../../assets/templates/problems-template.md")
    rendered = template
      .replace("{featureId}", initiative_root)
      .replace("{domain}", domain)
      .replace("{service}", service)
      .replace("{created_date}", now_iso8601())
    write_file(problems_path, rendered)
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`