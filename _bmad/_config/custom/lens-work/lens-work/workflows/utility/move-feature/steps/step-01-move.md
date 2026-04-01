---
name: 'step-01-move'
description: 'Validate move target, relocate initiative files, update state and registry, commit'
nextStepFile: null
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Move Feature

**Goal:** Move a feature from its current domain/service to a new domain/service, updating all references.

---

## EXECUTION SEQUENCE

### 1. Load Context And Parse Arguments

```yaml
invoke: include
path: "{preflightInclude}"
params:
  skip_constitution: true

initiative_state = invoke: git-state.current-initiative
initiative = load(initiative_state.config_path)
lifecycle = load("{lifecycleContract}")

feature = initiative.feature
old_domain = initiative.domain
old_service = initiative.service
initiative_root = initiative.initiative_root

# Parse move target from command arguments
# Expected: /move-feature --domain {new-domain} --service {new-service}
# Or: /move-feature {feature} --domain {new-domain} --service {new-service}
if not new_domain or not new_service:
  ask: |
    Where should feature '${feature}' move to?
    Current location: ${old_domain}/${old_service}
    
    Provide: --domain {new-domain} --service {new-service}
  capture: new_domain, new_service
```

### 2. Validate Move Is Safe

```yaml
new_domain = lower(remove_non_alphanumeric(new_domain))
new_service = lower(remove_non_alphanumeric(new_service))

# Check target doesn't already have a feature with this name
new_config_path = lifecycle.scope_hierarchy.feature.config_schema.path_patterns.feature
  .replace("{domain}", new_domain)
  .replace("{service}", new_service)
  .replace("{feature}", feature)

if file_exists(new_config_path):
  FAIL("❌ Feature '${feature}' already exists at ${new_domain}/${new_service}. Use a different name or resolve the conflict first.")

old_folder = "_bmad-output/lens-work/initiatives/${old_domain}/${old_service}"
new_folder = "_bmad-output/lens-work/initiatives/${new_domain}/${new_service}"

output: |
  📦 Move Plan
  ━━━━━━━━━━━
  Feature:      ${feature}
  From:         ${old_domain}/${old_service}
  To:           ${new_domain}/${new_service}
  Branch:       ${initiative_root} (no rename needed with feature-only naming)
  
  Files to move:
    ${old_folder}/${feature}.yaml → ${new_folder}/${feature}.yaml
    (plus any related artifacts in the feature folder)

ask: "Proceed with move? (yes/no)"
```

### 3. Execute Move

```yaml
ensure_directory(new_folder)

# Move initiative config
invoke_command("git mv ${old_folder}/${feature}.yaml ${new_folder}/${feature}.yaml")

# Move any feature-specific artifact folder if it exists
old_artifacts = "${old_folder}/${feature}/"
new_artifacts = "${new_folder}/${feature}/"
if directory_exists(old_artifacts):
  invoke_command("git mv ${old_artifacts} ${new_artifacts}")

# Update initiative config with new domain/service
initiative.domain = new_domain
initiative.service = new_service
write_yaml("${new_folder}/${feature}.yaml", initiative)

# Update features.yaml registry if it exists
features_yaml_path = lifecycle.features_registry.index_file
if file_exists(features_yaml_path):
  features = load(features_yaml_path)
  if features[feature]:
    features[feature].domain = new_domain
    features[feature].service = new_service
    features[feature].moved_from = "${old_domain}/${old_service}"
    write_yaml(features_yaml_path, features)

# Move problems.md if it exists
old_problems = lifecycle.problem_logging.file_pattern
  .replace("{domain}", old_domain)
  .replace("{service}", old_service)
new_problems = lifecycle.problem_logging.file_pattern
  .replace("{domain}", new_domain)
  .replace("{service}", new_service)
if file_exists(old_problems):
  ensure_directory(dirname(new_problems))
  invoke_command("git mv ${old_problems} ${new_problems}")
```

### 4. Commit

```yaml
invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${new_folder}/${feature}.yaml
    - ${features_yaml_path}
  phase: "MOVE"
  initiative: ${initiative_root}
  description: "[MOVE] ${feature}: ${old_domain}/${old_service} → ${new_domain}/${new_service}"
```

### 5. Confirmation

```
✅ Feature Moved
━━━━━━━━━━━━━━━
Feature:  ${feature}
From:     ${old_domain}/${old_service}
To:       ${new_domain}/${new_service}
Branch:   ${initiative_root} (unchanged)
Commit:   [MOVE] ${feature}: ${old_domain}/${old_service} → ${new_domain}/${new_service}

The feature's domain/service classification has been updated.
Branch name and initiative root are unchanged.
```

---

## WORKFLOW COMPLETE

This is a single-step utility workflow. No further steps.
