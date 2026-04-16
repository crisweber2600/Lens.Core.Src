mode: agent
description: "Initialize a new project within an existing or new workstream"

Load and follow the skill at: `lens.core/_bmad/lens-work/skills/bmad-lens-init-feature/SKILL.md`

The user wants to initialize a new **project** — not a milestone. This means:
1. Create the project marker at `{governance_repo}/milestones/{workstream}/{project}/project.yaml` (and parent `workstream.yaml` if absent)
2. Create a project-level `constitution.md` at `{governance_repo}/constitutions/{workstream}/{project}/constitution.md` inheriting from the workstream constitution (create workstream constitution too if absent)
3. If `{target_projects_path}` is configured, scaffold `{target_projects_path}/{workstream}/{project}/` by passing `--target-projects-root {target_projects_path}` to the `create-service` subcommand
4. If `{output_folder}` is configured, scaffold `{output_folder}/{workstream}/{project}/` by passing `--docs-root {output_folder}` to the `create-service` subcommand
5. Pass `--personal-folder {personal_output_folder}` to the `create-service` subcommand so that `context.yaml` is written to the personal folder with the new workstream and project as the active context
6. Do NOT create milestone branches or milestone.yaml — project initialization is governance-only

Use the `create-service` subcommand of `skills/bmad-lens-init-feature/scripts/init-feature-ops.py` with `--execute-governance-git`.
Report governance git success, include the returned `governance_commit_sha` when present, and only surface any `remaining_git_commands` for manual workspace scaffold follow-up.