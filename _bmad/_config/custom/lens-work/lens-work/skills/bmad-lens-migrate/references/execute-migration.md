# Execute Migration

Execute the migration plan after dry-run confirmation. Creates canonical Lens Next governance artifacts, preserves legacy state when present, populates feature-index.yaml, and writes summary stubs on main.

## Outcome

For each confirmed feature:
- `feature.yaml` created at `{governance_repo}/features/{domain}/{service}/{featureId}/feature.yaml`
- Entry added to `{governance_repo}/feature-index.yaml`
- Summary stub created at `{governance_repo}/features/{domain}/{service}/{featureId}/summary.md`
- Problems log created at `{governance_repo}/features/{domain}/{service}/{featureId}/problems.md`
- Documents migrated to `{governance_repo}/features/{domain}/{service}/{featureId}/docs/` (when `--source-repo` is provided or governance-legacy docs exist)

Old branches are NOT deleted at this step. Cleanup is a separate, explicit operation that requires verification first.

## Pre-execution Checklist

1. Dry-run has been shown to the user ✓
2. User has confirmed the migration ✓
3. Conflicts have been reviewed and resolved or skipped ✓

## Execute Single Feature

```bash
python3 ./scripts/migrate-ops.py migrate-feature \
  --governance-repo {governance_repo} \
  --old-id {old_id} \
  --feature-id {feature_id} \
  --domain {domain} \
  --service {service} \
  --username {username} \
  --source-repo {source_repo}
```

`--source-repo` is optional. When provided, the migration also discovers and copies documents from the source repo (filesystem and git branches).

## Output Shape

```json
{
  "status": "pass",
  "feature_id": "auth-login",
  "dry_run": false,
  "feature_yaml_created": true,
  "index_updated": true,
  "summary_created": true,
  "problems_created": true,
  "artifacts_copied": ["tech-plan.md"],
  "documents_migrated": ["prd.md", "tech-plan.md"],
  "documents_source": {
    "prd.md": "branch-docs",
    "tech-plan.md": "governance-legacy"
  },
  "legacy_state_path": "{governance_repo}/branches/platform-identity-auth-login/initiative-state.yaml",
  "warnings": []
}
```

## Execution Loop

For each confirmed feature in the migration plan:

1. Run `check-conflicts` — if conflict detected, skip and log
2. Read `initiative-state.yaml` from legacy branch (state-preserving conversion)
3. Run `migrate-feature` (live, no `--dry-run`)
4. Scaffold governance feature directory:
   - Create `{governance_repo}/features/{domain}/{service}/{featureId}/`
   - Create `problems.md` from template if not exists
  - Copy planning artifacts from `{governance_repo}/branches/{old_id}/_bmad-output/lens-work/planning-artifacts/` when present
5. Log result: pass / fail / skipped
6. Continue to next feature — do not abort batch on single failure

### Document Migration

After governance scaffolding, documents are discovered from up to four sources and copied to `{governance_repo}/features/{domain}/{service}/{featureId}/docs/`.

Priority order (highest wins when filenames conflict):
1. **governance-legacy** — `{governance_repo}/branches/{old_id}/_bmad-output/` files (filesystem, or git `origin/{old_id}` branch fallback)
2. **branch-docs** — `origin/{old_id}` branch in source repo: `docs/{domain}/{service}/feature/{featureId}/` or `docs/{domain}/{service}/{featureId}/`, plus `_bmad-output/lens-work/` on the branch (git-only, requires `--source-repo`)
3. **source-docs** — `{source_repo}/Docs/{domain}/{service}/{featureId}/` (filesystem, requires `--source-repo`)
4. **bmad-output** — `{source_repo}/_bmad-output/lens-work/initiatives/{domain}/{service}/` (filesystem, requires `--source-repo`)

Git-based sources use `git ls-tree` to enumerate files and `git show` to extract content. Ensure `git fetch` has been run before migration.

Duplicate filenames are resolved by priority: the highest-priority source wins and a warning is emitted for the skipped duplicate.

### Governance Directory Scaffolding (v3.4)

After feature.yaml is created, scaffold the governance feature directory:

```yaml
feature_dir = "{governance_repo}/features/{domain}/{service}/{featureId}"
ensure_directory(feature_dir)

# Create problems.md from template
problems_template = load("../../assets/templates/problems-template.md")
write_if_not_exists("${feature_dir}/problems.md", render(problems_template, {
  featureId: featureId,
  domain: domain,
  service: service,
  created_date: now()
}))

# Copy planning artifacts from legacy branches to governance
legacy_docs = git_ls_tree("origin/${old_id}", "_bmad-output/lens-work/planning-artifacts/")
for doc in legacy_docs:
  content = git_show("origin/${old_id}:${doc.path}")
  write_file("${feature_dir}/${doc.name}", content)
```

## feature.yaml Structure

The created feature.yaml follows the Lens Next schema. v3.4 enhancement: when
`initiative-state.yaml` exists on a legacy branch, state is preserved during migration
rather than defaulting to `preplan`.

### State-Preserving Conversion (v3.4)

Before creating feature.yaml, attempt to read existing state:

```yaml
# Try to load initiative-state from the legacy root branch
legacy_state = git_show("origin/${old_id}:_bmad-output/lens-work/initiatives/${domain}/${service}/initiative-state.yaml")

if legacy_state != null:
  # Preserve actual lifecycle state
  current_phase = legacy_state.current_phase || "preplan"
  current_milestone = legacy_state.current_milestone || null
  track = legacy_state.track || "full"
  artifacts = legacy_state.artifacts || {}
  phase_transitions = legacy_state.phase_transitions || []
else:
  # Fallback to defaults when no state file exists
  current_phase = "preplan"
  current_milestone = null
  track = "full"
  artifacts = {}
  phase_transitions = [{ phase: "preplan", timestamp: now(), user: username }]
```

Resulting feature.yaml:

```yaml
featureId: auth-login
name: Auth Login
description: Migrated from legacy branch: platform-identity-auth-login
domain: platform
service: identity
phase: ${current_phase}       # Preserved from initiative-state.yaml or defaults to preplan
track: ${track}               # Preserved from initiative-state.yaml or defaults to full
priority: medium
created: <timestamp>
updated: <timestamp>
team:
  - username: {username}
    role: lead
phase_transitions: ${phase_transitions}  # Preserved from initiative-state.yaml
artifacts: ${artifacts}                  # Preserved from initiative-state.yaml
migrated_from: platform-identity-auth-login
topology: "2-branch"
branches:
  root: auth-login
  plan: auth-login-plan
```

## feature-index.yaml Entry

Added entry format:

```yaml
features:
  - featureId: auth-login
    domain: platform
    service: identity
    migrated_from: platform-identity-auth-login
    added: <timestamp>
```

## Summary Stub (features/{domain}/{service}/{featureId}/summary.md)

Written to main branch at `{governance_repo}/features/{domain}/{service}/{featureId}/summary.md`:

```markdown
# Auth Login

> Status: migrated | Feature ID: `auth-login`

Migrated from legacy branch `platform-identity-auth-login`. Update as planning resumes.

**Domain:** platform  
**Service:** identity  
**Owner:** cweber  
**Migrated:** <timestamp>
```

## Completion Summary

After all features are processed, show:

```
Migration complete:
  ✓ N features migrated successfully
  ✗ N features failed (see errors above)
  ⚠ N features skipped (conflicts)

Old branches preserved. To remove them, run cleanup explicitly.
```

## Cleanup Step

Cleanup is a **separate, explicit operation** and must never happen automatically.

Only run cleanup after:
1. Migration has completed successfully
2. Verification has passed (see `./references/verify-migration.md`)
3. User explicitly confirms: "Proceed with cleanup? (yes/no)"

See `./references/cleanup.md` for the full cleanup workflow.
