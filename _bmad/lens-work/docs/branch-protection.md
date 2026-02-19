# Branch Protection for lens-work Branches

## Overview

lens-work creates a flat, hyphen-separated branch topology. Proper branch protection rules ensure lifecycle integrity — preventing accidental pushes to group branches, enforcing review gates, and keeping the merge flow aligned with BMAD phases.

## Branch Topology Recap

```
{featureBranchRoot}                          ← Feature root (created once)
{featureBranchRoot}-small                    ← Small-team group (planning phases merge here)
{featureBranchRoot}-medium                   ← Medium review group
{featureBranchRoot}-large                    ← Large review group (receives from small/medium after review)
{featureBranchRoot}-small-p1                 ← Phase branch (Analysis)
{featureBranchRoot}-small-p1-*               ← Workflow branches (individual work)
```

## Recommended Protection Rules

### Size Branches (small, medium, large)

| Rule | Value | Rationale |
|------|-------|-----------|
| Require PR for merge | ✅ Yes | Phase → group merges must be reviewable |
| Required reviewers | 1+ | At least one team member reviews completed phase work |
| Dismiss stale reviews | ✅ Yes | Re-review if phase branch changes after approval |
| Allow force push | ❌ No | Group branches are accumulation points — never rewrite |
| Allow deletion | ❌ No | Group branches persist for the initiative lifetime |

### Phase Branches (p1, p2, p3, p4)

| Rule | Value | Rationale |
|------|-------|-----------|
| Require PR for merge | ✅ Yes | Workflow branches merge into phase via PR |
| Required reviewers | 0–1 | Optional for solo dev, recommended for teams |
| Allow force push | ❌ No | Phase branches track sequential workflow merges |
| Allow deletion | ✅ After merge | Clean up after phase → size merge |

### Workflow Branches (w/*)

| Rule | Value | Rationale |
|------|-------|-----------|
| Require PR for merge | Optional | Team preference |
| Allow force push | ✅ Yes | Developer may rebase during active work |
| Allow deletion | ✅ After merge | Clean up after workflow → phase merge |

## Size-to-Size Merge Reviews

The `small → large` merge is a critical gate representing the **Large Review** phase. This merge should always require:

- **2+ reviewers** including a tech lead or architect
- **All CI checks passing** (see [ci-integration.md](ci-integration.md))
- **No unresolved comments**
- **Linear merge history** (squash or rebase)

## Platform Configuration

### GitHub

```yaml
# .github/settings.yml (probot/settings format)
branches:
  - name: "*-small"
    protection:
      required_pull_request_reviews:
        required_approving_review_count: 1
        dismiss_stale_reviews: true
      enforce_admins: true
      restrictions: null

  - name: "*-large"
    protection:
      required_pull_request_reviews:
        required_approving_review_count: 2
        dismiss_stale_reviews: true
      enforce_admins: true
```

> **Note:** GitHub branch protection rules support wildcard patterns. The flat naming convention (e.g., `chat-spark-xyz-small`) is matched with `*-small`, `*-large`, etc.

### Azure DevOps

1. Navigate to **Project Settings → Repos → Branches**
2. Add branch policy for pattern `*-small` and `*-large`
3. Set minimum reviewers (1 for small, 2 for large)
4. Enable **Check for linked work items** if using Azure Boards
5. Add build validation policy referencing your CI pipeline

### GitLab

1. Navigate to **Settings → Repository → Protected Branches**
2. Add `*-small` — Allowed to merge: Maintainers, Allowed to push: No one
3. Add `*-large` — Allowed to merge: Maintainers, Allowed to push: No one
4. Configure merge request approvals under **Settings → Merge Requests**
