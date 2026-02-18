# Size Topology Reference

**Module:** lens
**Type:** Include (shared reference for workflows)

---

## Branch Topology

Lens uses flat hyphen-separated branch naming with no slashes.

### Patterns

```
{domain_prefix}                                    # Domain-layer branch
{domain_prefix}-{service_prefix}                   # Service-layer branch
{featureBranchRoot}                                # Feature root (= base)
{featureBranchRoot}-small                          # Small audience
{featureBranchRoot}-medium                         # Medium audience
{featureBranchRoot}-large                          # Large audience
{featureBranchRoot}-{audience}-p{N}                # Phase branch
{featureBranchRoot}-{audience}-p{N}-{workflow}     # Workflow branch
```

### featureBranchRoot Construction

Built from initiative hierarchy:
- **Domain**: `{domain_prefix}`
- **Service**: `{domain_prefix}-{service_prefix}`
- **Feature**: `{domain_prefix}-{service_prefix}-{feature_id}`

Stored in initiative config as `feature_branch_root`.

### Audience Configuration

Per-initiative (not global). Configured during `/new`:
- **Minimum:** 1 audience (e.g., just `small`)
- **Default:** 3 audiences (`small`, `medium`, `large`)
- **Custom:** Teams define their own audience labels

### Phase Branch Lifecycle

1. `/new` creates: root + configured audience branches → pushed immediately
2. `/pre-plan` creates: `-p1` on first audience → pushed
3. Phase commands advance through phases, creating `-p{N}` branches
4. Phase completion: PR → merge → delete phase branch → checkout next
5. `/archive` cleans up when initiative completes

### Initiative Creation Branches

For a feature initiative with default audiences:
```
my-domain-my-svc-my-feat              # root (base)
my-domain-my-svc-my-feat-small        # small audience
my-domain-my-svc-my-feat-medium       # medium audience
my-domain-my-svc-my-feat-large        # large audience
```

Phase work branches (created as needed):
```
my-domain-my-svc-my-feat-small-p1     # phase 1 on small
my-domain-my-svc-my-feat-small-p1-dev # dev workflow on p1
```

---

_Include file created on 2026-02-17 via BMAD Module workflow_
