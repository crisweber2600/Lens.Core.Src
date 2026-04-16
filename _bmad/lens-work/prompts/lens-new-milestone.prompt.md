mode: agent
description: "Initialize a new milestone with 2-branch topology, milestone YAML, and PR"

Load and follow the skill at: `lens.core/_bmad/lens-work/skills/bmad-lens-init-feature/SKILL.md`

The user wants to initialize a new **milestone**. This means:
1. Create a 2-branch topology (`{milestoneId}` and `{milestoneId}-plan`) in the control repo
2. Commit `milestone.yaml` to governance `main` under `milestones/{workstream}/{project}/{milestoneId}/milestone.yaml`
3. Register the milestone in `milestone-index.yaml` on `main`
4. Create a `summary.md` stub on `main` under `milestones/{workstream}/{project}/{milestoneId}/summary.md`
5. For non-`express` tracks: open a PR from the plan branch to the milestone branch in the control repo
6. For `express` track: defer the planning PR until planning artifacts exist on the plan branch
7. After creation, report the returned `starting_phase` and recommend `/next` or the returned `recommended_command`; never hardcode `/quickplan`

Apply progressive disclosure — ask only for milestone name, workstream, and project upfront; derive `milestoneId` and validate against `milestone-index.yaml`; then require the user to choose a track explicitly before writing anything.

Use the `create` subcommand of `skills/bmad-lens-init-feature/scripts/init-feature-ops.py` with `--execute-governance-git`.
Report governance git success, include the returned `governance_commit_sha` when present, and only surface any `remaining_git_commands` plus `gh_commands` for manual follow-up.
Execute the returned branch-creation command exactly as provided; do not replace it with manual `git checkout -b` steps, because it resolves the control repo default branch before creating `{milestoneId}` and `{milestoneId}-plan`.
If governance git preflight or execution fails, stop and surface the error; do not provide a manual governance git recipe.