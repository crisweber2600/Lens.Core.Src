# Branch Topology

Lens uses a flat, hyphen-separated branch naming convention with no slashes. Every branch name is readable, predictable, and encodes the initiative hierarchy, audience, and phase directly in the name.

## Branch Patterns

There are six levels of branches. Not every initiative uses all six — domain initiatives use one branch, service initiatives use one, and feature initiatives use the full tree:

| Level | Pattern | Example |
|-------|---------|---------|
| Domain | `{domain_prefix}` | `platform` |
| Service | `{domain_prefix}-{service_prefix}` | `platform-user-mgmt` |
| Feature root | `{featureBranchRoot}` | `platform-user-mgmt-auth-flow` |
| Audience | `{featureBranchRoot}-{audience}` | `platform-user-mgmt-auth-flow-small` |
| Phase | `{featureBranchRoot}-{audience}-p{N}` | `platform-user-mgmt-auth-flow-small-p1` |
| Workflow | `{featureBranchRoot}-{audience}-p{N}-{workflow}` | `platform-user-mgmt-auth-flow-small-p1-brainstorm` |

## How featureBranchRoot Is Built

The `featureBranchRoot` is constructed from the initiative hierarchy and stored in the initiative config file. The construction rule depends on the initiative type:

| Type | Formula | Example |
|------|---------|---------|
| Domain | `{domain_prefix}` | `platform` |
| Service | `{domain_prefix}-{service_prefix}` | `platform-user-mgmt` |
| Feature | `{domain_prefix}-{service_prefix}-{feature_id}` | `platform-user-mgmt-auth-flow` |

For domain and service initiatives, the root IS the only branch. For feature initiatives, the root is the base from which audience branches are created.

## Worked Examples

### Domain Initiative

A domain is an organizational grouping. It has one branch:

```text
Hierarchy:  domain = "payment"
Branch:     payment
```

Branch count: 1

### Service Initiative

A service lives within a domain. It has one branch:

```text
Hierarchy:  domain = "payment", service = "gateway"
Branch:     payment-gateway
```

Branch count: 1

### Feature Initiative (Full Topology)

A feature initiative has the full branch tree. Here is a complete example with default audiences (`small`, `medium`, `large`):

```text
Hierarchy:  domain = "platform"
            service = "user-mgmt"
            feature = "auth-flow"

featureBranchRoot = "platform-user-mgmt-auth-flow"
```

Branches created by `/new`:

```text
platform-user-mgmt-auth-flow                    # Root (base)
├── platform-user-mgmt-auth-flow-small           # Small audience
├── platform-user-mgmt-auth-flow-medium          # Medium audience
└── platform-user-mgmt-auth-flow-large           # Large audience
```

Branches created during phases:

```text
platform-user-mgmt-auth-flow-small-p1            # Phase 1 (Pre-Plan)
platform-user-mgmt-auth-flow-small-p1-brainstorm # Workflow branch
platform-user-mgmt-auth-flow-small-p1-brief      # Another workflow branch
platform-user-mgmt-auth-flow-medium-p2           # Phase 2 (Plan)
platform-user-mgmt-auth-flow-large-p3            # Phase 3 (Tech-Plan)
platform-user-mgmt-auth-flow-large-p4            # Phase 4 (Story-Gen)
platform-user-mgmt-auth-flow-large-p5            # Phase 5 (Review)
platform-user-mgmt-auth-flow-large-p6            # Phase 6 (Dev)
platform-user-mgmt-auth-flow-large-p6-dev        # Dev workflow branch
```

Total branches created over a full lifecycle: 4 (root + audiences) + 6 (phases) + workflow branches (temporary).

The full topology as a git graph:

```mermaid
gitgraph
    commit id: "main"
    branch platform-user-mgmt-auth-flow
    commit id: "root created"
    branch platform-user-mgmt-auth-flow-small
    commit id: "small audience"
    branch platform-user-mgmt-auth-flow-small-p1
    commit id: "P1: pre-plan"
    commit id: "product-brief.md"
    checkout platform-user-mgmt-auth-flow-small
    merge platform-user-mgmt-auth-flow-small-p1 id: "PR: P1 complete"
    checkout platform-user-mgmt-auth-flow
    branch platform-user-mgmt-auth-flow-medium
    commit id: "medium audience"
    merge platform-user-mgmt-auth-flow-small id: "cascade: small→medium"
    branch platform-user-mgmt-auth-flow-medium-p2
    commit id: "P2: plan"
    commit id: "prd.md, epics.md"
    checkout platform-user-mgmt-auth-flow-medium
    merge platform-user-mgmt-auth-flow-medium-p2 id: "PR: P2 complete"
    checkout platform-user-mgmt-auth-flow
    branch platform-user-mgmt-auth-flow-large
    commit id: "large audience"
    merge platform-user-mgmt-auth-flow-medium id: "cascade: medium→large"
    branch platform-user-mgmt-auth-flow-large-p3
    commit id: "P3: tech-plan"
    checkout platform-user-mgmt-auth-flow-large
    merge platform-user-mgmt-auth-flow-large-p3 id: "PR: P3 complete"
```

## Audience Configuration

Audiences determine where each phase's PR lands. They are configured per-initiative, not globally.

| Property | Value |
|----------|-------|
| Minimum audiences | 1 |
| Default audiences | `small`, `medium`, `large` |
| Custom audiences | Any labels (e.g., `core-team`, `engineering`, `all-hands`) |

The mapping from phase to audience is stored in the initiative config's `review_audience_map`:

```yaml
review_audience_map:
  p1: small       # Pre-Plan targets small audience
  p2: medium      # Plan targets medium audience
  p3: large       # Tech-Plan targets large audience
  p4: large       # Story-Gen targets large audience
  p5: large       # Review targets large audience
  p6: large       # Dev targets large audience
```

With a single audience (e.g., `team`), all phases target the same branch and the cascade merge is a no-op.

## Phase Branch Lifecycle

Each phase follows a five-step branch lifecycle:

1. **Create** — Lens creates the phase branch (`{featureBranchRoot}-{audience}-p{N}`) from the audience branch
2. **Work** — Workflow branches are created from the phase branch for individual tasks (brainstorming, research, etc.)
3. **PR** — When all required artifacts are complete, Lens creates a PR from the phase branch to the audience branch
4. **Merge** — After review and approval, the phase branch merges into the audience branch
5. **Cleanup** — The phase branch is deleted and Lens checks out the audience branch

Workflow branches within a phase follow the same pattern: create from phase branch, work, merge back to phase branch, delete.

## Audience Cascade Merge

When a phase transitions to a larger audience, Lens merges the previous audience's content into the new one. This ensures all prior artifacts are available:

| Transition | Merge Direction |
|------------|----------------|
| P1 (small) → P2 (medium) | `small` → `medium` |
| P2 (medium) → P3 (large) | `medium` → `large` |
| P3+ (large) → P4+ (large) | No merge needed (same audience) |

The cascade happens automatically at the start of each phase. You do not need to merge manually.

## Branch Protection Recommendations

For teams using branch protection rules:

| Branch Type | Recommendation |
|-------------|---------------|
| Root (`featureBranchRoot`) | Protect — require PR |
| Audience (`-small`, `-medium`, `-large`) | Protect — require 1+ review |
| Phase (`-p{N}`) | Allow direct push |
| Workflow (`-p{N}-{name}`) | Allow direct push |

Phase and workflow branches are temporary and managed entirely by Lens. Audience branches accumulate the reviewed work.

## Related Documentation

- [Getting Started](getting-started.md) — See branch creation in action during `/new`
- [Architecture](architecture.md) — How `git-orchestration` skill manages branches
- [Configuration](configuration.md) — Customize audiences per-initiative
- [API Reference](api-reference.md) — Branch pattern regex and git configuration
