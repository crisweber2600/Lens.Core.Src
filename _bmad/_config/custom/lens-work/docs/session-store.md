# Session Store (_bmad-output/lens-work/state.yaml)

LENS persists the last detected or switched context so sessions can be restored quickly.

---

## Schema (v1)

```yaml
version: 1
updated_at: "<ISO-8601 timestamp>"
lens: domain | service | microservice | feature
context:
  domain: "<string or null>"
  service: "<string or null>"
  microservice: "<string or null>"
  feature: "<string or null>"
git:
  branch: "<string or null>"
  commit: "<string or null>"
signals:
  paths:
    - "<path hint>"
  config_loaded: true | false
summary: "<short summary>"
```

---

## Example

```yaml
version: 1
updated_at: "2026-01-31T12:34:56Z"
lens: feature
context:
  domain: payments
  service: billing
  microservice: invoicing
  feature: pdf-export
git:
  branch: feature/billing/invoicing/pdf-export
  commit: a1b2c3d
signals:
  paths:
    - services/billing/invoicing
  config_loaded: true
summary: "Feature lens: billing/invoicing → pdf-export"
```

---

## Notes

- If `version` is missing, treat the file as v1.
- Unknown fields should be ignored for forward compatibility.
- Use `lens-restore` to rehydrate the session.
