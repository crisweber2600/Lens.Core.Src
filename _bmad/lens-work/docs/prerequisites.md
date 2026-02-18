# Prerequisites & Environment Setup

Use this checklist to ensure LENS Sync & Discovery runs safely and produces valid outputs.

---

## Required Tooling

- **Node.js:** 18+ (LTS recommended)
- **Git:** 2.30+ (SSH or HTTPS credentialed)
- **BMAD CLI:** `bmad` available on `PATH`
- **YAML editor/validator:** recommended for `domain-map.yaml` and `service.yaml`

---

## Access & Credentials

- **Repository access:** read permissions for all repos referenced by `service.yaml`
- **Git credentials:** SSH keys or HTTPS tokens configured for cloning
- **Optional JIRA:** set `JIRA_URL`, `JIRA_USER`, `JIRA_TOKEN`, or provide `_lens/jira-config.yaml`

---

## Required Project Structure

- `target_project_root` exists and is writable
- Lens root located at `_lens/` or `lens/`
- `domain-map.yaml` with a `domains` array
- Each domain resolves to a `service.yaml` file with a `services` array

**Minimal schema hints:**
```yaml
domains:
  - name: platform
    path: domains/platform
    service_file: service.yaml
```

```yaml
services:
  - name: auth
    path: services/auth
    git_repo: git@github.com:org/auth.git
```

---

## Recommended Layout

- Each service has a stable folder under its domain path
- `docs_output_folder` resolves under `target_project_root`
- Avoid running against `/` or other system roots

---

## Environment Setup Checklist

- [ ] Configure `target_project_root`, `discovery_depth`, and `docs_output_folder`
- [ ] Validate `domain-map.yaml` and all referenced `service.yaml` files
- [ ] Confirm `docs_output_folder` is inside `target_project_root`
- [ ] Validate git access with `git ls-remote` for one repo
- [ ] Ensure at least 2GB free disk space for cloning
