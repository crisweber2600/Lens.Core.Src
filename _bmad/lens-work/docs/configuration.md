# Configuration

LENS uses a layered configuration model so you can start with sane defaults and override only what you need.

---

## Configuration Sources (Priority Order)

1. **Workflow inputs (session-only):** Values provided during a workflow run.
2. **Project overrides:** `_bmad/lens-work/config.yaml` in the target repository.
3. **Module defaults:** `_bmad/lens-work/module-config.yaml`.

If a key is missing in a higher-priority layer, LENS falls back to the next layer.

---

## Supported Options

### `branch_patterns`
Patterns used to infer lens from git branch names.

- `domain`: patterns for domain-level branches
- `service`: patterns for service-level branches
- `microservice`: patterns for microservice-level branches
- `feature`: patterns for feature-level branches

Supported placeholders:
- `{name}` for the current entity name
- `{service}` for the parent service name
- `{microservice}` for the parent microservice name

### `notification_level`
Controls how verbose LENS is during detection and switching.

- `silent`: only critical messages
- `smart`: concise summaries (default)
- `verbose`: full detail

### `session_store`
Path to the lens session state file.

Default: `_bmad-output/lens-work/state.yaml`

---

## Example Project Override

```yaml
branch_patterns:
  domain:
    - main
    - develop
  service:
    - service/{name}
  microservice:
    - service/{service}/{name}
  feature:
    - feature/{service}/{microservice}/{name}
notification_level: smart
session_store: "_bmad-output/lens-work/state.yaml"
```

---

## Override Rules

- Keys not present in `_bmad/lens-work/config.yaml` fall back to module defaults.
- For `branch_patterns`, each lens group (`domain`, `service`, `microservice`, `feature`) is replaced when provided.
- Use the `lens-configure` workflow to generate or update the project override file.
