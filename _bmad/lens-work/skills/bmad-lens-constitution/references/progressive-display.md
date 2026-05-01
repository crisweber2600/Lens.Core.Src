# Progressive Display

Returns a context-filtered view of the resolved constitution for the current phase and/or track. It is a presentation layer over `resolve`, not a second resolver.

## Script Usage

```bash
uv run scripts/constitution-ops.py progressive-display \
  --governance-repo /path/to/governance-repo \
  --domain platform \
  --service auth \
  [--repo api] \
  [--phase planning] \
  [--track express]
```

`--track` accepts `quickplan`, `full`, `express`, `hotfix`, and `tech-change`.

## Base Output

```json
{
  "domain": "platform",
  "service": "auth",
  "levels_loaded": ["org", "domain", "service"],
  "gate_mode": "informational",
  "sensing_gate_mode": "informational",
  "additional_review_participants": ["security-team"],
  "enforce_stories": true,
  "enforce_review": true,
  "full_constitution_available": true,
  "warnings": []
}
```

When `--phase` is provided, output adds `required_artifacts_for_phase`.

When `--track` is provided, output adds `track_permitted` and `permitted_tracks`.

## Sparse Hierarchies

Missing hierarchy levels are shown through propagated `warnings`. `full_constitution_available` is `false` whenever the org level is absent. Sparse hierarchies still return exit code 0 unless input is malformed or unsafe.

## Display Logic

| Context | Additional output |
|---------|-------------------|
| Phase provided | `required_artifacts_for_phase` for that phase. |
| Track provided | `track_permitted` plus `permitted_tracks`. |
| Both provided | Both phase and track views. |
| Neither provided | Gate mode, sensing gate mode, reviewers, enforcement flags, loaded levels, and full-constitution availability. |

## Read-Only Boundary

`progressive-display` only reads the governance hierarchy. It must not mutate governance files, feature state, or local artifacts.
