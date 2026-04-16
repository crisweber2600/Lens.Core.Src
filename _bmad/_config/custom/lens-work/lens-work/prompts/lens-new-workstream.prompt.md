mode: agent
description: "Initialize a new workstream in the governance structure"

Load and follow the skill at: `lens.core/_bmad/lens-work/skills/bmad-lens-init-feature/SKILL.md`

The user wants to initialize a new **workstream** — not a milestone. This means:
1. Create the workstream marker at `{governance_repo}/milestones/{workstream}/workstream.yaml`
2. Create a workstream-level `constitution.md` at `{governance_repo}/constitutions/{workstream}/constitution.md` with defaults
3. If `{target_projects_path}` is configured, scaffold `{target_projects_path}/{workstream}/` by passing `--target-projects-root {target_projects_path}` to the `create-domain` subcommand
4. If `{output_folder}` is configured, scaffold `{output_folder}/{workstream}/` by passing `--docs-root {output_folder}` to the `create-domain` subcommand
5. Pass `--personal-folder {personal_output_folder}` to the `create-domain` subcommand so that `context.yaml` is written to the personal folder with the new workstream as the active context (project will be set to null)
6. Do NOT create milestone branches or milestone.yaml — workstream initialization is governance-only

Use the `create-domain` subcommand of `skills/bmad-lens-init-feature/scripts/init-feature-ops.py` with `--execute-governance-git`.
Report governance git success, include the returned `governance_commit_sha` when present, and only surface any `remaining_git_commands` for manual workspace scaffold follow-up.