---
description: 'Bug intake + quick-dev handoff — captures one bug report and routes it through quick-dev implementation with branch/PR workflow.'
---

# /lens-bug-reporter

Use this prompt as the entry controller for `/lens-bug-reporter`.

## Prompt-Start Sync

Before collecting bug details or running any command:

1. Check whether this invocation already includes a successful run of `uv run ./lens.core/_bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py` from the workspace root.
2. If not, run it now from the workspace root.
3. If it exits non-zero, stop and surface the error.

## Inputs (required)

Collect one bug report per run with these fields:

- `title`
- `description`
- `repro_steps`
- `expected`
- `actual`

If any field is missing, stop and ask only for missing fields.

## Bug Artifact

Create the governance bug artifact first:

```bash
uv run --script lens.core/_bmad/lens-work/scripts/bug-reporter-ops.py create-bug \
	--title "{title}" \
	--description "{description}\n\nRepro Steps:\n{repro_steps}\n\nExpected:\n{expected}\n\nActual:\n{actual}" \
	--chat-log "Bug report submitted via /lens-bug-reporter quick-dev intake." \
	--governance-repo {project-root}/TargetProjects/lens/lens-governance
```

If script status is `duplicate`, continue to quick-dev using the same bug report.

## Quick-Dev Delegation

Load `d:/lensTrees/Lens.Core.control copy/.github/skills/bmad-quick-dev/SKILL.md` and follow it.

Use this implementation intent:

"Fix the bug in target project `TargetProjects/lens-dev/new-codebase/lens.core.src` using this bug report:
Title: {title}
Description: {description}
Repro Steps: {repro_steps}
Expected: {expected}
Actual: {actual}

Execution requirements:
1) In target project, checkout `develop`.
2) Pull latest `develop`.
3) Create a new feature branch named from bug title slug.
4) Implement and verify the fix.
5) Commit changes with a conventional commit message.
6) Push branch to origin.
7) Create a pull request to `develop` and include bug context in PR body."

## Output Contract

Return:

- bug artifact path
- created branch name
- commit hash
- PR URL
- short change summary
