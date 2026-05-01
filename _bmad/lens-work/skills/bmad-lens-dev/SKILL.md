---
name: bmad-lens-dev
description: Dev phase conductor for epic and story implementation in a clean-room target repo. Use when the user requests dev, implement stories, or continue sprint execution.
---

# Lens Dev Skill

## Overview

This skill orchestrates Dev-phase execution for a feature after FinalizePlan approval. It prepares the target-repo branch context, resolves the active epic/story queue, delegates implementation work, and records checkpoint status in the feature docs session file.

Scope for this skill is lifecycle orchestration only. Story implementation logic is delegated to implementation-capable skills and tools.

## Input Contract

Required inputs:
- feature_id: Active feature identifier.
- governance_repo: Absolute path to governance repository.
- control_repo: Absolute path to control repository.

Optional inputs:
- target_repo_path: Explicit target repo path override.
- epic: Epic selector (number or id) when the user narrows execution.
- base_branch: Branch to fork from when branch prep is needed.
- working_branch: Existing branch to resume if already prepared.

Preconditions:
- FinalizePlan artifacts exist and are review-ready.
- Governance feature state is readable.
- Target repo is reachable and has no unresolved merge state.

## Output Contract

Primary outputs:
- Dev execution summary for the selected epic/story scope.
- Story-level commit references for completed implementation slices.
- Updated dev-session state (completed, failed, blocked story lists).

Secondary outputs:
- Focused test execution result for each completed story slice.
- Final PR readiness signal when all required stories are complete.

## Error Behavior

Hard-stop errors:
- Missing required inputs or unresolved feature context.
- FinalizePlan gate not satisfied.
- Target repo branch prep failure.
- Commit/push failure for a completed story slice.

Recoverable errors:
- Story-level test failure: mark story failed and continue to next unblocked story only when user-approved.
- Missing optional inputs: prompt for values and continue.

Never continue silently after a hard-stop error.

## Test Hooks

Validate this contract with focused tests that assert:
- Required input keys are named in this skill.
- Output contract includes story commit references and dev-session updates.
- Hard-stop and recoverable error categories are explicitly documented.
- Scope statement keeps this skill orchestration-only.

## Execution Flow

1. Resolve feature context and active story queue.
2. Confirm or prepare target repo branch context.
3. Select next unblocked story (or epic-filtered story set).
4. Delegate implementation, run focused tests, commit, and push.
5. Update dev-session status and continue until requested scope is complete.

## Integration Points

- bmad-lens-feature-yaml: read feature state and docs metadata.
- bmad-lens-git-state: verify repo/branch status before each story.
- bmad-lens-git-orchestration: branch prep and git safety operations.
- bmad-lens-bmad-skill: delegated implementation and review actions.
