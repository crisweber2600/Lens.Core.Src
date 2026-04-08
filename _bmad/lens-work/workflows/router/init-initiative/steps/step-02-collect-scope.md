---
name: 'step-02-collect-scope'
description: 'Collect scope-specific inputs, normalize names, and derive the initiative root'
nextStepFile: './step-03-validate-and-sense.md'
---

# Step 2: Collect Scope-Specific Inputs

**Goal:** Collect only the inputs that are valid for the selected scope, then derive the initiative root and config path.

---

## EXECUTION SEQUENCE

### 1. Collect Scope-Allowed Parameters

```yaml
primary_name = inputs.name || ""
domain = inputs.domain || ""
service = inputs.service || ""
track = lower(replace(replace(inputs.track || "", "_", "-"), " ", "-"))
feature = ""
initiative_root_pattern = ""
current_root_segments = current_context != null and current_context.initiative_root != null ? split(current_context.initiative_root, "-") : []

if scope == "domain":
  if primary_name == "":
    ask: "Provide the domain name for the new domain container."
    capture: primary_name
  domain = lower(remove_non_alphanumeric(primary_name))
  initiative_root_pattern = "domain"
  initiative_root = domain
  config_path = "{initiative_output_folder}/${domain}/initiative.yaml"

if scope == "service":
  if domain == "" and current_root_segments.length > 0:
    domain = current_root_segments[0]
  if domain == "":
    ask: "Provide the domain for the new service container."
    capture: domain
  if primary_name == "":
    ask: "Provide the service name for the new service container."
    capture: primary_name
  domain = lower(remove_non_alphanumeric(domain))
  service = lower(remove_non_alphanumeric(primary_name))
  initiative_root_pattern = "domain-service"
  initiative_root = "${domain}-${service}"
  config_path = "{initiative_output_folder}/${domain}/${service}/initiative.yaml"

if scope == "feature":
  if domain == "" and current_root_segments.length > 0:
    domain = current_root_segments[0]
  if service == "" and current_root_segments.length > 1:
    service = current_root_segments[1]
  if domain == "":
    ask: "Provide the domain for the new feature initiative."
    capture: domain
  if service == "":
    ask: "Provide the service for the new feature initiative."
    capture: service
  if primary_name == "":
    ask: "Provide the feature name for the new feature initiative."
    capture: primary_name
  domain = lower(remove_non_alphanumeric(domain))
  service = lower(remove_non_alphanumeric(service))
  feature = lower(remove_non_alphanumeric(primary_name))

  # Resolve constitutional naming + track constraints once and reuse.
  constitution_result = invoke_if_possible: constitution.resolve-constitution
  params:
    domain: ${domain}
    service: ${service}
  resolved_constitution = constitution_result.resolved_constitution || constitution_result || {}
  initiative_root_pattern = resolved_constitution.initiative_root_pattern || "domain-service-feature"

  if initiative_root_pattern == "feature-only":
    initiative_root = "${feature}"
  else:
    # Default and fallback: domain-service-feature
    initiative_root = "${domain}-${service}-${feature}"

  if track == "":
    # Constitution-aware track filtering
    permitted_tracks = resolved_constitution.permitted_tracks || null

    all_tracks:
      - express: "🚀 express      — All planning in one session. Best for solo work, spikes, or getting started fast."
      - full: "   full         — Full lifecycle with all phases and promotion gates."
      - feature: "   feature      — Streamlined feature track with reduced ceremony."
      - tech-change: "   tech-change  — Technical change with architecture focus."
      - hotfix: "   hotfix       — Expedited fix for production issues."
      - quickdev: "   quickdev     — Minimal planning, fast to implementation."
      - spike: "   spike        — Time-boxed research or proof of concept."

    if permitted_tracks != null:
      visible_tracks = filter(all_tracks, t -> contains(permitted_tracks, key(t)))
      blocked_note = "\n   ℹ️ Some tracks are restricted by governance for ${domain}/${service}."
    else:
      visible_tracks = all_tracks
      blocked_note = ""

    ask: |
      Choose a track for this feature:

      ${map(visible_tracks, t -> value(t)).join("\n")}${blocked_note}

      Recommended for first-time users: express
    capture: track
  track = lower(replace(replace(track, "_", "-"), " ", "-"))
  config_path = "{initiative_output_folder}/${domain}/${service}/${feature}.yaml"

output: |
  ✅ Scope inputs collected
  ├── Initiative root: ${initiative_root}
  ├── Root pattern: ${initiative_root_pattern}
  └── Config path: ${config_path}
```

### 2. Collection Boundaries

Do not collect track for domain or service scope. Do not collect service or feature inputs for domain scope. Do not collect feature inputs for service scope.

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`