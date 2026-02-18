---
name: branch-validate
description: Verify branch topology matches expected patterns
agent: casey
trigger: "background (auto-triggered)"
category: background
---

# Background Workflow: branch-validate

**Purpose:** Verify branch topology matches expected patterns at phase transitions and initiative creation. Ensures git branches are consistent with initiative configuration.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `initiative_create` | Verify all expected branches were created and pushed |
| `phase_transition` | Verify parent audience branch exists, root branch exists, flag unexpected branches |

---

## Execution Steps

### On initiative_create

```yaml
1. Load initiative config to determine expected topology
2. Based on layer:
   
   Domain-layer:
   - Verify branch exists: {domain_prefix}
   - Verify branch is pushed to remote
   
   Service-layer:
   - Verify branch exists: {domain_prefix}-{service_prefix}
   - Verify parent domain branch exists: {domain_prefix}
   - Verify branch is pushed to remote
   
   Feature-layer:
   - Verify root branch exists: {featureBranchRoot}
   - Verify audience branches exist:
     - {featureBranchRoot}-small
     - {featureBranchRoot}-medium
     - {featureBranchRoot}-large
   - Verify all branches are pushed to remote
   - Verify parent branch exists (domain or service)

3. Report results:
   IF all branches valid → log success
   IF branches missing → log to background_errors[], suggest /recreate-branches
```

### On phase_transition

```yaml
1. Load state.yaml for current initiative context
2. Load initiative config for branch patterns
3. Validate:
   a. Root branch exists: {featureBranchRoot}
   b. Current audience branch exists (based on review_audience_map)
   c. Previous phase branch exists (if applicable)
   d. No unexpected branches match the initiative pattern
4. IF validation fails:
   a. Append to background_errors[] with specific missing branches
   b. Suggest recovery: /recreate-branches or manual git commands
5. IF unexpected branches found:
   a. Log warning (don't block — may be intentional)
```

---

## Validation Rules

1. Root branch must always exist for active initiatives
2. Audience branches must exist before phase branches can be created
3. Phase branches are ephemeral (exist only during active work)
4. Workflow branches are ephemeral
5. No unexpected branches should match the initiative pattern (warning only)

---

## Branch Pattern Reference

```yaml
domain: "{domain_prefix}"
service: "{domain_prefix}-{service_prefix}"
root: "{featureBranchRoot}"
audience_small: "{featureBranchRoot}-small"
audience_medium: "{featureBranchRoot}-medium"
audience_large: "{featureBranchRoot}-large"
phase: "{featureBranchRoot}-{audience}-p{phase_number}"
workflow: "{featureBranchRoot}-{audience}-p{phase_number}-{workflow_name}"
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Branch missing locally | Check remote, suggest fetch |
| Branch missing on remote | Suggest /recreate-branches |
| Unexpected branches found | Warn, don't block |
| Git command fails | Log error, suggest manual check |

---

_Background workflow backported from lens module on 2026-02-17_
