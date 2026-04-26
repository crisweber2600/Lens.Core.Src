---
name: bmad-lens-init-feature
description: Create Lens governance containers for domains, services, and features. For new-domain, invoke create-domain behavior.
---

# bmad-lens-init-feature

## Overview

Owns the shared container initialization behavior used by `new-domain`, `new-service`, and `new-feature`.

For `new-domain`, this skill delegates to `scripts/init-feature-ops.py create-domain`.

## new-domain Intent Flow

1. Resolve config values:
- `governance_repo`
- `target_projects_path` (optional)
- `output_folder` (optional)
- `personal_output_folder` (required for context write)

2. Ask user for display name.

3. Derive slug candidate and confirm:
- show: `Domain slug will be: {slug}. Proceed? [Y/n/edit]`
- on `edit`, ask manual slug and re-validate

4. Invoke:

```bash
uv run _bmad/lens-work/skills/bmad-lens-init-feature/scripts/init-feature-ops.py create-domain \
  --governance-repo "{governance_repo}" \
  --domain "{slug}" \
  --name "{display_name}" \
  --username "{user_name}" \
  --personal-folder "{personal_output_folder}" \
  [--target-projects-root "{target_projects_path}"] \
  [--docs-root "{output_folder}"] \
  [--execute-governance-git] \
  [--dry-run]
```

5. Present results:
- on pass + auto git: show `governance_commit_sha`
- on pass + manual git: show `remaining_git_commands`
- on fail: show `error` field verbatim

## Non-Negotiables

- Keep `create-domain` logic in this shared skill (do not split to a dedicated `bmad-lens-new-domain` skill).
- `context.yaml` is always written after successful create-domain (resolved or explicit personal folder).
- Duplicate check order with auto git: validate -> sync -> duplicate check -> write.
