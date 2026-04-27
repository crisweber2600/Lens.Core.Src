---
name: bmad-lens-init-feature
description: Create Lens governance containers for domains, services, and features. For new-domain, invoke create-domain. For new-service, invoke create-service.
---

# bmad-lens-init-feature

## Overview

Owns the shared container initialization behavior used by `new-domain`, `new-service`, and `new-feature`.

For `new-domain`, this skill delegates to `scripts/init-feature-ops.py create-domain`.
For `new-service`, this skill delegates to `scripts/init-feature-ops.py create-service`.

## On Activation

1. If user passed `setup` or `configure`, load `./assets/module-setup.md` and complete registration before any other action.
2. If module config section `lens` is missing in `{project-root}/_bmad/config.yaml`, load `./assets/module-setup.md` and complete registration before continuing.
3. Otherwise continue to the requested intent flow.

## new-domain Intent Flow

1. Resolve config values:
- `governance_repo`
- `target_projects_path` (optional)
- `output_folder` (optional)
- `personal_output_folder` (required for context write)

2. Ask user for display name. This is the only required interactive input before slug confirmation.

3. Derive slug candidate and confirm:
- slug derivation rules:
  - trim leading/trailing whitespace
  - lowercase
  - replace spaces and non-alphanumeric characters with `-`
  - collapse consecutive `-`
  - strip leading/trailing `-`
  - validate against `SAFE_ID_PATTERN` from `scripts/init-feature-ops.py`
- show: `Domain slug will be: {slug}. Proceed? [Y/n/edit]`
- on `Y`: invoke `create-domain`
- on `n`: cancel without invoking the script
- on `edit`: ask manual slug, validate against `SAFE_ID_PATTERN`, then confirm again
- if derived slug is invalid or empty, ask for a manual slug before invocation

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
- never report success unless the script returned `status: pass` and exit code 0

## Non-Negotiables

- Keep `create-domain` logic in this shared skill (do not split to a dedicated `bmad-lens-new-domain` skill).
- `context.yaml` is always written after successful create-domain (resolved or explicit personal folder).
- Duplicate check order with auto git: validate -> sync -> duplicate check -> write.

## new-service Intent Flow

1. Resolve config values:
- `governance_repo`
- `target_projects_path` (optional)
- `output_folder` (optional)
- `personal_output_folder` (required for context write)

2. Resolve parent domain. If active context does not supply a domain, ask the user for it before asking for the service name.

3. Ask user for service display name.

4. Derive service slug candidate and confirm:
- apply the same slug derivation rules as `new-domain`
- show: `Service slug will be: {slug}. Proceed? [Y/n/edit]`
- on `Y`: invoke `create-service`
- on `n`: cancel without invoking the script
- on `edit`: ask manual slug, validate against `SAFE_ID_PATTERN`, then confirm again

5. If the parent domain marker or domain constitution is absent in the governance repo, `create-service` will auto-create them by calling `create-domain` helpers — inform the user this will happen before invoking.

6. Invoke:

```bash
uv run _bmad/lens-work/skills/bmad-lens-init-feature/scripts/init-feature-ops.py create-service \
  --governance-repo "{governance_repo}" \
  --domain "{domain_slug}" \
  --service "{service_slug}" \
  --name "{display_name}" \
  --username "{user_name}" \
  --personal-folder "{personal_output_folder}" \
  [--target-projects-root "{target_projects_path}"] \
  [--docs-root "{output_folder}"] \
  [--execute-governance-git] \
  [--dry-run]
```

7. Present results:
- on pass + auto git: show `governance_commit_sha`; if parent domain was created, note `created_domain_marker: true`
- on pass + manual git: show `remaining_git_commands`
- on fail: show `error` field verbatim
- never report success unless the script returned `status: pass` and exit code 0

**Service-container boundary (non-negotiable):** `create-service` must never create `feature.yaml`, `summary.md`, feature-index entries, or control branches. If the script output contains any of those fields set to a path, treat it as a failure.
