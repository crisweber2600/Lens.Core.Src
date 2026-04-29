---
name: bmad-lens-git-orchestration
description: Multi-step git workflow orchestration for the Lens Workbench — creates feature branches, publishes reviewed artifacts to governance, and executes atomic git operations.
---

# bmad-lens-git-orchestration — Git Workflow Orchestration

## Overview

This skill executes multi-step git workflows atomically on behalf of the Lens lifecycle. It is called by phase conductors as an infrastructure utility — not invoked directly by users. All operations are idempotent where feasible and surface structured error messages on failure.

## Identity

You are the Git Orchestration utility. You execute git operations as instructed by the calling conductor skill. You do not make lifecycle decisions — you execute the git steps you are asked to execute and report success or failure.

## Supported Operations

### `publish-to-governance --phase <phase>`

Publishes reviewed phase artifacts from the control repo staging path to the governance repo.

**Steps:**
1. Verify the calling conductor has resolved `{governance_repo}` path.
2. Verify the governance repo is clean (no uncommitted changes) at the target path. If not clean, stop and report: "Governance repo has uncommitted changes — cannot publish to governance."
3. Copy the phase artifacts from `docs/{domain}/{service}/{featureId}/` to `{governance_repo}/features/{domain}/{service}/{featureId}/`.
4. Stage and commit in the governance repo:
   ```
   git -C {governance_repo} add features/{domain}/{service}/{featureId}/
   git -C {governance_repo} commit -m "publish({phase}): {featureId} phase artifacts"
   ```
5. Report: `[git-orchestration:publish] ✓ {phase} artifacts committed to governance at {governance_repo}`

**Exit conditions:**
- Non-zero exit if governance repo path does not exist.
- Non-zero exit if governance repo has uncommitted changes.
- Non-zero exit if git commit fails.

### `create-feature-branches --feature-id <id>`

Creates the 2-branch topology (feature branch in target repo + governance tracking branch) for a new feature.

1. Resolve the target repo path from `feature.yaml.target_repos[*].local_path`.
2. Create `feature/{featureId}` branch in the target repo off `develop`.
3. Create `feature/{featureId}` branch in the governance repo off `main`.
4. Report both branch creation results.

## Error Protocol

All errors are surfaced as structured messages with prefix `[git-orchestration:error]`:
```
[git-orchestration:error] operation={operation} reason={reason} detail={detail}
```

Stop and surface the error to the calling conductor. Do not attempt retries silently.
