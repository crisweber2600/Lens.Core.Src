# Validate Compliance

Checks a feature against its resolved constitution. The command reads a local `feature.yaml`, optional artifact directory, and the governance constitution hierarchy. It never writes governance state, feature state, or artifacts.

## Script Usage

```bash
uv run scripts/constitution-ops.py check-compliance \
  --governance-repo /path/to/governance-repo \
  --feature-id auth-sso \
  --feature-yaml /tmp/auth-sso.yaml \
  --artifacts-path /tmp/auth-sso-artifacts \
  --phase planning
```

`--phase` must be one of `planning`, `dev`, or `complete`.

## Output Shape

```json
{
  "feature_id": "auth-sso",
  "domain": "platform",
  "service": "auth",
  "track": "express",
  "phase": "planning",
  "status": "PASS",
  "compliance_summary": "PASS",
  "constitution_scope": {
    "domain": "platform",
    "service": "auth",
    "repo": null,
    "levels_loaded": ["org", "domain"]
  },
  "checks": [],
  "hard_failures": [],
  "hard_gate_failures": [],
  "informational_failures": [],
  "warnings": []
}
```

`hard_gate_failures` remains as a compatibility alias for older callers. New callers may use `hard_failures`.

## Checks Performed

| Check | Condition |
|-------|-----------|
| Track permitted | Feature `track` must be in resolved `permitted_tracks`, including `express` when permitted. |
| Required artifacts | Every artifact in `required_artifacts[phase]` must exist when `--artifacts-path` is supplied. |
| Review enforcement | If `enforce_review=true`, `additional_review_participants` must be non-empty. |
| Stories enforcement | If `enforce_stories=true` in dev phase, a stories artifact must be present. |

Artifact search checks `{artifact}.md`, `{artifact}.yaml`, and `{artifact}`.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks pass, only informational failures exist, or artifact checks are incomplete because no artifact path was supplied. |
| 1 | Script/input error, including malformed feature YAML, invalid feature YAML shape or field types, or malformed constitution frontmatter. |
| 2 | At least one hard-gate compliance failure. |

## Status Values

| Status | Meaning |
|--------|---------|
| `PASS` | All checks passed or all failures are informational. |
| `INCOMPLETE` | Required artifact checks were skipped because no `--artifacts-path` was provided. |
| `FAIL` | At least one hard-gate check failed. |

## Sparse Hierarchies

Compliance reuses `resolve`; missing constitution levels are carried into the compliance payload as warnings. Missing levels do not fail compliance by themselves.
