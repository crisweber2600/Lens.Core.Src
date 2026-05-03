---
feature: lens-dev-new-codebase-dogfood
doc_type: retained-command-parity-map
story_id: E1-S1
status: draft
updated_at: 2026-05-01T00:00:00Z
---

# Retained Command Parity Map

## Scope

This map inventories the 17 retained public Lens commands in `lens.core.src` on `feature/dogfood`. `QuickPlan` is intentionally excluded because it is not a retained public command for this story.

The inventory is based on the live target repo file tree only:

- Public stub path: `.github/prompts/lens-{command}.prompt.md`
- Release prompt path: `{project-root}/lens.core/_bmad/lens-work/prompts/lens-{command}.prompt.md`
- Owner path: command owner `SKILL.md`, except `preflight`, which uses its live fallback script because this target tree has no `lens-preflight/SKILL.md`

## Clean-Room Traceability

No files or prose were copied from `D:/Lens.Core.Control - Copy/lens.core`. This parity map was authored from the dogfood story, baseline acceptance criteria, observed command outputs, allowed command inventories, and the live `lens.core.src` target file tree. Behavior is reproduced from baseline acceptance criteria and observed outputs, not by copying source repo implementation files or text.

## Status Rules

Artifact states use `present` when the listed path exists in the target repo and `missing` when it does not.

Target status is derived from the three artifact states:

- `present`: public stub, release prompt, and owner path are all present.
- `partial`: at least one artifact is present, but not all three.
- `missing`: none of the three artifacts is present.

## Inventory

| command | public_stub_path | public_stub_state | release_prompt_path | release_prompt_state | owner_path | owner_state | target_status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preflight | `.github/prompts/lens-preflight.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-preflight.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py` | present | partial |
| new-domain | `.github/prompts/lens-new-domain.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-new-domain.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-init-feature/SKILL.md` | present | present |
| new-service | `.github/prompts/lens-new-service.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-new-service.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-init-feature/SKILL.md` | present | present |
| new-feature | `.github/prompts/lens-new-feature.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-new-feature.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-init-feature/SKILL.md` | present | partial |
| switch | `.github/prompts/lens-switch.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-switch.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-switch/SKILL.md` | present | present |
| next | `.github/prompts/lens-next.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-next.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-next/SKILL.md` | present | present |
| preplan | `.github/prompts/lens-preplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-preplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-preplan/SKILL.md` | present | present |
| businessplan | `.github/prompts/lens-businessplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-businessplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-businessplan/SKILL.md` | present | present |
| techplan | `.github/prompts/lens-techplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-techplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-techplan/SKILL.md` | present | present |
| finalizeplan | `.github/prompts/lens-finalizeplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-finalizeplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-finalizeplan/SKILL.md` | present | present |
| expressplan | `.github/prompts/lens-expressplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-expressplan.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-expressplan/SKILL.md` | present | present |
| dev | `.github/prompts/lens-dev.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-dev.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/skills/lens-dev/SKILL.md` | missing | missing |
| complete | `.github/prompts/lens-complete.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-complete.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-complete/SKILL.md` | present | partial |
| split-feature | `.github/prompts/lens-split-feature.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-split-feature.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/skills/lens-split-feature/SKILL.md` | missing | missing |
| constitution | `.github/prompts/lens-constitution.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-constitution.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/skills/lens-constitution/SKILL.md` | present | partial |
| discover | `.github/prompts/lens-discover.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-discover.prompt.md` | present | `{project-root}/lens.core/_bmad/lens-work/skills/lens-discover/SKILL.md` | present | present |
| upgrade | `.github/prompts/lens-upgrade.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/prompts/lens-upgrade.prompt.md` | missing | `{project-root}/lens.core/_bmad/lens-work/skills/lens-upgrade/SKILL.md` | missing | missing |

## Summary

- `present`: 10 commands
- `partial`: 4 commands
- `missing`: 3 commands

Run `python docs/lens-dev/new-codebase/lens-dev-new-codebase-dogfood/validate-retained-command-parity.py` from the target repo root to compare this map with the live file tree.