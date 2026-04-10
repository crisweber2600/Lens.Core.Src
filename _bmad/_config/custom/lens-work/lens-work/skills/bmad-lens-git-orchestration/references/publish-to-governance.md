# publish-to-governance

## Outcome

Reviewed planning artifacts that already exist in the control repo docs path are copied into the feature's governance docs mirror. The operation reports exactly what was published and what was missing.

## Preconditions

- `feature.yaml` exists for the feature in the governance repo
- The control repo has staged planning docs under `feature.yaml.docs.path` or the fallback docs path
- The caller provides a valid phase (`preplan`, `businessplan`, `techplan`, `devproposal`, `sprintplan`, or `expressplan`)

## Process

1. Resolve `control_docs_path` from `feature.yaml.docs.path` or fallback to `docs/{domain}/{service}/{featureId}`
2. Resolve `governance_docs_path` from `feature.yaml.docs.governance_docs_path` or fallback to `features/{domain}/{service}/{featureId}/docs`
3. Expand the phase into the expected artifact filenames unless explicit `--artifact` values were provided
4. Copy all existing non-empty files for those artifacts into `governance_docs_path`
5. Return `published_files`, `copied_from`, and `missing_artifacts`

## Output

```json
{
  "feature_id": "auth-login",
  "phase": "preplan",
  "requested_artifacts": ["product-brief", "research", "brainstorm"],
  "control_docs_path": "/repo/docs/platform/identity/auth-login",
  "governance_docs_path": "/governance/features/platform/identity/auth-login/docs",
  "copied_from": [
    "/repo/docs/platform/identity/auth-login/product-brief.md"
  ],
  "published_files": [
    "/governance/features/platform/identity/auth-login/docs/product-brief.md"
  ],
  "missing_artifacts": ["research", "brainstorm"],
  "dry_run": false
}
```

Missing artifacts are reported explicitly so the phase conductor can decide whether to continue, pause, or ask the human for clarification.