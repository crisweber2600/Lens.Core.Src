---
name: size-topology
description: Branch hierarchy, size definitions, and merge strategies for lens-work
type: include
---

# Size Topology Reference

This document defines the branch hierarchy used by lens-work to manage initiative lifecycle branches. All branch operations are orchestrated by Casey and triggered through Compass phase commands.

**Branch naming convention:** `{featureBranchRoot}-{audience}-p{phaseNumber}-{workflow}`

---

## Branch Hierarchy (5 Levels)

```
Level 0: Domain              {domain_prefix}                                            (domain-layer only)
Level 0s: Service            {domain_prefix}-{service_prefix}                            (service-layer only)
Level 1: Feature Root        {featureBranchRoot}                                          (feature/microservice layers)
Level 2: Audience Groups     {featureBranchRoot}-small, -medium, -large
Level 3: Phases              {featureBranchRoot}-{audience}-p{N}
Level 4: Workflows           {featureBranchRoot}-{audience}-p{N}-{workflow}
```

Where `{featureBranchRoot}` = `{domain_prefix}-{service_prefix}-{initiative_id}` (service parent)
  or `{domain_prefix}-{service_prefix}-{repo}-{initiative_id}` (multi-repo)
  or `{domain_prefix}-{initiative_id}` (domain parent, no service)

### Level 0: Domain (domain-layer only)

```
{domain_prefix}
```

Organizational branch for domain-layer initiatives. Created at domain onboarding via `init-initiative` with `layer=domain`. This is the **only** branch created for domain-layer — no audience/phase/workflow branches exist.

**Rules:**
- Created from `main` (or current HEAD) at domain init
- Branch name is just the domain prefix (e.g., `bmad`, `payment`, `auth`)
- No audience/phase/workflow topology — domain is an organizational container
- Domain.yaml is both the domain descriptor AND the initiative config
- Service and feature initiatives within this domain create their own branches
- Pushed to remote immediately on creation

**Domain scaffolding (created on this branch):**
- `_bmad-output/lens-work/initiatives/{domain_prefix}/Domain.yaml` — domain config + initiative config
- `_bmad-output/lens-work/initiatives/{domain_prefix}/.gitkeep`
- `TargetProjects/{domain_prefix}/.gitkeep`
- `Docs/{domain_prefix}/.gitkeep`

---

### Level 0s: Service (service-layer only)

```
{domain_prefix}-{service_prefix}
```

Organizational branch for service-layer initiatives. Created via `init-initiative` with `layer=service`. This is the **only** branch created for service-layer — no audience/phase/workflow branches exist.

**Rules:**
- Created from `main` (or current HEAD) at service init
- Branch name is `{domain_prefix}-{service_prefix}` (hyphen-separated, e.g., `bmaddomain-lens`)
- No audience/phase/workflow topology — service is an organizational container
- Service.yaml is both the service descriptor AND the initiative config
- Feature initiatives within this service create their own branches at Levels 1–4
- Pushed to remote immediately on creation

**Service scaffolding (created on this branch):**
- `_bmad-output/lens-work/initiatives/{domain_prefix}/{service_prefix}/Service.yaml`
- `_bmad-output/lens-work/initiatives/{domain_prefix}/{service_prefix}/.gitkeep`
- `TargetProjects/{domain_prefix}/{service_prefix}/.gitkeep`
- `Docs/{domain_prefix}/{service_prefix}/.gitkeep`

---

### Level 1: Feature Root

```
{featureBranchRoot}
```

Root branch for the initiative. Created at init via `init-initiative` workflow. All work merges here eventually through the audience → root PR flow. This branch represents the "done" state of the initiative. **Replaces the old `/base` branch concept.**

**Rules:**
- Created from `main` (or current HEAD) at initiative start
- Never worked on directly — only receives merges from audience branches
- Protected: requires PR review for final PBR merge
- One root branch per initiative
- Pushed to remote immediately on creation

---

### Level 2: Audience Groups

```
{featureBranchRoot}-small     # Small group (planning + implementation)
{featureBranchRoot}-medium    # Medium group (future)
{featureBranchRoot}-large     # Large group (gate reviews)
```

Audience groups represent team-size-based workflow paths. Each group has its own lifecycle and phase progression. **Size is stored in the shared initiative config** (`initiatives/{id}.yaml`) — never in personal state.

#### Group Definitions

| Group | Purpose | Typical Team Size | Phases | Created At |
|-------|---------|-------------------|--------|------------|
| `small` | Single developer or small team doing end-to-end work | 1–3 | P1–P4 | `init-initiative` |
| `medium` | Medium team with parallel streams (reserved) | 4–8 | P1–P4 | Future |
| `large` | Large review group for gate reviews | 1–2 | Review gates only | `init-initiative` |

#### Group Behaviors

**small group ({smallGroupBranchRoot}):**
- Primary working group for most initiatives
- Phase branches (e.g., `-small-p1`) branch from and merge back to this group
- All planning and implementation happens here
- After P2 complete → opens PR to `large` for review

**large group ({largeGroupBranchRoot}):**
- Receives PR from `small` after architecture review gate
- Large-group reviewers approve the planning artifacts
- After approval → opens PR to feature root for final PBR

**medium group ({mediumGroupBranchRoot}, future):**
- Reserved for multi-team initiatives
- Will support parallel phase execution
- Not yet implemented — Compass will reject medium group requests

---

### Level 3: Phases

```
{featureBranchRoot}-{audience}-p1    # Analysis
{featureBranchRoot}-{audience}-p2    # Planning
{featureBranchRoot}-{audience}-p3    # Solutioning
{featureBranchRoot}-{audience}-p4    # Implementation
```

Phases are sequential workflow stages within an audience group. Each phase branch is created by the corresponding phase router workflow (e.g., `/pre-plan` creates `-small-p1`). **All phase branches are pushed to remote immediately on creation.**

**Phase lifecycle:** At the START of a phase router, the phase branch is created from the audience group branch and pushed. At the END of the phase, a PR is created from the phase branch into the audience group branch, then the phase branch is deleted locally and the audience group branch is checked out.

#### Phase Definitions

| Phase | Name | Purpose | Key Artifacts | Trigger Command |
|-------|------|---------|---------------|-----------------|
| P1 | Analysis | Brainstorm, research, product brief | `p1-product-brief.md`, `p1-research-notes.md` | `/pre-plan` |
| P2 | Planning | PRD, UX design, architecture | `p2-prd.md`, `p2-ux-design.md`, `p2-architecture.md` | `/spec` |
| P3 | Solutioning | Epics, stories, readiness check | `p3-epics.md`, `p3-stories/`, `p3-readiness-checklist.md` | `/plan` |
| P4 | Implementation | Dev stories, code review, retro | `p4-story-impl/`, `p4-review-notes.md`, `p4-retro.md` | `/dev` |

#### Phase Progression Rules

1. **Sequential only:** P{N} must complete before P{N+1} can start
2. **Completion = PR merged:** A phase is complete when its PR into the audience group is merged
3. **Ancestry check:** `git merge-base --is-ancestor origin/{phase_branch} origin/{audience_branch}`
4. **P1 created by /pre-plan:** Phase branches are NOT created at init — they are created by phase router workflows
5. **P2–P4 lazy-created:** Created by their respective router workflows on first access
6. **Immediate push:** All phase branches pushed to remote on creation
7. **PR + delete:** At phase end, PR into audience group, delete phase branch, checkout audience

---

### Level 4: Workflows

```
{featureBranchRoot}-{audience}-p{N}-{workflow_name}
```

Workflow branches represent individual units of work within a phase. They are created by `start-workflow` and merged back to the phase branch by `finish-workflow`. **All workflow branches are pushed to remote immediately on creation.**

#### Workflow Naming

| Phase | Workflow Name | Full Branch Example |
|-------|---------------|---------------------|
| P1 | `brainstorm` | `{featureBranchRoot}-small-p1-brainstorm` |
| P1 | `research` | `{featureBranchRoot}-small-p1-research` |
| P1 | `product-brief` | `{featureBranchRoot}-small-p1-product-brief` |
| P2 | `prd` | `{featureBranchRoot}-medium-p2-prd` |
| P2 | `ux-design` | `{featureBranchRoot}-medium-p2-ux-design` |
| P2 | `architecture` | `{featureBranchRoot}-medium-p2-architecture` |
| P3 | `epics` | `{featureBranchRoot}-large-p3-epics` |
| P3 | `stories` | `{featureBranchRoot}-large-p3-stories` |
| P3 | `readiness-check` | `{featureBranchRoot}-large-p3-readiness-check` |
| P4 | `dev-story` | `{featureBranchRoot}-large-p4-dev-story` |
| P4 | `code-review` | `{featureBranchRoot}-large-p4-code-review` |
| P4 | `retro` | `{featureBranchRoot}-large-p4-retro` |

#### Workflow Rules

- Created from phase branch via `start-workflow`
- Only one active workflow per phase at a time
- Previous workflow must be merged (ancestry check) before next starts
- Committed and pushed at creation via `start-workflow`
- PR opened: workflow branch → phase branch on `finish-workflow`

---

## Merge Strategies

### Merge Flow Diagram

```
Workflow ──squash──► Phase ──PR+delete──► Audience ──PR──► Audience ──PR──► Root
 (-{aud}-p{N}-{wf})  (-{aud}-p{N})       (small)         (large)         ({featureBranchRoot})
```

### Detailed Merge Table

| From → To | Branch Pattern | Strategy | Gate Required | Automation |
|-----------|----------------|----------|---------------|------------|
| workflow → phase | `-{aud}-p{N}-{wf}` → `-{aud}-p{N}` | Squash merge | No (auto) | `finish-workflow` |
| phase → audience | `-{aud}-p{N}` → `-{aud}` | PR + delete phase branch | Phase gate | `finish-phase` PR |
| small → large | `-small` → `-large` | PR merge | Review gate | `open-large-review` |
| large → root | `-large` → `{featureBranchRoot}` | PR merge | Final PBR | `open-final-pbr` |

### Phase Transition Flow

```
┌─────────┐   PR+del    ┌─────────┐   PR+del    ┌─────────┐   PR+del    ┌─────────┐
│  P1     │ ──────────► │  P2     │ ──────────► │  P3     │ ──────────► │  P4     │
│Analysis │  gate:p1    │Planning │  gate:p2    │Solution │  gate:p3    │  Impl   │
└─────────┘             └─────────┘             └─────────┘             └─────────┘
                                                      │
                                                      │ PR: small → large
                                                      ▼
                                                ┌─────────┐
                                                │  Large  │
                                                │ Review  │
                                                └────┬────┘
                                                     │ PR: large → root
                                                     ▼
                                                ┌──────────────┐
                                                │ Feature Root │
                                                │   (Done)     │
                                                └──────────────┘
```

### Phase Branch Lifecycle

At each phase:
1. **Start:** Create phase branch from audience group → push immediately
2. **Work:** All workflow branches created from phase branch
3. **End:** Create PR from phase branch into audience group → delete phase branch locally → checkout audience group

### Merge Validation

Before any merge, Casey validates:

1. **Clean state:** No uncommitted changes in working tree
2. **Ancestry:** Source branch is ahead of target (has commits to merge)
3. **Gate passed:** Required gate status is `passed` or `passed_with_warnings`
4. **No conflicts:** Merge preview is clean (or flagged for manual resolution)

```bash
# Ancestry check pattern
git merge-base --is-ancestor origin/${target_branch} origin/${source_branch}

# Conflict preview
git merge --no-commit --no-ff ${source_branch} && git merge --abort
```

---

## Branch Naming Validation

Casey validates branch names against these patterns:

```regex
# Domain-layer branches (domain-only):
^[a-z0-9-]+$

# Service-layer branches (domain-service):
^[a-z0-9-]+-[a-z0-9-]+$

# Feature-layer initiative and audience branches:
# {featureBranchRoot} or {featureBranchRoot}-{audience}
^[a-z0-9-]+(-[a-z0-9-]+)*$

# Feature-layer phase branches:
# {featureBranchRoot}-{audience}-p{N}
^[a-z0-9-]+-(?:small|medium|large)-p[0-9]+$

# Feature-layer workflow branches:
# {featureBranchRoot}-{audience}-p{N}-{workflow}
^[a-z0-9-]+-(?:small|medium|large)-p[0-9]+-[a-z0-9-]+$
```

> **Note:** All branches are flat (no `/` separators). Casey determines the layer from the initiative config to select the appropriate validation regex.

### Parsing Branch Components

Branch names are flat hyphen-separated. Parsing requires knowledge of the `featureBranchRoot` (stored in initiative config) to extract components:

```bash
# Example: bmaddomain-lens-rate-limit-x7k2m9-small-p1-brainstorm
# featureBranchRoot = "bmaddomain-lens-rate-limit-x7k2m9" (from initiative config)

# Strip featureBranchRoot prefix to get segment
featureBranchRoot="bmaddomain-lens-rate-limit-x7k2m9"
branch="bmaddomain-lens-rate-limit-x7k2m9-small-p1-brainstorm"
segment="${branch#${featureBranchRoot}-}"  # small-p1-brainstorm

# Parse segment
audience=$(echo "$segment" | cut -d'-' -f1)     # small
phase=$(echo "$segment" | cut -d'-' -f2)         # p1
workflow=$(echo "$segment" | cut -d'-' -f3-)     # brainstorm

# For audience-only branches (e.g., "-small"):
# phase and workflow will be empty
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Initiative ID collision | Regenerate random suffix, prompt user |
| Branch already exists | Skip creation, checkout existing |
| Orphaned workflow branch | Detected by `fix-state`, prompted for cleanup |
| Phase skipped | Blocked — sequential enforcement is strict |
| Multiple active workflows | Blocked — one workflow per phase at a time |
| Medium group requested | Rejected with "not yet implemented" message |

---

## Related Workflows

- **init-initiative:** Domain: creates Level 0 branch. Service: creates Level 0s branch. Feature: creates Level 1 (root) and Level 2 (audience groups) — 4 branches total
- **phase routers (/pre-plan, /spec, /plan, /dev):** Create Level 3 (phase) branches at phase start, PR + delete at phase end
- **start-workflow / finish-workflow:** Creates and closes Level 4 (workflow) branches
- **fix-state:** Detects and repairs topology drift
