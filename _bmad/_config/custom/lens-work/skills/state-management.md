# Skill: state-management

**Module:** lens-work
**Owner:** Tracey agent (delegated via Compass)
**Type:** Internal delegation skill

---

## Purpose

Manages the two-file state system (state.yaml + event-log.jsonl). Handles all reads, writes, and validations of initiative state. Formalizes the Tracey agent's API contract.

## Responsibilities

1. **State reads** — Load current initiative state at workflow start
2. **State writes** — Update state at workflow end
3. **Dual-write sync** — When `phase_status`, `current_phase`, or `audience_status` changes, update BOTH state.yaml AND the initiative config (`initiatives/{id}.yaml` or `initiatives/{id}/Domain.yaml` etc.) to keep them in sync
4. **Event logging** — Append to event-log.jsonl on every state mutation
5. **Status display** — Format and present state for /status and /lens commands
6. **State validation** — Verify state consistency with git reality
7. **Error tracking** — Maintain background_errors array in state

## State Schema (v2 — Lifecycle Contract)

```yaml
# state.yaml — personal runtime state (git-ignored)
lifecycle_version: 2
lens_contract_version: "2.0"

# Active context
active_initiative: "{initiative_id}"
current_phase: "{preplan|businessplan|techplan|devproposal|sprintplan}"
active_track: "{full|feature|tech-change|hotfix|spike}"
workflow_status: "{idle|running|error}"

# Phase status (v2: named phases, dual-written to initiative config)
phase_status:
  preplan: "{null|passed|blocked}"
  businessplan: "{null|passed|blocked}"
  techplan: "{null|passed|blocked}"
  devproposal: "{null|passed|blocked}"
  sprintplan: "{null|passed|blocked}"

# Audience promotion status (v2)
audience_status:
  small_to_medium: "{null|passed|blocked}"
  medium_to_large: "{null|passed|blocked}"
  large_to_base: "{null|passed|blocked}"

# Checklist tracking
checklist:
  current_gate: null
  items: []
  gate_ready: false
  gate_ready_pct: 0

# Error accumulator
background_errors: []

# Timestamps
created_at: "{ISO8601}"
last_activity: "{ISO8601}"

# User context
user:
  name: "{git_user_name}"
  email: "{git_user_email}"
```

## Initiative Config Schema (v2)

```yaml
# initiatives/{id}.yaml — shared initiative config (committed)
lifecycle_version: 2

id: "{initiative_id}"
name: "{initiative_name}"
layer: "{domain|service|repo}"
track: "{full|feature|tech-change|hotfix|spike}"
initiative_root: "{initiative_root}"

# Track-derived fields
active_phases: [preplan, businessplan, ...]  # From lifecycle.yaml tracks[track].phases
audiences: [small, medium, large, base]      # From lifecycle.yaml tracks[track].audiences

# Phase status (dual-written from state.yaml)
phase_status:
  preplan: "{null|passed|blocked}"
  businessplan: "{null|passed|blocked}"
  techplan: "{null|passed|blocked}"
  devproposal: "{null|passed|blocked}"
  sprintplan: "{null|passed|blocked}"

current_phase: "{named_phase}"
```

## Event Log Schema (event-log.jsonl)

```jsonl
{"ts":"ISO8601","event":"event_type","initiative":"id","user":"name","details":{}}
```

## Event Types

| Event | When |
|-------|------|
| `initiative_created` | /new-* completes |
| `phase_transition` | Phase advances (v2: named phase) |
| `audience_promotion` | Audience promotion gate passes (v2) |
| `workflow_start` | Any workflow begins |
| `workflow_end` | Any workflow completes |
| `gate_opened` | Phase gate passes |
| `gate_blocked` | Phase gate fails |
| `state_synced` | /sync runs |
| `state_fixed` | /fix runs |
| `state_overridden` | /override runs |
| `error` | Any error occurs |
| `initiative_archived` | /archive runs |
| `constitution_violation` | Governance check fails |
| `constitution_passed` | Governance check passes |
| `migrate_lifecycle` | v1→v2 lifecycle migration completes |

## Dual-Write Contract

When `phase_status`, `current_phase`, or `audience_status` changes in state.yaml:
1. Write to `_bmad-output/lens-work/state.yaml`
2. Also write to the initiative config file:
   - Domain: `initiatives/{id}/Domain.yaml`
   - Service: `initiatives/{id}/Service.yaml`
   - Feature/Repo: `initiatives/{id}.yaml`
3. When switching initiatives (`/switch`), load phase_status from the initiative config into state.yaml

## Lifecycle Version Detection

```yaml
# Determine which schema to use:
# v2.0.0: All initiatives must have lifecycle_version: 2
# Use named phases, tracks, audience promotions
current_phase = state.current_phase    # "preplan", "businessplan", etc.
audience = lifecycle.phases[current_phase].audience
```

## Trigger Conditions

- Every workflow start (read state)
- Every workflow end (write state + append event)
- /status command (read + format)
- /sync command (validate + repair)
- /fix command (rebuild from event log)
- /override command (manual write)

## Error Handling

| Error | Recovery |
|-------|----------|
| State file missing | Initialize from template (lifecycle_version: 2) |
| State corrupted | Rebuild from event-log.jsonl |
| Event log missing | Initialize empty, warn user |
| Version mismatch | Run migration (migrate-state → migrate-lifecycle) |
| Legacy state detected | Block operation, require v2 migration |

---

## State Read/Write Operations (S-003)

### read-state

Load and validate `_bmad-output/lens-work/state.yaml`.

```yaml
# 1. Load file
state_path: "_bmad-output/lens-work/state.yaml"
state = load_yaml(state_path)

# 2. Validate lifecycle version
if state.lifecycle_version != 2:
  if state.lifecycle_version == 1 or state.lifecycle_version == null:
    error: |
      ❌ Legacy v1 state detected
      ├── Found: lifecycle_version = ${state.lifecycle_version || 'missing'}
      ├── Required: lifecycle_version = 2
      └── Run /migrate to upgrade to v2 lifecycle contract
    exit: 1
  else:
    error: "Unknown lifecycle_version: ${state.lifecycle_version}"
    exit: 1

# 3. Validate required fields exist
required_fields:
  - lifecycle_version
  - active_initiative
  - current_phase
  - active_track
  - workflow_status
  - phase_status
  - audience_status

for field in required_fields:
  if field not in state:
    error: "State file missing required field: ${field}"
    exit: 1

# 4. Validate current_phase is canonical
canonical_phases: [null, "preplan", "businessplan", "techplan", "devproposal", "sprintplan", "dev"]
if state.current_phase not in canonical_phases:
  error: |
    ❌ Invalid phase name: '${state.current_phase}'
    ├── Allowed: preplan, businessplan, techplan, devproposal, sprintplan, dev
    └── Legacy numbered phases (p1-p6) are not valid in v2

# 5. Validate active_track is canonical
canonical_tracks: [null, "full", "feature", "tech-change", "hotfix", "spike"]
if state.active_track not in canonical_tracks:
  error: "Invalid track: '${state.active_track}'. Allowed: full, feature, tech-change, hotfix, spike"

# 6. Validate workflow_status
valid_statuses: ["idle", "running", "error", "in_progress", "ready", "complete", "pr_pending"]
if state.workflow_status not in valid_statuses:
  error: "Invalid workflow_status: '${state.workflow_status}'"

# 7. Validate phase_status map keys
for key in state.phase_status:
  if key not in ["preplan", "businessplan", "techplan", "devproposal", "sprintplan"]:
    error: "Invalid phase_status key: '${key}'. Must be a canonical v2 phase name."

# 8. Validate phase_status map values
valid_phase_values: [null, "passed", "blocked", "complete", "in_progress", "pr_pending"]
for key, value in state.phase_status:
  if value not in valid_phase_values:
    error: "Invalid phase_status value for ${key}: '${value}'"

# 9. Validate audience_status map
required_audience_keys: ["small_to_medium", "medium_to_large", "large_to_base"]
for key in required_audience_keys:
  if key not in state.audience_status:
    error: "audience_status missing required key: '${key}'"
valid_audience_values: [null, "passed", "blocked"]
for key, value in state.audience_status:
  if value not in valid_audience_values:
    error: "Invalid audience_status value for ${key}: '${value}'"

# 10. Return validated state
return state
```

### write-state

Save state to `_bmad-output/lens-work/state.yaml`, preserving structure.

```yaml
# 1. Validate before writing (same checks as read-state)
validate_state(state)

# 2. Update timestamps
state.last_activity = now_iso8601()

# 3. Write YAML with comments preserved
write_yaml(state_path, state, preserve_comments=true)

# 4. If dual-write fields changed, propagate to initiative config
if changed_fields intersect ["phase_status", "current_phase", "audience_status"]:
  initiative_path = resolve_initiative_path(state.active_initiative)
  initiative = load_yaml(initiative_path)
  
  if "phase_status" in changed_fields:
    initiative.phase_status = state.phase_status
  if "current_phase" in changed_fields:
    initiative.current_phase = state.current_phase
  if "audience_status" in changed_fields:
    # audience_status only in state.yaml; initiative uses gate_status
    pass
  
  write_yaml(initiative_path, initiative)

# 5. Append event to event-log.jsonl
append_event({
  ts: now_iso8601(),
  event: "state_write",
  initiative: state.active_initiative,
  changed_fields: changed_fields
})
```

### init-state

Initialize a new state.yaml from template when no state file exists.

```yaml
# 1. Check if state file already exists
if file_exists(state_path):
  error: "State file already exists. Use write-state to update."

# 2. Load template
template = load_yaml("templates/state-template.yaml")

# 3. Populate user context from git
template.user.name = shell("git config user.name")
template.user.email = shell("git config user.email")
template.created_at = now_iso8601()
template.last_activity = now_iso8601()

# 4. Write state
write_yaml(state_path, template)

# 5. Log event
append_event({
  ts: now_iso8601(),
  event: "state_initialized",
  details: { lifecycle_version: 2, template: "state-template.yaml" }
})
```

---

## Initiative Config CRUD Operations (S-004)

### resolve-initiative-path

Resolve the file path for an initiative config based on its layer.

```yaml
# Input: initiative_id (string), layer (string, optional — detected from id format)
# Output: file path to initiative config YAML

# 1. Determine storage path based on layer
#    Feature/Repo: _bmad-output/lens-work/initiatives/{id}.yaml        (flat)
#    Service:      _bmad-output/lens-work/initiatives/{id}/Service.yaml (nested)
#    Domain:       _bmad-output/lens-work/initiatives/{id}/Domain.yaml  (nested)

base_path: "_bmad-output/lens-work/initiatives"

if layer == "feature" or layer == "repo" or layer == null:
  path = "${base_path}/${initiative_id}.yaml"
elif layer == "service":
  path = "${base_path}/${initiative_id}/Service.yaml"
elif layer == "domain":
  path = "${base_path}/${initiative_id}/Domain.yaml"
else:
  error: "Unknown initiative layer: '${layer}'. Expected: domain, service, feature, repo"
  exit: 1

return path
```

### create-initiative

Create a new initiative config from the initiative template.

```yaml
# Input:
#   initiative_id: string (required)   — Unique initiative identifier
#   name: string (required)            — Human-readable initiative name
#   layer: string (required)           — domain|service|feature|repo
#   domain: string (required)          — Domain name
#   domain_prefix: string (required)   — Normalized domain prefix for branch names
#   service: string (optional)         — Service name
#   service_prefix: string (optional)  — Normalized service prefix
#   track: string (required)           — full|feature|tech-change|hotfix|spike
#   target_repos: list (required)      — Target repository names
#   question_mode: string (optional)   — interactive|batch (default: interactive)
#   initiative_root: string (required) — Root branch name
#   docs: object (optional)            — Documentation paths

# 1. Resolve file path
path = resolve_initiative_path(initiative_id, layer)

# 2. Check if initiative config already exists
if file_exists(path):
  error: |
    ❌ Initiative config already exists
    ├── Path: ${path}
    ├── ID: ${initiative_id}
    └── Use read-initiative or update-initiative instead
  exit: 1

# 3. Load template
template = load_yaml("templates/initiative-template.yaml")

# 4. Validate required fields
required_fields: [initiative_id, name, layer, domain, domain_prefix, track, target_repos, initiative_root]
for field in required_fields:
  if field == null or field == "":
    error: "Missing required field for initiative creation: '${field}'"
    exit: 1

# 5. Validate layer
valid_layers: ["domain", "service", "feature", "repo"]
if layer not in valid_layers:
  error: "Invalid layer: '${layer}'. Allowed: domain, service, feature, repo"
  exit: 1

# 6. Validate track against lifecycle.yaml
lifecycle = load_yaml("lifecycle.yaml")
if track not in lifecycle.tracks:
  error: |
    ❌ Invalid track: '${track}'
    ├── Allowed: ${keys(lifecycle.tracks)}
    └── Check lifecycle.yaml tracks section
  exit: 1

# 7. Derive active_phases and audiences from lifecycle.yaml track
track_config = lifecycle.tracks[track]
active_phases = track_config.phases
audiences = track_config.audiences

# 8. Populate template fields
config = template
config.lifecycle_version = 2
config.id = initiative_id
config.name = name
config.layer = layer
config.domain = domain
config.domain_prefix = domain_prefix
config.service = service || null
config.service_prefix = service_prefix || null
config.target_repos = target_repos
config.initiative_root = initiative_root
config.track = track
config.active_phases = active_phases
config.audiences = audiences
config.question_mode = question_mode || "interactive"
config.scope = layer  # default scope matches layer
config.coupling = "none"
config.constitution_mode = "advisory"
config.created_at = now_iso8601()
config.last_activity = now_iso8601()
config.current_phase = null

# 9. Initialize phase_status map — only include phases active for this track
config.phase_status = {}
for phase in active_phases:
  config.phase_status[phase] = null

# 10. Set docs paths if provided
if docs != null:
  config.docs = docs
else:
  config.docs = {
    path: null,
    domain: domain_prefix,
    service: service_prefix || null,
    repo: null
  }

# 11. Create parent directory if needed (for domain/service nested paths)
if layer in ["domain", "service"]:
  ensure_directory("${base_path}/${initiative_id}/")

# 12. Write initiative config
write_yaml(path, config)

# 13. Log event
append_event({
  ts: now_iso8601(),
  event: "initiative_created",
  initiative: initiative_id,
  layer: layer,
  track: track,
  target_repos: target_repos,
  docs_path: config.docs.path
})

# 14. Return created config
output: |
  ✅ Initiative config created
  ├── ID: ${initiative_id}
  ├── Layer: ${layer}
  ├── Track: ${track} (${length(active_phases)} phases)
  ├── Path: ${path}
  └── Status: Ready for first phase

return config
```

### read-initiative

Load and validate an initiative config by ID.

```yaml
# Input: initiative_id (string, required)
# Input: layer (string, optional — auto-detected if omitted)
# Output: validated initiative config object

# 1. Resolve path (try feature first, then service, then domain)
if layer != null:
  path = resolve_initiative_path(initiative_id, layer)
  if not file_exists(path):
    error: |
      ❌ Initiative config not found
      ├── ID: ${initiative_id}
      ├── Layer: ${layer}
      └── Expected at: ${path}
    exit: 1
else:
  # Auto-detect layer by checking paths in order
  for try_layer in ["feature", "service", "domain"]:
    path = resolve_initiative_path(initiative_id, try_layer)
    if file_exists(path):
      layer = try_layer
      break
  
  if layer == null:
    error: |
      ❌ Initiative config not found for any layer
      ├── ID: ${initiative_id}
      ├── Searched: initiatives/${initiative_id}.yaml (feature/repo)
      ├── Searched: initiatives/${initiative_id}/Service.yaml
      └── Searched: initiatives/${initiative_id}/Domain.yaml
    exit: 1

# 2. Load YAML
config = load_yaml(path)

# 3. Validate lifecycle version
if config.lifecycle_version != 2:
  if config.lifecycle_version == 1 or config.lifecycle_version == null:
    error: |
      ❌ Legacy v1 initiative config detected
      ├── Found: lifecycle_version = ${config.lifecycle_version || 'missing'}
      ├── ID: ${initiative_id}
      ├── Path: ${path}
      └── Run /migrate to upgrade to v2 lifecycle contract
    exit: 1
  else:
    error: "Unknown lifecycle_version in initiative config: ${config.lifecycle_version}"
    exit: 1

# 4. Validate required fields
required_fields:
  - id
  - name
  - layer
  - domain
  - domain_prefix
  - track
  - initiative_root
  - active_phases
  - phase_status

for field in required_fields:
  if field not in config:
    error: |
      ❌ Initiative config missing required field: '${field}'
      ├── ID: ${initiative_id}
      └── Path: ${path}
    exit: 1

# 5. Validate id matches requested id
if config.id != initiative_id:
  error: |
    ❌ Initiative ID mismatch
    ├── Requested: ${initiative_id}
    ├── Found in file: ${config.id}
    └── Path: ${path}
  exit: 1

# 6. Validate track is canonical
canonical_tracks: ["full", "feature", "tech-change", "hotfix", "spike"]
if config.track not in canonical_tracks:
  error: "Invalid track in initiative config: '${config.track}'"
  exit: 1

# 7. Validate phase_status keys match active_phases
for phase in config.active_phases:
  if phase not in config.phase_status:
    error: |
      ❌ phase_status missing key for active phase: '${phase}'
      ├── active_phases: ${config.active_phases}
      └── phase_status keys: ${keys(config.phase_status)}
    exit: 1

# 8. Validate phase_status values
valid_phase_values: [null, "passed", "blocked", "complete", "in_progress", "pr_pending"]
for key, value in config.phase_status:
  if value not in valid_phase_values:
    error: "Invalid phase_status value for ${key}: '${value}'"
    exit: 1

# 9. Validate current_phase is canonical (if set)
canonical_phases: [null, "preplan", "businessplan", "techplan", "devproposal", "sprintplan", "dev"]
if config.current_phase not in canonical_phases:
  error: "Invalid current_phase in initiative config: '${config.current_phase}'"
  exit: 1

# 10. Validate layer
valid_layers: ["domain", "service", "feature", "repo"]
if config.layer not in valid_layers:
  error: "Invalid layer in initiative config: '${config.layer}'"
  exit: 1

# 11. Return validated config with resolved path
config._resolved_path = path
config._resolved_layer = layer
return config
```

### update-initiative

Update specific fields in an initiative config. Enforces validation and dual-write contract.

```yaml
# Input:
#   initiative_id: string (required)
#   updates: object (required) — Map of field names to new values
#   layer: string (optional) — Auto-detected if omitted
# Output: updated initiative config

# 1. Load current config (validates via read-initiative)
config = read_initiative(initiative_id, layer)
path = config._resolved_path

# 2. Define updatable fields (whitelist — prevents accidental overwrites)
updatable_fields:
  - current_phase
  - phase_status           # Accepts full map or partial: {preplan: "complete"}
  - constitution_mode
  - question_mode
  - scope
  - coupling
  - docs                   # Full docs object replacement
  - target_repos
  - last_activity

# Protected fields (cannot be updated via this operation)
protected_fields:
  - id
  - lifecycle_version
  - layer
  - domain
  - domain_prefix
  - service
  - service_prefix
  - initiative_root
  - track
  - active_phases
  - audiences
  - created_at

# 3. Validate no protected fields in updates
for field in updates:
  if field in protected_fields:
    error: |
      ❌ Cannot update protected field: '${field}'
      ├── Protected fields: ${protected_fields}
      └── These fields are set at creation time and cannot be changed
    exit: 1
  if field not in updatable_fields:
    error: |
      ❌ Unknown field: '${field}'
      ├── Updatable fields: ${updatable_fields}
      └── Use create-initiative for new fields
    exit: 1

# 4. Apply updates with validation
changed_fields = []

for field, value in updates:
  # Special handling for phase_status (partial map merge)
  if field == "phase_status":
    if type(value) != object:
      error: "phase_status must be an object/map, got: ${type(value)}"
      exit: 1
    
    # Validate all keys are active phases
    for phase_key in value:
      if phase_key not in config.active_phases:
        error: |
          ❌ Cannot set phase_status for inactive phase: '${phase_key}'
          ├── Active phases for track '${config.track}': ${config.active_phases}
          └── This phase is not part of the current track
        exit: 1
    
    # Validate values
    valid_values: [null, "passed", "blocked", "complete", "in_progress", "pr_pending"]
    for phase_key, phase_value in value:
      if phase_value not in valid_values:
        error: "Invalid phase_status value for ${phase_key}: '${phase_value}'"
        exit: 1
    
    # Merge (partial update — only overwrite specified keys)
    for phase_key, phase_value in value:
      config.phase_status[phase_key] = phase_value
    changed_fields.append("phase_status")
  
  # Special handling for current_phase
  elif field == "current_phase":
    canonical_phases: [null, "preplan", "businessplan", "techplan", "devproposal", "sprintplan", "dev"]
    if value not in canonical_phases:
      error: "Invalid current_phase: '${value}'"
      exit: 1
    config.current_phase = value
    changed_fields.append("current_phase")
  
  # Special handling for docs (full object replacement with validation)
  elif field == "docs":
    if type(value) != object:
      error: "docs must be an object, got: ${type(value)}"
      exit: 1
    config.docs = value
    changed_fields.append("docs")
  
  # All other updatable fields — direct assignment
  else:
    config[field] = value
    changed_fields.append(field)

# 5. Update timestamp
config.last_activity = now_iso8601()

# 6. Write updated config
write_yaml(path, config)

# 7. Dual-write to state.yaml if shared fields changed
dual_write_fields = ["phase_status", "current_phase"]
dual_write_needed = any(f in changed_fields for f in dual_write_fields)

if dual_write_needed:
  state = load_yaml("_bmad-output/lens-work/state.yaml")
  
  if state.active_initiative == initiative_id:
    if "phase_status" in changed_fields:
      state.phase_status = config.phase_status
    if "current_phase" in changed_fields:
      state.current_phase = config.current_phase
    
    state.last_activity = now_iso8601()
    write_yaml("_bmad-output/lens-work/state.yaml", state)

# 8. Log event
append_event({
  ts: now_iso8601(),
  event: "initiative_updated",
  initiative: initiative_id,
  changed_fields: changed_fields,
  details: updates
})

# 9. Return updated config
output: |
  ✅ Initiative config updated
  ├── ID: ${initiative_id}
  ├── Changed: ${changed_fields}
  └── Path: ${path}

return config
```

### list-initiatives

Scan the initiatives directory and return all initiative configs.

```yaml
# Input: none (or optional filter: layer, track, status)
# Output: list of initiative summary objects

base_path: "_bmad-output/lens-work/initiatives"

# 1. Scan for initiative configs
initiatives = []

# Scan flat files (feature/repo layer)
for file in glob("${base_path}/*.yaml"):
  config = load_yaml(file)
  if config.lifecycle_version == 2:
    initiatives.append({
      id: config.id,
      name: config.name,
      layer: config.layer,
      track: config.track,
      current_phase: config.current_phase,
      initiative_root: config.initiative_root,
      path: file
    })

# Scan nested directories (domain/service layer)
for dir in list_dirs(base_path):
  for nested_file in ["Domain.yaml", "Service.yaml"]:
    nested_path = "${base_path}/${dir}/${nested_file}"
    if file_exists(nested_path):
      config = load_yaml(nested_path)
      if config.lifecycle_version == 2:
        initiatives.append({
          id: config.id,
          name: config.name,
          layer: config.layer,
          track: config.track,
          current_phase: config.current_phase,
          initiative_root: config.initiative_root,
          path: nested_path
        })

# 2. Apply optional filters
if filter.layer != null:
  initiatives = [i for i in initiatives if i.layer == filter.layer]
if filter.track != null:
  initiatives = [i for i in initiatives if i.track == filter.track]

# 3. Sort by layer precedence, then name
layer_order = {"domain": 0, "service": 1, "feature": 2, "repo": 3}
initiatives.sort(key=lambda i: (layer_order[i.layer], i.name))

# 4. Return list
return initiatives
```

---

_Skill spec backported from lens module on 2026-02-17. Updated for v2 lifecycle contract 2026-02-23. S-003 operations added 2026-02-25. S-004 initiative config CRUD added 2026-02-25._
