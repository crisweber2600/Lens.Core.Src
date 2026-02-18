# Step: Detect Scope

**Purpose:** Determine which artifacts to analyze based on current phase and initiative state.

---

## Logic

### 1. Read State

```yaml
# Load two-file state architecture
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

current_phase = initiative.current_phase
initiative_id = state.active_initiative
```

---

### 2. Map Phase to Artifacts

**Phase→Artifact Mapping:**

```yaml
artifact_map:
  p1:  # Analysis
    - product-brief.md
    
  p2:  # Planning
    - product-brief.md
    - prd.md
    
  p3:  # Solutioning
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
    
  p4:  # Implementation
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
    - stories.md
```

**Load artifacts for current phase:**
```yaml
artifacts_to_analyze = artifact_map[current_phase]
```

---

### 3. Validate Artifact Existence

```yaml
# Base path for planning artifacts
base_path = "_bmad-output/planning-artifacts/"

# Check each artifact
available_artifacts = []
missing_artifacts = []

for artifact in artifacts_to_analyze:
  artifact_path = "${base_path}${artifact}"
  
  if file_exists(artifact_path):
    available_artifacts.append(artifact)
  else:
    missing_artifacts.append(artifact)
    # Log as HIGH severity finding
    log_finding(
      severity: HIGH,
      category: "missing-artifact",
      message: "Expected artifact not found: ${artifact}",
      path: artifact_path
    )
```

---

### 4. Custom Layer Override (Optional)

```yaml
# Check for custom artifact mapping
custom_spec = "_bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md"

if file_exists(custom_spec):
  custom_config = load_yaml_block(custom_spec, "custom_artifact_map")
  
  if custom_config and custom_config[current_phase]:
    # Merge custom artifacts with defaults
    artifacts_to_analyze = merge(artifacts_to_analyze, custom_config[current_phase])
```

---

## Output

```yaml
scope:
  phase: ${current_phase}
  phase_name: ${initiative.phase_name}  # e.g., "Solutioning"
  initiative_id: ${initiative_id}
  artifacts_available: ${available_artifacts}
  artifacts_missing: ${missing_artifacts}
  base_path: ${base_path}
```

---

## Error Handling

**If state.yaml missing:**
```
⚠️ No active initiative detected. Cross-artifact analysis requires an active initiative.

Options:
[1] Select initiative manually
[2] Return to Scribe main menu
```

**If all expected artifacts missing:**
```
⚠️ No planning artifacts found for phase ${current_phase}.

This may indicate:
- Phase ${current_phase} not yet started
- Artifacts in non-standard location
- Initiative configuration issue

Options:
[1] Specify artifact directory manually
[2] Run discovery to locate artifacts
[3] Skip analysis
```

---

## Next Step

→ Proceed to `load-artifacts.md` with scope context
