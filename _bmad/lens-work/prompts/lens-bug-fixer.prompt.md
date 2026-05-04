---
description: 'Bug fix orchestration — accepts a bug report and executes quick-dev implementation flow in target project with branch/commit/push/PR.'
---

# /lens-bug-fixer

Use this prompt as the execution controller for `/lens-bug-fixer` when the user provides a bug report.

## Prompt-Start Sync

Before any implementation action:

1. Ensure `uv run ./lens.core/_bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py` has run successfully for this invocation.
2. If not, run it from the workspace root.
3. On non-zero exit, stop and surface the error.

## Inputs (required)

Collect/confirm these bug report fields:

- `title`
- `description`
- `repro_steps`
- `expected`
- `actual`

If any field is missing, stop and ask only for the missing fields.

## Quick-Dev Execution

Load `d:/lensTrees/Lens.Core.control copy/.github/skills/bmad-quick-dev/SKILL.md` and follow it.

Use this exact implementation intent:

"Resolve the following bug report in `TargetProjects/lens-dev/new-codebase/lens.core.src`.
Title: {title}
Description: {description}
Repro Steps: {repro_steps}
Expected: {expected}
Actual: {actual}

Required git workflow:
1) `git checkout develop`
2) `git pull`
3) `git checkout -b feature/bugfix-{bug-title-slug}`
4) Make the fix and run relevant validation
5) `git add` + `git commit` with conventional message
6) `git push -u origin <branch>`
7) Open a PR targeting `develop` with bug report details and validation notes"

## Optional Bug Lifecycle Update

If `bug_slug` is provided and governance state updates are requested, invoke:

```bash
uv run --script lens.core/_bmad/lens-work/scripts/bug-fixer-ops.py move-to-fixed \
	--governance-repo {project-root}/TargetProjects/lens/lens-governance \
	--slugs {bug_slug}
```

## Output Contract

Return:

- selected/created branch name
- list of changed files
- commit hash
- PR URL
- validation results
