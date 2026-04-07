---
name: 'step-03-validate-and-sense'
description: 'Validate slug-safe names, verify track rules, and run cross-initiative sensing'
nextStepFile: './step-04-create-initiative.md'
---

# Step 3: Validate Names And Run Sensing

**Goal:** Reject invalid initiative names early, validate feature tracks, and surface overlapping initiatives before creating config or branches.

---

## EXECUTION SEQUENCE

### 1. Slug-Safe Validation

```yaml
if domain == "" or length(domain) < 2 or length(domain) > 50:
  FAIL("❌ Domain name must normalize to 2-50 lowercase alphanumeric characters.")

if scope == "service" or scope == "feature":
  if service == "" or length(service) < 2 or length(service) > 50:
    FAIL("❌ Service name must normalize to 2-50 lowercase alphanumeric characters.")

if scope == "feature":
  if feature == "" or length(feature) < 2 or length(feature) > 50:
    FAIL("❌ Feature name must normalize to 2-50 lowercase alphanumeric characters.")

if scope == "feature":
  track_config = lifecycle.tracks[track]
  if track_config == null:
    FAIL("❌ Track `${track}` not found. Available tracks: ${keys(lifecycle.tracks).join(', ')}")
```

### 2. Cross-Initiative Sensing & Track Permission Gate

> **Parallel execution:** Sensing and constitution resolution are independent read-only operations.
> Execute both concurrently to reduce latency.

```yaml
# --- BEGIN PARALLEL BLOCK ---
# Operation A: Cross-initiative sensing
sensing_future = invoke_async: sensing.scan-initiatives
params:
  current_domain: ${domain}
  current_service: ${scope == "domain" ? null : service}
  current_feature: ${scope == "feature" ? feature : null}
  current_scope: ${scope}

# Operation B: Constitutional track permission (feature scope only)
constitution_future = null
if scope == "feature":
  if constitution_result == null:
    constitution_future = invoke_async: constitution.resolve-constitution
    params:
      domain: ${domain}
      service: ${service}
# --- END PARALLEL BLOCK ---

# Await results
sensing_result = await(sensing_future)
constitution_result = constitution_result != null ? constitution_result : (constitution_future != null ? await(constitution_future) : null)
```

#### 2a. Evaluate Sensing Results

```yaml
sensing_report = sensing_result.sensing_report || sensing_result
sensing_matches = sensing_report.overlaps || []

if sensing_matches.length > 0:
  overlap_severity = max(map(sensing_matches, m -> m.severity || "low"))

  output: |
    ⚠️ Active initiatives overlap with this scope:
    ${map(sensing_matches, match -> "- " + match.initiative + " (" + match.phase + "/" + match.audience + ") — " + match.conflict_reason + "\n  💡 " + derive_overlap_guidance(match)).join("\n")}

  if overlap_severity == "high":
    ask: |
      🛑 High-severity overlap detected. Proceeding may cause naming conflicts or duplicated work.

      Options:
        [1] Proceed anyway — I've reviewed the overlaps and want to continue
        [2] Rename — Choose a different name to avoid the conflict
        [3] Abort — Cancel initiative creation

    capture: overlap_decision
    if overlap_decision == "2" or overlap_decision contains "rename":
      output: "Returning to scope collection for a new name."
      goto: step-02-collect-scope
    if overlap_decision == "3" or overlap_decision contains "abort":
      FAIL("Initiative creation cancelled by user.")
  else:
    output: "Overlaps are advisory (severity: ${overlap_severity}). Proceeding."
```

#### 2b. Enforce Track Permission Gate

```yaml
if scope == "feature" and constitution_result != null:
  resolved_constitution = constitution_result.resolved_constitution || constitution_result

  expected_pattern = resolved_constitution.initiative_root_pattern || "domain-service-feature"
  expected_root = expected_pattern == "feature-only" ? feature : "${domain}-${service}-${feature}"
  if initiative_root != expected_root:
    FAIL("❌ Initiative root `${initiative_root}` does not match constitutional naming pattern `${expected_pattern}`. Expected `${expected_root}`.")

  if resolved_constitution.permitted_tracks exists and not contains(resolved_constitution.permitted_tracks, track):
    FAIL("⚠️ Constitution blocks creation: track `${track}` is not permitted for ${domain}/${service}. Run `/constitution` to review governance rules or contact governance admins.")
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`