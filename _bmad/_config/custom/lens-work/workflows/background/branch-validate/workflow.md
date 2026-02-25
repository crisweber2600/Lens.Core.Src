---
name: branch-validate
description: Verify branch topology matches expected patterns (v2 — named phases)
agent: casey
trigger: "background (auto-triggered)"
category: background
imports: lifecycle.yaml
---

# Background Workflow: branch-validate

**Purpose:** Verify branch topology matches expected patterns at phase transitions and initiative creation. Ensures git branches are consistent with initiative configuration and the lifecycle contract.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `initiative_create` | Verify all expected branches were created and pushed (track-aware) |
| `phase_transition` | Verify parent audience branch exists, root branch exists, flag unexpected branches |
| `audience_promotion` | Verify source and target audience branches exist, validate promotion is valid for track |

---

## Execution Steps

### On initiative_create

```yaml
1. Load initiative config to determine expected topology
2. Load lifecycle.yaml to determine track-specific audience requirements
3. Based on layer:

   Domain-layer:
   - Verify branch exists: {domain_prefix}
   - Verify branch is pushed to remote

   Service-layer:
   - Verify branch exists: {domain_prefix}-{service_prefix}
   - Verify parent domain branch exists: {domain_prefix}
   - Verify branch is pushed to remote

   Feature-layer (track-aware):
   - Verify root branch exists: {initiative_root}
   - Verify audience branches exist based on track:
     Track: full/feature     → {initiative_root}-small, -medium, -large
     Track: tech-change      → {initiative_root}-small, -medium, -large
     Track: hotfix           → {initiative_root}-small
     Track: spike            → {initiative_root}-small
   - Verify all branches are pushed to remote
   - Verify parent branch exists (domain or service)

4. Report results:
   IF all branches valid → log success
   IF branches missing → log to background_errors[], suggest /recreate-branches
```

### On phase_transition

```yaml
1. Load state.yaml for current initiative context
2. Load initiative config for branch patterns
3. Load lifecycle.yaml for phase-audience mapping
4. Validate:
   a. Root branch exists: {initiative_root}
   b. Current audience branch exists (derived from lifecycle.yaml phases[phase_name].audience)
   c. Previous phase branch exists or was properly deleted (if applicable)
   d. No unexpected branches match the initiative pattern
5. IF validation fails:
   a. Append to background_errors[] with specific missing branches
   b. Suggest recovery: /recreate-branches or manual git commands
6. IF unexpected branches found:
   a. Log warning (don't block — may be intentional)
```

### On audience_promotion

```yaml
1. Load initiative config and lifecycle.yaml
2. Validate:
   a. Source audience branch exists: {initiative_root}-{source_audience}
   b. Target audience branch exists: {initiative_root}-{target_audience}
   c. Promotion is valid for track (e.g., hotfix can only promote small→base)
   d. All phases in source audience are complete (phase_status == "passed")
3. IF validation fails:
   a. Block promotion
   b. Report which phases are incomplete or which branches are missing
```

---

## Validation Rules

1. Root branch must always exist for active initiatives
2. Audience branches must exist before phase branches can be created
3. Audience branches are track-dependent (hotfix/spike only create small)
4. Phase branches are ephemeral (exist only during active work)
5. Workflow branches are ephemeral
6. No unexpected branches should match the initiative pattern (warning only)
7. Legacy p{N} branches trigger migration warning (not an error)

---

## Branch Pattern Reference (v2)

```yaml
domain: "{domain_prefix}"
service: "{domain_prefix}-{service_prefix}"
root: "{initiative_root}"
audience_small: "{initiative_root}-small"
audience_medium: "{initiative_root}-medium"
audience_large: "{initiative_root}-large"
phase: "{initiative_root}-{audience}-{phase_name}"
workflow: "{initiative_root}-{audience}-{phase_name}-{workflow_name}"

# Named phases (from lifecycle.yaml phase_order):
# preplan, businessplan, techplan, devproposal, sprintplan

# Legacy patterns (detected and warned):
legacy_phase: "{featureBranchRoot}-{audience}-p{phase_number}"
legacy_workflow: "{featureBranchRoot}-{audience}-p{phase_number}-{workflow_name}"
```

---

## Detecting Legacy Branches

```bash
# After listing branches matching initiative pattern:
for branch in $(git branch -r --list "origin/${initiative_root}-*"); do
  segment="${branch#origin/${initiative_root}-}"
  if [[ "$segment" =~ ^(small|medium|large)-p[0-9]+ ]]; then
    echo "⚠️ Legacy branch: ${branch}"
    echo "└── Run @tracey migrate-lifecycle to rename"
  fi
done
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Branch missing locally | Check remote, suggest fetch |
| Branch missing on remote | Suggest /recreate-branches |
| Unexpected branches found | Warn, don't block |
| Legacy p{N} branches found | Warn about migration, don't block |
| Git command fails | Log error, suggest manual check |
| Track mismatch (wrong audiences) | Log error, suggest re-init or manual fix |
