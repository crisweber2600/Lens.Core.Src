# List Features

Discover and enumerate available features from `feature-index.yaml`.

## When to Use

- When the user asks "what features are available?", "list features", "show me what I can switch to"
- When helping the user select a target feature before switching
- When checking feature status across the repo

## Source

Feature list always reads from `feature-index.yaml` at the governance repo root. This file is always read from `main` — no branch switching is performed. The index is the authoritative source for listing; individual `feature.yaml` files are only read during a `switch` operation.

## Process

Run the list operation:

```bash
python3 ./scripts/switch-ops.py list \
  --governance-repo {governance_repo}
```

Optional status filter (default: active only):

```bash
# Show all features including archived
python3 ./scripts/switch-ops.py list \
  --governance-repo {governance_repo} \
  --status-filter all

# Show only archived
python3 ./scripts/switch-ops.py list \
  --governance-repo {governance_repo} \
  --status-filter archived
```

## Output

```json
{
  "status": "pass",
  "features": [
    {
      "id": "auth-login",
      "domain": "platform",
      "service": "identity",
      "status": "active",
      "owner": "cweber",
      "summary": "User authentication flow with JWT tokens"
    },
    {
      "id": "user-profile",
      "domain": "platform",
      "service": "identity",
      "status": "active",
      "owner": "amelia",
      "summary": "User profile management and preferences"
    }
  ],
  "total": 2
}
```

## Display Format

Present results as a table grouped by domain/service:

```
Available features (2):

PLATFORM / IDENTITY
  auth-login     active   cweber    User authentication flow with JWT tokens
  user-profile   active   amelia    User profile management and preferences
```

Highlight the currently active feature (if any) with `→` prefix.

## Domain Fallback (no features yet)

When `feature-index.yaml` does not exist, the script falls back to scanning `features/` for `domain.yaml` and `service.yaml` files. The result shape changes to `mode: "domains"`:

```json
{
  "status": "pass",
  "mode": "domains",
  "domains": [
    {
      "id": "lens.core",
      "name": "Lens Core",
      "domain": "lens.core",
      "status": "active",
      "owner": "crisweber2600",
      "services": [
        {
          "id": "lens.core-src",
          "name": "Src",
          "service": "src",
          "status": "active",
          "owner": "crisweber2600"
        }
      ]
    }
  ],
  "total_domains": 1,
  "total_services": 1,
  "message": "No features initialized yet. Showing domain/service inventory from governance repo."
}
```

Present domain fallback results as an inventory grouped by domain:

```
No features initialized yet. Domain/service inventory (1 domain, 1 service):

LENS.CORE — Lens Core
  src   active   crisweber2600

Run /lens-init-feature to create the first feature.
```

## Errors

| Error | Exit code | Cause |
|-------|-----------|-------|
| `Failed to parse feature-index.yaml: ...` | 1 | YAML parse error in existing index |
