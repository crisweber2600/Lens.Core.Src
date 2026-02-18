# Multi-Repo Initiatives

## Overview

Many lens-work initiatives span multiple repositories — especially at the `domain` layer. A domain initiative like "BMAD Platform" might touch `BMAD.Lens`, `bmad-chat`, and `bmadServer` simultaneously. This guide covers how lens-work tracks, synchronizes, and manages branches across repos.

## target_repos in Initiative Config

When an initiative is created via `/new-domain` or `/new-service`, the `target_repos` array specifies which repositories participate:

```yaml
# initiatives/bmad-9d7732.yaml
id: bmad-9d7732
name: "BMAD"
layer: domain
target_repos:
  - "BMAD.Lens"
  - "bmad-chat"
  - "bmadServer"
repo_domain_assignments:
  "BMAD.Lens": "BMAD/LENS"
  "bmad-chat": "BMAD/CHAT"
  "bmadServer": "BMAD/CHAT"
created_at: "2026-02-05T19:27:24-06:00"
```

Repos are resolved against `service-map.yaml` for their local paths and remote URLs:

```yaml
# service-map.yaml
repos:
  - name: BMAD.Lens
    local_path: TargetProjects/BMAD/LENS/BMAD.Lens
    remote_url: https://github.com/crisweber2600/BMAD.Lens.git
  - name: bmad-chat
    local_path: TargetProjects/BMAD/CHAT/bmad-chat
    remote_url: https://github.com/crisweber2600/bmad-chat.git
```

## Branch Synchronization

### Control Repo is the Source of Truth

The BMAD control repo manages all initiative branches. Target repos are _consumers_ — they receive work but don't drive lifecycle state.

> **Note:** Branch names are flat hyphen-separated. For example, `{featureBranchRoot}` might be `lens-chat-rate-limit-x7k2m9` or `payment-checkout-0a1k2m`.

### Domain-Layer Branch Pattern

Domain-layer initiatives create only a single organizational branch in the control repo:

```
NorthStarET.BMAD (control repo)
└── {domain_prefix}                            ← Domain branch (only branch)
    (Domain.yaml + .gitkeep in initiatives/, TargetProjects/, Docs/)
```

No audience, phase, or workflow branches are created for domain-layer. Service and feature initiatives within the domain create their own branch topology.

### Service/Feature Branch Pattern

```
NorthStarET.BMAD (control repo)
├── {featureBranchRoot}                    ← initiative root (lifecycle branches live HERE)
├── {featureBranchRoot}-small               ← small audience group
├── {featureBranchRoot}-small-p1            ← phase 1 (created by /pre-plan)
└── {featureBranchRoot}-small-p1-brainstorm ← workflow branch

Target repos (e.g., bmad-chat)
└── (no initiative branches — work happens via PRs or feature branches)
```

All branches pushed to remote immediately on creation.

### When Target Repos Need Branches

For implementation phase (p4) work that touches target repo code directly:

```bash
# Casey creates matching feature branches in target repos
cd TargetProjects/BMAD/CHAT/bmad-chat
git checkout -b "{featureBranchRoot}-large-p4-feature-name"
git push -u origin "{featureBranchRoot}-large-p4-feature-name"
```

These branches follow a simplified pattern — no full topology duplication. They link back to the control repo's initiative via the `{initiative_id}` segment.

## State Tracking for Multi-Repo

The control repo's `state.yaml` tracks position across all repos:

```yaml
active_initiative: bmad-9d7732
# Size is stored in initiatives/{id}.yaml
current:
  phase: p4
  workflow: dev-story
  workflow_status: in_progress
  active_repos:
    - repo: bmad-chat
      branch: "{featureBranchRoot}-large-p4-auth-flow"
      status: in_progress
    - repo: bmadServer
      branch: "{featureBranchRoot}-large-p4-auth-api"
      status: in_progress
    - repo: BMAD.Lens
      branch: null
      status: not_started
```

## Cross-Repo PR Linking

When finishing a workflow that spans multiple repos, Casey generates linked PRs:

```
✅ Workflow complete: dev-story/auth-flow
├── Control repo PR: NorthStarET.BMAD#42
├── Target PRs:
│   ├── bmad-chat#18 (auth UI components)
│   └── bmadServer#7 (auth API endpoint)
└── All PRs reference initiative: bmad-9d7732
```

### PR Description Template

Each target repo PR includes a reference back to the control repo:

```markdown
## lens-work Initiative: bmad-9d7732

- **Phase:** p4 (Implementation)
- **Workflow:** dev-story/auth-flow
- **Control PR:** NorthStarET.BMAD#42
- **Related PRs:** bmadServer#7

Part of domain initiative "BMAD" managed by lens-work.
```

## Example: Domain Initiative Touching Multiple Repos

A concrete example using the BMAD domain initiative:

| Phase | Control Repo Activity | Target Repo Activity |
|-------|----------------------|---------------------|
| p1 (Analysis) | Brainstorm, research, product brief | Scout discovers repos, generates inventories |
| p2 (Planning) | PRD, UX design | No target repo changes |
| p3 (Solutioning) | Architecture, epics, stories | No target repo changes |
| p4 (Implementation) | Sprint plan, story tracking | Feature branches in `bmad-chat`, `bmadServer` |
| Completion | Merge `small` → `large` → `base` → `main` | Merge feature branches → `main` per repo |

## Best Practices

1. **Always check `service-map.yaml`** before adding repos to an initiative — paths must be correct
2. **One initiative per domain** — avoid overlapping target repos across concurrent initiatives
3. **Merge target repos first** — when finishing a phase, merge target repo PRs before the control repo PR
4. **Use `@scout repo-status`** to verify all target repos are in a clean state before phase transitions
5. **Cross-repo conflicts** — resolve in each target repo independently, then update the control repo state
