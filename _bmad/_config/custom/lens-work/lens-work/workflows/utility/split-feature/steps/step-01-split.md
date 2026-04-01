---
name: split-feature
description: Validate the source feature, create child initiatives, copy artifacts, mark original as superseded
nextStepFile: null
preflightInclude:
  - lifecycle-version
lifecycleContract:
  reads:
    - initiative-state.yaml
    - features.yaml
  writes:
    - initiative-state.yaml (new children + parent superseded)
    - features.yaml (new entries)
    - artifacts (copied to children)
---

# Step 1: Split Feature

## Context

You are splitting a feature initiative into two or more child features. This is a structural operation that creates new initiative entries, copies relevant planning artifacts, and marks the original feature as superseded.

## Inputs

Collect from the user if not provided:

- **source_feature**: The feature identifier being split (current initiative or specified)
- **into_features**: List of new feature names (at least 2)
- **artifact_assignment** (optional): Which artifacts go to which child — if not specified, copy all to each child

## Procedure

### 1. Validate Source Feature

```
INVOKE skill: git-state read initiative-state.yaml for {source_feature}
```

- Confirm the source feature exists and is in an active state (not already superseded or closed)
- Load the current initiative-state.yaml for the source feature
- Note the domain, service, track, and current phase

### 2. Validate Child Names

For each name in {into_features}:
- Confirm name is not already in use (check features.yaml and existing branches)
- Confirm name follows naming conventions from lifecycle.yaml
- Must have at least 2 child features

If any validation fails, report and ask user to correct.

### 3. Create Child Initiative Entries

For each child feature name:

1. Create the initiative directory structure:
   - If using DSF naming: `{domain}-{service}-{child_name}/`
   - If using feature-only naming: `{child_name}/`

2. Create a new initiative-state.yaml for the child:
   - Copy domain, service from parent
   - Set track to same as parent (or let user override)
   - Set phase to `preplan` (children start fresh)
   - Add `split_from: {source_feature}` metadata field
   - Set status to `active`

3. Copy planning artifacts:
   - If artifact_assignment was provided, copy only assigned artifacts
   - Otherwise, copy ALL artifacts from parent to each child
   - Update any internal references to the old feature name

### 4. Update Features Registry

```
INVOKE skill: git-state read features.yaml
```

For each child feature:
- Add a new entry to features.yaml:
  ```yaml
  {child_name}:
    domain: {parent_domain}
    service: {parent_service}
    split_from: {source_feature}
    created: {timestamp}
    status: active
  ```

### 5. Mark Parent as Superseded

Update the parent initiative-state.yaml:
- Set status to `superseded`
- Add `superseded_by` field with list of child feature names:
  ```yaml
  status: superseded
  superseded_by:
    - {child_1}
    - {child_2}
  ```

Update the parent features.yaml entry:
- Set status to `superseded`
- Add `superseded_by` list

### 6. Commit Changes

```
INVOKE skill: git-orchestration commit
  message: "[SPLIT] {source_feature} → {child_list_joined_by_comma}"
  scope: initiative
```

### 7. Output Summary

Report to the user:

```
## Split Complete

**Source:** {source_feature} → superseded
**Children created:**
{for each child}
  - {child_name} (track: {track}, phase: preplan)
{end for}

**Artifacts copied:** {count} files per child
**Next:** Run /new-feature or resume planning on any child initiative
```

---

> **NEXT STEP DIRECTIVE**
> This is the only step. Workflow complete after commit.
