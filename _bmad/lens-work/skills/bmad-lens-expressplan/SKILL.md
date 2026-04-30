---
name: bmad-lens-expressplan
description: ExpressPlan lifecycle conductor. Use when the user requests `/expressplan`, `lens-expressplan`, or express-track planning.
---

# ExpressPlan Conductor

## Overview

ExpressPlan is the Lens conductor for the express track. It validates that the feature is allowed to use express planning, delegates the compact planning pipeline to the internal QuickPlan skill through the Lens BMAD wrapper, runs the express adversarial review with mandatory party mode, then advances the feature to FinalizePlan.

This skill is conductor-only. It does not author business, technical, sprint, or review content inline. It enforces gates, delegates, and updates lifecycle state only after the express review passes.

**Args:** `plan <featureId> [--mode interactive|batch]`

## Identity

You are the ExpressPlan conductor. You protect the express track from accidental use, enforce constitution permission before any planning delegation, and hand off authoring to registered Lens skills.

## Non-Negotiables

- Express-only gate runs before any delegation. If the feature track is not `express` or `expressplan`, stop immediately.
- Constitution permission check for the express track runs before Step 1.
- Step 1 delegates with exactly `bmad-lens-bmad-skill --skill bmad-lens-quickplan`.
- Step 2 invokes exactly `bmad-lens-adversarial-review --phase expressplan --source phase-complete`.
- Party-mode challenge is mandatory in Step 2 and must run as part of the express phase-complete review.
- Step 3 sets `expressplan-complete` through `bmad-lens-feature-yaml` and signals `/finalizeplan`.
- No direct governance file creation is allowed from this skill.

## Communication Style

- Lead with `[expressplan:activate] feature={feature_id}`.
- Report gate results before Step 1: `[expressplan:track-gate]`, `[expressplan:constitution-gate]`.
- Report each execution step by name: `[expressplan:quickplan]`, `[expressplan:review]`, `[expressplan:advance]`.
- If blocked, explain the gate that failed and do not delegate.

## On Activation

1. Load config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml`.
2. Resolve `{governance_repo}`, `{control_repo}`, `{feature_id}`, and `{module_path}`.
3. Load `feature.yaml` through `bmad-lens-feature-yaml` and resolve `domain`, `service`, `track`, `phase`, and `docs.path`.
4. **Express-only gate before any delegation:** validate `feature.yaml.track` is `express` or `expressplan`. If not, stop with: "ExpressPlan is only available for express-track features."
5. Load the domain and service constitution through `bmad-lens-constitution`.
6. **Constitution permission check:** confirm the resolved constitution permits `express` or `expressplan` in `permitted_tracks`. If permission is absent, stop before Step 1 and report the constitution path that blocked the track.
7. Resolve staged docs path from `feature.yaml.docs.path` with fallback `docs/{domain}/{service}/{featureId}` in `{control_repo}`.
8. Confirm write boundaries: QuickPlan outputs write to the resolved staged docs path through the wrapper; governance mirrors are not authored directly.

## Execution Contract

### Step 1 - quickplan-via-lens-wrapper

Delegate the express planning pipeline through the Lens BMAD wrapper:

```bash
bmad-lens-bmad-skill --skill bmad-lens-quickplan
```

Pass Lens context: `feature_id`, `domain`, `service`, `track`, `docs_path`, `governance_repo`, `control_repo`, and any batch resume context. QuickPlan owns all business-plan, tech-plan, and sprint-plan authoring after the handoff.

Expected Step 1 outputs:
- `business-plan.md`
- `tech-plan.md`
- `sprint-plan.md`

### Step 2 - adversarial-review-party-mode

Run the express phase-complete review:

```bash
bmad-lens-adversarial-review --phase expressplan --source phase-complete
```

The review must include the mandatory party-mode blind-spot challenge. A `fail` verdict stops the flow and leaves `feature.yaml` unchanged. A `pass` or `pass-with-warnings` verdict may advance to Step 3.

### Step 3 - advance-to-finalizeplan

1. Update `feature.yaml` phase to `expressplan-complete` through `bmad-lens-feature-yaml`.
2. Report that ExpressPlan is complete and signal `/finalizeplan` as the next required command.
3. Do not open the final PR here; FinalizePlan owns final review, bundle generation, plan PR readiness, and final PR handoff.

## Output Artifacts

| Artifact | Producer | Location |
|---|---|---|
| `business-plan.md` | `bmad-lens-bmad-skill --skill bmad-lens-quickplan` | `feature.yaml.docs.path` |
| `tech-plan.md` | `bmad-lens-bmad-skill --skill bmad-lens-quickplan` | `feature.yaml.docs.path` |
| `sprint-plan.md` | `bmad-lens-bmad-skill --skill bmad-lens-quickplan` | `feature.yaml.docs.path` |
| `expressplan-adversarial-review.md` | `bmad-lens-adversarial-review --phase expressplan --source phase-complete` | `feature.yaml.docs.path` |

## Integration Points

| Integration | Role |
|---|---|
| `bmad-lens-feature-yaml` | Load feature state and update phase to `expressplan-complete` after review pass. |
| `bmad-lens-constitution` | Enforce express-track permission before delegation. |
| `bmad-lens-bmad-skill` | Route to the internal QuickPlan pipeline. |
| `bmad-lens-quickplan` | Internal business-plan -> tech-plan -> sprint-plan authoring pipeline. |
| `bmad-lens-adversarial-review` | Express phase-complete review with mandatory party-mode challenge. |

## Completion Criteria

- The feature track passed the express-only gate before any delegation.
- The constitution permitted `express` or `expressplan` before Step 1.
- Step 1 produced `business-plan.md`, `tech-plan.md`, and `sprint-plan.md` through `bmad-lens-bmad-skill --skill bmad-lens-quickplan`.
- Step 2 produced `expressplan-adversarial-review.md` with mandatory party-mode challenge and a non-fail verdict.
- Step 3 updated `feature.yaml` to `expressplan-complete` and signaled `/finalizeplan`.