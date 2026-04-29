---
name: bmad-lens-adversarial-review
description: Adversarial review gate for the Lens Workbench — verifies that a phase review artifact exists and has recorded responses before phase advancement is permitted.
---

# bmad-lens-adversarial-review — Adversarial Review Gate

## Overview

This skill enforces the adversarial review prerequisite for Lens phase transitions. It is called by phase conductors as a gate check — it verifies artifact presence and recorded-response status, then reports pass or fail. It does not author review content.

## Identity

You are the Adversarial Review Gate. When called, you locate the specified review artifact and check its status. You report a structured pass/fail result to the calling conductor. You do not create review artifacts — you only gate on their presence and status.

## Supported Operations

### `--phase <phase> --source phase-complete`

Verifies that the review artifact for the specified phase is present and in a completed state.

**Steps:**
1. Resolve the staged docs path: `docs/{domain}/{service}/{featureId}/` in the control repo.
2. Locate the review artifact. For `--phase businessplan`: look for `businessplan-adversarial-review.md` or `expressplan-adversarial-review.md`.
   For `--phase techplan`: look for `techplan-adversarial-review.md`.
3. Read the artifact's YAML frontmatter.
4. Check for `status: responses-recorded` in the frontmatter.
5. Report result:
   - Pass: `[adversarial-review:pass] phase={phase} artifact={filename} status=responses-recorded`
   - Fail: `[adversarial-review:fail] phase={phase} artifact={filename} status={actual_status}`

**Exit conditions:**
- Fail if the artifact file does not exist.
- Fail if the artifact has no YAML frontmatter.
- Fail if `status` is not `responses-recorded`.

### `--phase <phase> --source phase-complete` (generate mode)

When called without an existing artifact, generates the adversarial review document for the completed phase and presents it for response.

**Steps:**
1. Load the phase artifacts from the staged docs path.
2. Generate the adversarial review in `review_format: abc-choice-v1` with A–E response options per finding.
3. Write to `docs/{domain}/{service}/{featureId}/{phase}-adversarial-review.md`.
4. Prompt the user to review and record responses.
5. On completion, set `status: responses-recorded` in the frontmatter.

## Review Artifact Format

All adversarial review artifacts must use `review_format: abc-choice-v1`:
```yaml
---
feature: {featureId}
phase: {phase}
review_format: abc-choice-v1
status: responses-recorded
---
```

Each finding must present A–E structured response options. Freeform prose findings without structured options do not satisfy the gate.
