---
name: lens-quickdev
description: Governed QuickDev wrapper for dev-ready Lens features. Assesses context, records versioned evidence, and delegates implementation to bmad-quick-dev.
---

# Lens QuickDev Skill

## Overview

`/lens-quickdev` is a public dev-phase wrapper for small, governed implementation asks inside a Lens feature. It is conductor-only: it resolves Lens context, checks that the feature is ready for development, prepares the quickdev evidence trail, delegates implementation to the existing `bmad-quick-dev` engine, and records the result.

This skill does not implement a second quick-dev engine.

## Input Contract

Required input:
- `ask`: the implementation request to assess, plan, and delegate.

Optional inputs:
- `--feature-id <featureId>`: override the active feature context.
- `--dry-run`: perform context resolution, assessment, planning, and evidence drafting without implementation writes.

## Preconditions

- Prompt-start preflight has completed successfully.
- A Lens feature context is resolvable from `--feature-id` or the active workspace context.
- The feature phase is one of the dev-ready phase values before target-repo assessment begins: `finalizeplan-complete`, `dev-ready`, or `dev`.
- `feature.yaml.target_repos` contains a resolvable target repo entry.
- The resolved target repo is reachable and has no unresolved merge state.

## Feature Resolution Gate

Resolve feature context before creating evidence or inspecting source code.

1. If `--feature-id <featureId>` is present, use that value and ignore the active workspace feature for this run.
2. Otherwise read the active feature context from `.lens/personal/context.yaml` and the governance feature index.
3. Read canonical feature state with the sanctioned helper:

```bash
uv run --script lens.core/_bmad/lens-work/skills/lens-feature-yaml/scripts/feature-yaml-ops.py read \
	--governance-repo {governance_repo} \
	--feature-id {feature_id}
```

4. Treat only `finalizeplan-complete`, `dev-ready`, and `dev` as dev-ready phase values for quickdev execution. Any other phase is `quickdev_phase_gate_failed`.
5. Resolve `docs.path` and `docs.governance_docs_path` from the helper payload before creating any quickdev evidence.
6. Resolve the first `target_repos` entry before target-repo assessment. Supported forms are:
	 - a string alias such as `lens.core.src`, resolved through the Lens governance repo inventory or target-repo mapping;
	 - a structured entry with `local_path`, resolved relative to the workspace root when not absolute.
7. If `target_repos` is missing, empty, ambiguous, or cannot be resolved to one reachable local repo, stop with `quickdev_target_repo_unresolved`. Do not infer a write target from open files, current terminal directory, or prompt text.

## Scope Rules

- Default implementation scope is the resolved target repo source tree.
- Feature-associated control-repo docs may be read as context.
- Broader non-source edits require a scope-creep warning and an explicit operator override before edits proceed.
- Any approved override must be recorded in the versioned quickdev evidence artifact.

## Execution Contract

1. Confirm prompt-start preflight succeeded.
2. Resolve feature context through the Feature Resolution Gate, honoring explicit `--feature-id` before active context.
3. Block before target-repo assessment when the feature phase is not a dev-ready phase value or the target repo cannot be resolved.
4. Assess the target codebase and feature-associated control docs for the request.
5. Produce an implementation plan, assumptions, and validation plan for the ask.
6. Create or update a versioned evidence artifact at `quickdev/quickdev-[summaryofrequeststub]-vNNN.md` under the feature docs path.
7. Delegate implementation through the registered `bmad-quick-dev` skill with Lens context. Do not introduce alternate implementation behavior here.
8. Capture the delegate outcome, including changed files, validation result, commit hash, branch, and PR URL when present.
9. Publish the versioned evidence artifact through the sanctioned Lens publication path when governance publication is required.

## Delegation Boundary

The only implementation engine for this wrapper is `bmad-quick-dev`. This skill may prepare context and evidence for that delegate, but source-code changes, tests, and implementation-specific decisions belong to the delegate.

## Output Contract

Return:
- Resolved feature id.
- Resolved target repo path or blocking reason.
- Versioned quickdev artifact path.
- Delegated implementation summary.
- Validation summary.
- Commit hash, branch, and PR URL when implementation changed source.
- No-op result when the delegate determines no source changes are required.

## Error Behavior

Hard stops:
- Preflight did not run or failed.
- Feature context is missing.
- Feature phase is not `finalizeplan-complete`, `dev-ready`, or `dev`.
- `target_repos` is missing or unresolved.
- Target repo has unresolved merge conflicts.
- The requested work exceeds the approved source/docs scope and no override is approved.

Recoverable outcomes:
- No source changes are needed: record a no-op result in the evidence artifact.
- Validation fails before commit: record the blocked validation result and do not commit.
- Validation fails after a local commit but before push: do not push; record recovery guidance.

## Test Hooks

Validate this contract with focused tests or inspection that assert:
- The public prompt is redirect-only and runs preflight before loading this skill.
- This skill names `bmad-quick-dev` as the only implementation engine.
- Non-dev-ready features block before target-repo assessment.
- Missing `target_repos` blocks without guessing a write target.
- Versioned quickdev evidence paths use `quickdev/quickdev-[summaryofrequeststub]-vNNN.md`.