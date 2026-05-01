---
name: bmad-lens-split-feature
description: Feature splitting workflow. Use when carving stories into a new feature, validating a split boundary, or moving story files after a split.
---

# Feature Splitter

## Overview

This skill provides the minimum split-feature baseline for the new clean-room repo: validate whether selected stories are split-safe, create the new governance feature shell, and move story files into the new feature.

The hard rule is simple: a story that is already in progress cannot be split. Validation runs first, creation runs second, and story moves stop if any selected story is in progress.

## Capabilities

| Capability | Route |
| ---------- | ----- |
| Validate Split | Load ./references/validate-split.md |
| Create Split Feature | Load ./references/split-scope.md |
| Move Stories | Load ./references/split-stories.md |

## Script Reference

./scripts/split-feature-ops.py exposes three subcommands:

```bash
uv run --script ./_bmad/lens-work/skills/bmad-lens-split-feature/scripts/split-feature-ops.py \
  validate-split \
  --sprint-plan-file /path/to/sprint-plan.md \
  --story-ids "story-1,story-2"

uv run --script ./_bmad/lens-work/skills/bmad-lens-split-feature/scripts/split-feature-ops.py \
  create-split-feature \
  --governance-repo /path/to/governance \
  --source-feature-id auth-login \
  --source-domain platform \
  --source-service identity \
  --new-feature-id auth-mfa \
  --new-name "MFA Authentication" \
  --track quickplan \
  --username cweber

uv run --script ./_bmad/lens-work/skills/bmad-lens-split-feature/scripts/split-feature-ops.py \
  move-stories \
  --governance-repo /path/to/governance \
  --source-feature-id auth-login \
  --source-domain platform \
  --source-service identity \
  --target-feature-id auth-mfa \
  --target-domain platform \
  --target-service identity \
  --story-ids "story-3,story-4"
```

## Guardrails

- Normalize status values before checking whether a story is in progress.
- Fail fast on duplicate feature ids already registered in feature-index.yaml.
- Create the new feature shell before any story move is attempted.
- Keep governance writes local to the supplied governance repo path.