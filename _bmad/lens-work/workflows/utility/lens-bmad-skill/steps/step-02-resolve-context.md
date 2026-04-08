---
name: 'step-02-resolve-context'
description: 'Resolve the active Lens feature, governance, and target-repo context for the wrapped BMAD skill'
nextStepFile: './step-03-delegate.md'
---

# Step 2: Resolve Lens Context

**Goal:** Produce the minimum complete Lens context the downstream BMAD skill needs, without asking the user for information that is already available from feature.yaml or governance metadata.

---

## EXECUTION SEQUENCE

### 1. Start With Session And Feature YAML Context

```yaml
feature_yaml_state = session.feature_yaml_state || { available: false }
feature_yaml = feature_yaml_state.available ? feature_yaml_state.raw || {} : {}
repo_inventory = load("{governance_repo_path}/repo-inventory.yaml") || { repos: [] }

domain = feature_yaml.domain || ""
service = feature_yaml.service || ""
feature_id = feature_yaml.featureId || feature_yaml.feature || ""
phase = feature_yaml.phase || feature_yaml.current_phase || first(skill_entry.phaseHints) || "anytime"
track = feature_yaml.track || ""
docs_path = feature_yaml.docs.path || ""
governance_docs_path = feature_yaml.docs.governance_docs_path || ""
target_repo_path = feature_yaml.target_repos[0].local_path || ""
constitutional_context = session.constitutional_context || null
```

### 2. Fill Missing Required Context Only When Necessary

```yaml
if skill_entry.contextMode == "feature-required" and feature_id == "":
  ask: "`${skill_entry.displayName}` needs a feature context. Provide the domain."
  capture: domain

  ask: "Provide the service for this feature."
  capture: service

  ask: "Provide the feature ID. Use the existing Lens feature slug if one already exists."
  capture: feature_id

if target_repo_path == "" and domain != "" and service != "":
  matching_repos = filter(repo_inventory.repos, repo -> repo.domain == domain and repo.service == service)
  preferred_repo = first(matching_repos where repo.bmad_configured == true) || first(matching_repos)
  target_repo_path = preferred_repo != null ? preferred_repo.local_path : ""

if docs_path == "" and domain != "" and service != "" and feature_id != "":
  docs_path = "{output_folder}/" + domain + "/" + service + "/" + feature_id

if governance_docs_path == "" and domain != "" and service != "" and feature_id != "":
  governance_docs_path = "features/" + domain + "/" + service + "/" + feature_id + "/docs"
```

### 3. Compute Output And Write-Scope Guidance

```yaml
if skill_entry.outputMode == "planning-docs":
  resolved_output_path = docs_path != "" ? docs_path : "{output_folder}/planning-artifacts"
  write_scope = "Write planning artifacts to the resolved Lens docs path when available. Do not modify {release_repo_root}/ or .github/."
else if skill_entry.outputMode == "implementation-target":
  resolved_output_path = target_repo_path != "" ? target_repo_path : "{output_folder}/implementation-artifacts"
  write_scope = "Write implementation changes only inside the resolved target repo. Never modify {release_repo_root}/, .github/, or governance metadata unless the downstream skill explicitly requires governance artifacts."
else:
  resolved_output_path = "{output_folder}"
  write_scope = "Stay inside Lens-approved output paths and avoid {release_repo_root}/ and .github/."

lens_context = {
  domain: domain,
  service: service,
  feature_id: feature_id,
  phase: phase,
  track: track,
  docs_path: docs_path,
  governance_docs_path: governance_docs_path,
  governance_repo_path: "{governance_repo_path}",
  target_repo_path: target_repo_path,
  output_path: resolved_output_path,
  write_scope: write_scope,
  constitutional_context: constitutional_context
}

output: |
  ✅ Lens context resolved
  ├── Domain: ${domain != "" ? domain : "(not set)"}
  ├── Service: ${service != "" ? service : "(not set)"}
  ├── Feature: ${feature_id != "" ? feature_id : "(not set)"}
  ├── Target repo: ${target_repo_path != "" ? target_repo_path : "(not resolved)"}
  └── Output path: ${resolved_output_path}
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`