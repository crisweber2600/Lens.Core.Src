# Discovery Workflows — Repo Operations

**Module:** lens-work
**Category:** discovery
**Agent:** Scout
**Status:** Specification

---

## Workflow: repo-discover

### Trigger

`@scout discover` or during `#new-*` initialization

### Purpose

Inventory TargetProjects vs service map (read-only, no mutations).

### Sequence

1. Load service map for current layer/scope
2. Scan TargetProjects directory
3. Compare expected vs actual repos
4. Categorize: matched, missing, extra
5. Write `repo-inventory.yaml`
6. Report summary

### Output

`_bmad-output/lens-work/repo-inventory.yaml`

---

## Workflow: repo-document

### Trigger

`@scout document` or during bootstrap

### Purpose

Run document-project + quick-spec per in-scope repo with incremental logic.

### In-Scope Logic

| Layer | In-Scope Repos |
|-------|----------------|
| Domain | All repos in domain |
| Service | All repos in service |
| Repo | Target repo only |
| Feature | Target repo + declared deps |

### Decision Factors

- `repo_status`: healthy/unhealthy
- `churn_threshold`: commits since last doc (default: 50)
- `last_documented_commit` vs `current_head_commit`

### Decisions

| Decision | Action |
|----------|--------|
| `skip` | No changes since last doc |
| `incremental` | Update quick-spec only |
| `full` | Regenerate both docs |

### Sequence

1. Load repo-inventory.yaml
2. For each in-scope repo:
   - Check repo-status
   - Apply decision logic
   - Execute document-project (if full)
   - Execute quick-spec (if incremental or full)
   - Write to `Docs/{domain}/{service}/{repo}/`
3. Update `repo-document-log.md`

### Output

- `Docs/{domain}/{service}/{repo}/project-context.md`
- `Docs/{domain}/{service}/{repo}/current-state.tech-spec.md`
- `_bmad-output/lens-work/repo-document-log.md`

---

## Workflow: repo-reconcile

### Trigger

`@scout reconcile` or during bootstrap

### Purpose

Clone missing repos, fix unhealthy repos, with snapshot + rollback support.

### Sequence

1. Load repo-inventory.yaml
2. Snapshot current TargetProjects state
3. For each missing repo:
   - Clone to expected path
   - Checkout default branch
4. For each unhealthy repo:
   - Diagnose issue
   - Attempt fix (fetch, checkout, reset)
5. Update repo-inventory.yaml
6. Report actions taken
7. Offer rollback if errors

### Rollback Support

Before mutations:
```yaml
snapshot:
  path: _bmad-output/lens-work/snapshots/{timestamp}/
  created_at: "2026-02-03T10:30:00Z"
  repos_captured: [list]
```

If error → `@scout rollback` restores from snapshot.

---

## Workflow: repo-status

### Trigger

`@scout repo-status` or as pre-check for confidence scoring

### Purpose

Fast health check for repos (no mutations).

### Checks

- Git remote configured
- Default branch exists
- Working tree clean
- HEAD matches remote
- No merge conflicts

### Output

```yaml
repo: api-gateway
status: healthy  # healthy/unhealthy/missing
checks:
  remote: ✅
  branch: ✅
  clean: ✅
  synced: ⚠️ (3 commits behind)
  conflicts: ✅
```

---

## Canonical Docs Layout

### Structure

```
Docs/{domain}/{service}/{repo}/
├── project-context.md           # document-project output
├── current-state.tech-spec.md   # quick-spec snapshot
└── {initiative artifacts}/       # Created during phases
```

### Frontmatter

```yaml
---
repo: payment-gateway
remote: git@github.com:org/payment-gateway.git
default_branch: main
source_commit: a3f2b9c
generated_at: 2026-02-03T14:32:00Z
layer: microservice
domain: payment-domain
service: payment-service
generator: document-project | quick-spec
---
```

---

_Workflow spec created on 2026-02-03 via BMAD Module workflow_
