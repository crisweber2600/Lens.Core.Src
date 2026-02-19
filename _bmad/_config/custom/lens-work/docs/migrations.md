# Migration Notes

This document records backward-compatibility guidance for LENS session storage.

---

## Session Store Versions

### v1 (2026-01-31)
- Initial schema for `_bmad-output/lens-work/state.yaml`.
- Required keys: `version`, `updated_at`, `lens`, `context`.
- Optional keys: `git`, `signals`, `summary`.

---

## Backward Compatibility Rules

- If `version` is missing, assume v1.
- If optional sections are missing, treat them as `null` or empty values.
- Ignore unknown keys to support forward-compatible writes.

---

## Upgrade Guidance

1. Add `version: 1` if missing.
2. Populate `updated_at` with the last known timestamp or the current time.
3. Map older fields into the `context` object where possible.
