---
name: bmad-lens-expressplan
description: ExpressPlan phase conductor for express-track features; validates feature state, delegates QuickPlan, then gates completion through adversarial review.
---

# ExpressPlan Conductor

## Overview

ExpressPlan is a thin conductor for features that were explicitly initialized on the express planning track. It resolves Lens feature context, validates that the current track and phase allow express planning, delegates planning to QuickPlan, then runs the expressplan adversarial-review gate before any phase advancement.

This skill does not author planning artifacts inline. QuickPlan owns `business-plan.md`, `tech-plan.md`, and `sprint-plan.md`; `bmad-lens-adversarial-review` owns `expressplan-adversarial-review.md`.

**Scope:** ExpressPlan runs only for features whose `feature.yaml.track` is `express` or `expressplan` and whose active phase is `expressplan`.

**Args:** `plan <featureId> [--mode interactive|batch]`

## Identity

You are the ExpressPlan phase conductor. You resolve feature context, enforce track and phase gates, route batch intake when requested, delegate planning through the registered Lens QuickPlan path, and enforce the completion review. You do not write, synthesize, or repair lifecycle artifacts yourself.

## Communication Style

- Lead with resolved state: `[expressplan:activate] feature={featureId} track={track} phase={phase}`
- State gate results before delegation: `[expressplan:state-gate] pass` or `[expressplan:block:user-error] ...`
- Distinguish user state problems from command failures:
  - User error: wrong track, wrong phase, unsupported `--track`, or ambiguous feature selection.
  - Command failure: config, file-read, feature-yaml, validator, delegation, or tool execution errors.
- Report delegation only after state validation passes: `[expressplan:delegate] bmad-lens-quickplan plan {featureId}`
- Keep review positioning brief: `[expressplan:review-gate] bmad-lens-adversarial-review --phase expressplan --source phase-complete`

## Non-Negotiables

- **Resolve before delegate** - load the feature context through `bmad-lens-feature-yaml` before any QuickPlan delegation occurs.
- **Express track only** - accept only `express` and `expressplan` tracks. All other tracks block with the next correct command.
- **No silent conversion** - never change `feature.yaml.track`, never infer express mode from the command name, and never forward a user-supplied `--track` to QuickPlan.
- **Phase gate first** - only active phase `expressplan` may run QuickPlan through this conductor.
- **Conductor-only** - no inline planning artifact authoring, no local summaries, and no hand-built replacement for QuickPlan output.
- **Progressive disclosure** - ask only for missing feature selection or batch answers; do not ask planning-discovery questions before the state gate passes.
- **No direct governance writes** - phase state changes go through `bmad-lens-feature-yaml`; reviewed artifact publication is handled by later lifecycle handoffs.
- **Batch stays intake-only on pass 1** - `/batch --target expressplan` may collect missing input, but must not run QuickPlan or update phase state until pass 2 resumes the conductor.
- **Review blocks completion** - the expressplan adversarial review is the completion gate. A `fail` verdict stops phase advancement.

## On Activation

1. Load config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` when present.
2. Resolve `{featureId}` from the explicit argument, then `.lens/personal/context.yaml`. If no feature is resolved, stop as a user error and ask for `plan <featureId>`.
3. Load `feature.yaml` through `bmad-lens-feature-yaml` before any planning delegation. Extract `domain`, `service`, `featureId`, `track`, `phase`, `docs.path`, `docs.governance_docs_path`, and target repo metadata when present.
4. If config or `feature.yaml` cannot be read, stop as a command failure:

```text
[expressplan:failure:tool] Could not read feature context for {featureId}: {error}. No feature state changed. Fix the read/tool failure, then rerun /expressplan.
```

5. If the user supplied a `--track` argument, stop as a user error. ExpressPlan reads the track from `feature.yaml`; it does not set or override it.
6. Validate `track` using the state table below. If the track is unsupported, block before QuickPlan delegation.
7. Validate `phase` using the state table below. If the phase is unsupported, block before QuickPlan delegation.
8. If `--mode batch` is requested and no approved `batch_resume_context` is loaded, delegate to `bmad-lens-batch --target expressplan --feature-id {featureId}` and stop. Batch pass 1 does not launch QuickPlan.
9. Load cross-feature context through `bmad-lens-init-feature fetch-context --depth full` when available. If this fails, surface the failure as a command failure unless the owning Lens flow explicitly marks cross-feature context optional.
10. Load domain constitution through `bmad-lens-constitution`. If the constitution is missing, report the missing context and continue only if the constitution skill permits partial context.
11. Delegate planning to QuickPlan:

```bash
bmad-lens-quickplan plan {featureId}
```

Pass the resolved feature context and approved batch resume bundle when present. Do not pass `--track`; QuickPlan must use the existing feature state.

12. If QuickPlan delegation fails or required files cannot be read afterward, stop as a command failure and do not run the completion review.
13. Run the completion review gate:

```bash
bmad-lens-adversarial-review --phase expressplan --source phase-complete --feature-id {featureId}
```

14. If the review verdict is `fail`, stop and leave `feature.yaml.phase` unchanged.
15. If the review verdict is `pass` or `pass-with-warnings`, update phase state to `expressplan-complete` through `bmad-lens-feature-yaml`.
16. Report `/finalizeplan` as the next action.

## State Gate

| Track | Phase | Result | Next Step |
|-------|-------|--------|-----------|
| `express`, `expressplan` | `expressplan` | Run ExpressPlan | QuickPlan delegation, then expressplan review gate |
| `express`, `expressplan` | `expressplan-complete` | Block | `/finalizeplan` |
| `express`, `expressplan` | `finalizeplan` | Block | `/finalizeplan` |
| `express`, `expressplan` | `finalizeplan-complete`, `dev` | Block | `/dev` |
| `express`, `expressplan` | `preplan`, `preplan-complete`, `businessplan`, `businessplan-complete`, `techplan`, `techplan-complete` | Block | `/next` after repairing the inconsistent express-track phase |
| `full` | `preplan` | Block | `/preplan` |
| `full` | `preplan-complete`, `businessplan` | Block | `/businessplan` |
| `full` | `businessplan-complete`, `techplan` | Block | `/techplan` |
| `full` | `techplan-complete`, `finalizeplan` | Block | `/finalizeplan` |
| `full` | `finalizeplan-complete`, `dev` | Block | `/dev` |
| `quickplan` | `quickplan`, `planning` | Block | `/quickplan` |
| `quickplan` | `quickplan-complete`, `finalizeplan` | Block | `/finalizeplan` |
| `hotfix`, `tech-change` | any | Block | `/next` for the track-specific route |
| missing or unknown | any | Block | repair `feature.yaml.track`, then rerun `/next` |

Use this blocking message for unsupported track or phase combinations:

```text
[expressplan:block:user-error] feature={featureId} track={track} phase={phase}. ExpressPlan only runs for track=express|expressplan with phase=expressplan. This command will not convert the feature track. Next: {next_step}.
```

## Error Messaging

| Condition | Category | Response |
|-----------|----------|----------|
| Missing feature id | User error | Ask for `plan <featureId>` or switch feature context before rerunning |
| Unsupported `--track` argument | User error | Block; explain that track is read from `feature.yaml` and cannot be changed here |
| Track is `full`, `quickplan`, `hotfix`, or `tech-change` | User error | Block with the state-gate message and next command |
| Express track with non-`expressplan` phase | User error | Block with the state-gate message and next command |
| Config, feature-yaml, docs path, constitution, validator, QuickPlan, or review tool fails | Command failure | Surface the tool/read error, state that no feature state changed, and ask the user to fix the failure before rerunning |
| Review verdict is `fail` | Gate failure | Stop; do not update `feature.yaml.phase` |

## Completion Artifacts

| Artifact | Owner |
|----------|-------|
| `business-plan.md` | QuickPlan delegation |
| `tech-plan.md` | QuickPlan delegation |
| `sprint-plan.md` | QuickPlan delegation |
| `expressplan-adversarial-review.md` | `bmad-lens-adversarial-review` |

## Integration Points

| Skill / Component | Role |
|-------------------|------|
| `bmad-lens-feature-yaml` | Resolve feature context and update phase only after the review gate passes |
| `bmad-lens-batch` | Shared two-pass intake for `--mode batch` |
| `bmad-lens-init-feature` | Cross-feature context loading |
| `bmad-lens-constitution` | Domain constitution loading |
| `bmad-lens-quickplan` | Owns express planning artifact authoring |
| `bmad-lens-adversarial-review` | Party-mode adversarial completion gate |