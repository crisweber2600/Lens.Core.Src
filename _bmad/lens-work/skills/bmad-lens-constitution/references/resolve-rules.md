# Resolve Rules

Resolves the effective governance constitution for a domain, service, and optional repo scope by merging the org -> domain -> service -> repo hierarchy over defaults.

## Script Usage

```bash
uv run scripts/constitution-ops.py resolve \
  --governance-repo /path/to/governance-repo \
  --domain platform \
  --service auth \
  [--repo my-repo]
```

## Output Shape

```json
{
  "domain": "platform",
  "service": "auth",
  "repo": null,
  "levels_loaded": ["org", "domain", "service"],
  "full_constitution_available": true,
  "resolved_constitution": {
    "permitted_tracks": ["quickplan", "full", "express"],
    "required_artifacts": {
      "planning": ["business-plan", "tech-plan"],
      "dev": ["stories"]
    },
    "gate_mode": "informational",
    "sensing_gate_mode": "informational",
    "additional_review_participants": ["security-team"],
    "enforce_stories": true,
    "enforce_review": true
  },
  "warnings": []
}
```

## Key Behaviors

- Missing org, domain, service, or repo constitution files append `level_absent` warnings and continue.
- Empty hierarchies return defaults, `levels_loaded: []`, `full_constitution_available: false`, and a `no_levels_loaded` warning.
- Malformed frontmatter fails safely with exit code 1 and a `constitution_parse_error` payload.
- Unknown keys are surfaced through `unknown_constitution_keys` warnings and ignored.
- Invalid slugs and traversal attempts fail with exit code 1 before unsafe path access.
- The command is read-only and does not create or update governance files.

## Merge Strategy

| Field | Strategy |
|-------|----------|
| `permitted_tracks` | Intersection across loaded levels. Defaults include `express`. |
| `required_artifacts` | Union per phase bucket, deduplicated. |
| `gate_mode` | Strongest wins; `hard` beats `informational`. |
| `sensing_gate_mode` | Strongest wins; `hard` beats `informational`. |
| `additional_review_participants` | Union, deduplicated. |
| `enforce_stories` | True wins. |
| `enforce_review` | True wins. |

When `enforce_stories=true`, `stories` is present in `required_artifacts.dev`.

## Defaults

```yaml
permitted_tracks: [quickplan, full, express, hotfix, tech-change]
required_artifacts:
  planning: [business-plan, tech-plan]
  dev: [stories]
gate_mode: informational
sensing_gate_mode: informational
additional_review_participants: []
enforce_stories: false
enforce_review: false
```

## Warning Types

| Warning type | Trigger |
|--------------|---------|
| `level_absent` | A hierarchy file is missing. |
| `no_levels_loaded` | No constitution files were loaded. |
| `unknown_constitution_keys` | Frontmatter contains unsupported keys. |
| `unknown_gate_mode` | `gate_mode` is not `hard` or `informational`. |
| `unknown_sensing_gate_mode` | `sensing_gate_mode` is not `hard` or `informational`. |
| `unknown_tracks` | `permitted_tracks` contains unsupported track values. |
| `empty_permitted_tracks` | Track intersection resolves to an empty list. |
