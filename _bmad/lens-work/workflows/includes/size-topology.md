---
name: size-topology
description: Branch hierarchy, audience promotion chain, and merge strategies for lens-work
type: include
imports: lifecycle.yaml
---

# Branch Topology Reference (v2 — Lifecycle Contract)

This document defines the branch hierarchy used by lens-work to manage initiative lifecycle branches. All branch operations are orchestrated by the git-orchestration skill and triggered through @lens phase commands. The authoritative source for phase definitions, audience roles, and track configurations is `lifecycle.yaml`.

**Branch naming convention:** `{initiative_root}-{audience}-{phase_name}-{workflow}`

---

## Branch Hierarchy (5 Levels)

```
Level 0:  Domain           {domain_prefix}                                         (domain-layer only)
Level 0s: Service          {domain_prefix}-{service_prefix}                         (service-layer only)
Level 1:  Initiative Root  {initiative_root}                                        (base / done state)
Level 2:  Audiences        {initiative_root}-small, -medium, -large
Level 3:  Phases           {initiative_root}-{audience}-{phase_name}
Level 4:  Workflows        {initiative_root}-{audience}-{phase_name}-{workflow}
```

Where `{initiative_root}` = `{domain_prefix}-{service_prefix}-{initiative_id}` (service parent)
  or `{domain_prefix}-{service_prefix}-{repo}-{initiative_id}` (multi-repo)
  or `{domain_prefix}-{initiative_id}` (domain parent, no service)

> **v2 change:** `{initiative_root}` replaces the legacy `{featureBranchRoot}`. Named phase segments (e.g., `-preplan-`) replace numbered segments (e.g., `-p1-` through `-p4-`).

---

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

### Level 1: Initiative Root (base)

```
{initiative_root}
```

Root branch for the initiative. Created at init via `init-initiative` workflow. All work merges here eventually through the audience promotion chain. This branch represents the **"done" state** of the initiative — the base audience level.

**Rules:**
- Created from `main` (or current HEAD) at initiative start
- Never worked on directly — only receives merges from audience branches
- Protected: requires constitution gate (constitution skill validation) for final promotion
- One root branch per initiative
- Pushed to remote immediately on creation

---

### Level 2: Audience Groups

```
{initiative_root}-small     # IC creation work (preplan, businessplan, techplan)
{initiative_root}-medium    # Lead review (devproposal)
{initiative_root}-large     # Stakeholder approval (sprintplan)
```

Audiences are the primary progression axis in the lifecycle. Phases happen WITHIN audiences. Promotion between audiences IS the review gate. Audience assignments are derived from the initiative's track via `lifecycle.yaml`.

#### Audience Definitions (from lifecycle.yaml)

| Audience | Role | Phases Within | Entry Gate | Created At |
|----------|------|---------------|------------|------------|
| `small` | IC creation work | preplan, businessplan, techplan | (none — starting audience) | `init-initiative` |
| `medium` | Lead review | devproposal | adversarial-review (party mode) | `init-initiative` |
| `large` | Stakeholder approval | sprintplan | stakeholder-approval | `init-initiative` |
| `base` | Ready for execution | (none) | constitution-gate (constitution skill) | = initiative root |

> **v2 change:** In the legacy model, phases p2/p3 mapped to medium/large audiences. In v2, ALL creation phases (preplan, businessplan, techplan) live in `small`. Audience promotions happen BETWEEN creation and review phases.

#### Audience Behaviors

**small group (`{initiative_root}-small`):**
- Primary working group where all planning artifacts are created
- Phase branches (e.g., `-small-preplan`) branch from and merge back to this group
- Contains 3 phases: preplan (Mary/Analyst), businessplan (John/PM + Sally/UX), techplan (Winston/Architect)
- After all small phases complete → adversarial review gate → PR to `medium`

**medium group (`{initiative_root}-medium`):**
- Receives promoted content from `small` after adversarial review (party mode)
- Contains 1 phase: devproposal (John/PM) — epics, stories, readiness check
- After devproposal complete → stakeholder approval gate → PR to `large`

**large group (`{initiative_root}-large`):**
- Receives promoted content from `medium` after stakeholder sign-off
- Contains 1 phase: sprintplan (Bob/SM) — sprint status, story files
- After sprintplan complete → constitution gate (constitution skill) → PR to initiative root (base)

#### Track-Aware Audience Creation

Not all tracks create all audiences. The initiative's track (from lifecycle.yaml) determines which audiences are created at init:

| Track | Audiences Created | Notes |
|-------|-------------------|-------|
| full | small, medium, large | All audiences |
| feature | small, medium, large | All audiences |
| tech-change | small, medium, large | medium/large may be constitution-controlled |
| hotfix | small | Promotes directly to base (constitution-gated) |
| spike | small | No promotion — research only |

---

### Level 3: Phases

```
{initiative_root}-{audience}-preplan         # Analysis (Mary/Analyst)
{initiative_root}-{audience}-businessplan    # Business planning (John/PM + Sally/UX)
{initiative_root}-{audience}-techplan        # Technical design (Winston/Architect)
{initiative_root}-{audience}-devproposal     # Implementation proposal (John/PM)
{initiative_root}-{audience}-sprintplan      # Sprint planning (Bob/SM)
```

Phases are sequential workflow stages within an audience group. Each phase branch is created by the corresponding phase router workflow (e.g., `/preplan` creates `-small-preplan`). **All phase branches are pushed to remote immediately on creation.**

**Phase lifecycle:** At the START of a phase, the phase branch is created from the audience group branch and pushed. At the END of the phase, a PR is created from the phase branch into the audience group branch, then the phase branch is deleted locally and the audience group branch is checked out.

#### Phase Definitions (from lifecycle.yaml)

| Phase | Display Name | Agent | Agent Role | Audience | Key Artifacts | Trigger |
|-------|-------------|-------|------------|----------|---------------|---------|
| preplan | PrePlan | Mary | Analyst | small | product-brief, research, brainstorm | `/preplan` |
| businessplan | BusinessPlan | John (+Sally) | PM | small | prd, ux-design | `/businessplan` |
| techplan | TechPlan | Winston | Architect | small | architecture | `/techplan` |
| devproposal | DevProposal | John | PM | medium | epics, stories, implementation-readiness | `/devproposal` |
| sprintplan | SprintPlan | Bob | Scrum Master | large | sprint-status, story-files | `/sprintplan` |

#### Phase Progression Rules

1. **Sequential within audience:** Phases within the same audience must complete in order
2. **Audience gates between groups:** All phases in an audience must complete before promotion to the next audience
3. **Completion = PR merged:** A phase is complete when its PR into the audience group is merged
4. **Ancestry check:** `git merge-base --is-ancestor origin/{phase_branch} origin/{audience_branch}`
5. **Lazy-created:** Phase branches are created by their phase router workflow on first access (NOT at init)
6. **Immediate push:** All phase branches pushed to remote on creation
7. **PR + delete:** At phase end, PR into audience group, delete phase branch, checkout audience

#### Phase-Audience Mapping (canonical, from lifecycle.yaml)

```
small audience:    preplan → businessplan → techplan
                   ↓ (adversarial review — party mode)
medium audience:   devproposal
                   ↓ (stakeholder approval)
large audience:    sprintplan
                   ↓ (constitution gate — constitution skill)
base:              initiative root (ready for execution)
```

---

### Level 4: Workflows

```
{initiative_root}-{audience}-{phase_name}-{workflow_name}
```

Workflow branches represent individual units of work within a phase. They are created by `start-workflow` and merged back to the phase branch by `finish-workflow`. **All workflow branches are pushed to remote immediately on creation.**

#### Workflow Naming

| Phase | Workflow Name | Full Branch Example |
|-------|---------------|---------------------|
| preplan | `brainstorm` | `{initiative_root}-small-preplan-brainstorm` |
| preplan | `research` | `{initiative_root}-small-preplan-research` |
| preplan | `product-brief` | `{initiative_root}-small-preplan-product-brief` |
| businessplan | `prd` | `{initiative_root}-small-businessplan-prd` |
| businessplan | `ux-design` | `{initiative_root}-small-businessplan-ux-design` |
| techplan | `architecture` | `{initiative_root}-small-techplan-architecture` |
| devproposal | `epics` | `{initiative_root}-medium-devproposal-epics` |
| devproposal | `stories` | `{initiative_root}-medium-devproposal-stories` |
| devproposal | `readiness-check` | `{initiative_root}-medium-devproposal-readiness-check` |
| sprintplan | `sprint-status` | `{initiative_root}-large-sprintplan-sprint-status` |
| sprintplan | `story-files` | `{initiative_root}-large-sprintplan-story-files` |

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
                          WITHIN AUDIENCE                                    BETWEEN AUDIENCES
Workflow ──squash──► Phase ──PR+delete──► Audience ──promotion PR+gate──► Audience ──promotion PR+gate──► Root
 (-{aud}-{phase}-{wf})  (-{aud}-{phase})     (small/medium/large)          (medium/large)                 (base)
```

### Detailed Merge Table

| From → To | Branch Pattern | Strategy | Gate Required | Automation |
|-----------|----------------|----------|---------------|------------|
| workflow → phase | `-{aud}-{phase}-{wf}` → `-{aud}-{phase}` | Squash merge | No (auto) | `finish-workflow` |
| phase → audience | `-{aud}-{phase}` → `-{aud}` | PR + delete phase branch | Phase gate | `finish-phase` PR |
| small → medium | `-small` → `-medium` | PR merge | Adversarial review (party mode) | `audience-promotion` |
| medium → large | `-medium` → `-large` | PR merge | Stakeholder approval | `audience-promotion` |
| large → root (base) | `-large` → `{initiative_root}` | PR merge | Constitution gate (constitution skill) | `audience-promotion` |

### Phase Transition Flow (Full Track)

```
SMALL AUDIENCE (IC creation)
┌──────────┐  PR+del   ┌──────────────┐  PR+del   ┌──────────┐
│ PrePlan  │ ────────► │ BusinessPlan │ ────────► │ TechPlan │
│  (Mary)  │           │ (John+Sally) │           │(Winston) │
└──────────┘           └──────────────┘           └──────────┘
                                                       │
                                          ═════════════╪═══════════════════
                                          ADVERSARIAL REVIEW (party mode)
                                          ═════════════╪═══════════════════
                                                       ▼
MEDIUM AUDIENCE (Lead review)                   ┌─────────────┐
                                                │ DevProposal │
                                                │   (John)    │
                                                └──────┬──────┘
                                                       │
                                          ═════════════╪═══════════════════
                                          STAKEHOLDER APPROVAL
                                          ═════════════╪═══════════════════
                                                       ▼
LARGE AUDIENCE (Stakeholder)                    ┌────────────┐
                                                │ SprintPlan │
                                                │   (Bob)    │
                                                └──────┬─────┘
                                                       │
                                          ═════════════╪═══════════════════
                                          CONSTITUTION GATE (constitution skill)
                                          ═════════════╪═══════════════════
                                                       ▼
BASE                                            ┌──────────────┐
                                                │ Initiative   │
                                                │ Root (Done)  │
                                                └──────────────┘
```

### Audience Promotion Gates (from lifecycle.yaml)

| Promotion | Gate Type | Trigger | Review Mode |
|-----------|-----------|---------|-------------|
| small → medium | adversarial-review | All small phases complete (preplan, businessplan, techplan) | Party mode — multi-agent group review |
| medium → large | stakeholder-approval | All medium phases complete (devproposal) | Stakeholder sign-off |
| large → base | constitution-gate | All large phases complete (sprintplan) | Constitution skill validates compliance |
| small → base (hotfix) | constitution-gate | All small phases complete (techplan only) | Constitution skill adversarial review |

### Phase Branch Lifecycle

At each phase:
1. **Start:** Create phase branch from audience group → push immediately
2. **Work:** All workflow branches created from phase branch
3. **End:** Create PR from phase branch into audience group → delete phase branch locally → checkout audience group

### Merge Validation

Before any merge, git-orchestration validates:

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

git-orchestration validates branch names against these patterns:

```regex
# Domain-layer branches (domain-only):
^[a-z0-9-]+$

# Service-layer branches (domain-service):
^[a-z0-9-]+-[a-z0-9-]+$

# Feature-layer initiative and audience branches:
# {initiative_root} or {initiative_root}-{audience}
^[a-z0-9-]+(-[a-z0-9-]+)*$

# Feature-layer phase branches (v2 named phases):
# {initiative_root}-{audience}-{phase_name}
^[a-z0-9-]+-(?:small|medium|large)-(?:preplan|businessplan|techplan|devproposal|sprintplan)$

# Feature-layer workflow branches (v2 named phases):
# {initiative_root}-{audience}-{phase_name}-{workflow}
^[a-z0-9-]+-(?:small|medium|large)-(?:preplan|businessplan|techplan|devproposal|sprintplan)-[a-z0-9-]+$

# Branch patterns use named phases only (v2.0.0)
```

> **Note:** All branches are flat (no `/` separators). git-orchestration determines the layer from the initiative config to select the appropriate validation regex.

### Parsing Branch Components

Branch names are flat hyphen-separated. Parsing requires knowledge of the `initiative_root` (stored in initiative config) to extract components:

```bash
# Example: bmaddomain-lens-rate-limit-x7k2m9-small-preplan-brainstorm
# initiative_root = "bmaddomain-lens-rate-limit-x7k2m9" (from initiative config)

# Strip initiative_root prefix to get segment
initiative_root="bmaddomain-lens-rate-limit-x7k2m9"
branch="bmaddomain-lens-rate-limit-x7k2m9-small-preplan-brainstorm"
segment="${branch#${initiative_root}-}"  # small-preplan-brainstorm

# Parse segment
audience=$(echo "$segment" | cut -d'-' -f1)     # small
phase_name=$(echo "$segment" | cut -d'-' -f2)    # preplan
workflow=$(echo "$segment" | cut -d'-' -f3-)     # brainstorm

# For audience-only branches (e.g., "-small"):
# phase_name and workflow will be empty
```

### Detecting Legacy vs New Naming

```bash
# After stripping initiative_root prefix:
if [[ "$segment" =~ ^(small|medium|large)-p[0-9]+ ]]; then
  # Legacy naming: translate via lifecycle-adapter
  echo "Legacy branch detected — use adapter translation"
elif [[ "$segment" =~ ^(small|medium|large)-(preplan|businessplan|techplan|devproposal|sprintplan) ]]; then
  # New v2 naming
  echo "v2 branch naming"
fi
```

---

## Track-Specific Topologies

Different tracks produce different branch topologies. The full track creates all branches; shorter tracks skip audiences and phases.

### Full Track
```
{initiative_root}
├── {initiative_root}-small
│   ├── {initiative_root}-small-preplan
│   ├── {initiative_root}-small-businessplan
│   └── {initiative_root}-small-techplan
├── {initiative_root}-medium
│   └── {initiative_root}-medium-devproposal
└── {initiative_root}-large
    └── {initiative_root}-large-sprintplan
```

### Feature Track (skip preplan)
```
{initiative_root}
├── {initiative_root}-small
│   ├── {initiative_root}-small-businessplan
│   └── {initiative_root}-small-techplan
├── {initiative_root}-medium
│   └── {initiative_root}-medium-devproposal
└── {initiative_root}-large
    └── {initiative_root}-large-sprintplan
```

### Tech-Change Track (techplan + sprintplan only)
```
{initiative_root}
├── {initiative_root}-small
│   └── {initiative_root}-small-techplan
├── {initiative_root}-medium    (constitution-controlled)
└── {initiative_root}-large     (constitution-controlled)
    └── {initiative_root}-large-sprintplan
```

### Hotfix Track (techplan → base)
```
{initiative_root}
└── {initiative_root}-small
    └── {initiative_root}-small-techplan
```
> Promotes directly from small → base (initiative root) via constitution-gated adversarial review.

### Spike Track (preplan only, no promotion)
```
{initiative_root}
└── {initiative_root}-small
    └── {initiative_root}-small-preplan
```
> Research only — no audience promotion, no merge to base.

---

## Governance Branch Tier (`universal/*`)

The `universal/*` branch tier is **orthogonal to the initiative hierarchy** — it lives in the
**`bmad.lens.governance` repo** (local: `TargetProjects/lens/lens-governance`), not in the
control repo. These branches never appear in the 5-level initiative topology above.

```
Governance repo: bmad.lens.governance
  {default-branch}                     ← canonical governance state
  └── universal/{slug}              ← proposed governance change (PR target: default branch)
      Examples:
        universal/org-constitution-v1
        universal/amendment-2026-03-constitution
        universal/policy-hotfix-branching
```

**Rules:**

| Rule | Detail |
|------|--------|
| Scope | Only applies to `bmad.lens.governance` — never to the control repo or target repos |
| Merge target | Always the default branch (typically `main`) in the governance repo |
| PR required | **Yes for constitution changes only** — all other files (roster, policies) may be committed directly to the default branch |
| Initiative branches | MUST NOT contain commits to `TargetProjects/lens/lens-governance/` ever |
| Agent enforcement | `branch-preflight` blocks constitution writes if current branch is not `universal/*`; allows direct default-branch commits for roster and policies |
| Audience/phase gates | Not applicable — governance is not audience-gated |
| Who creates | `amendment-propagation` workflow for constitution changes; `onboarding` workflow for roster; other workflows for policies |

**Direct Commit to Default Branch (No PR Required):**
- Roster updates (`.yaml` files under `roster/`)
- Policy updates and revisions (`.yaml`/`.md` files under `policies/`)
- Configuration and metadata changes

**Pull Request Required (Via `universal/*` Branch):**
- Constitution changes (`.md` files under `constitutions/`)
- Governance rule amendments
- Org-level policy frameworks

**Why a separate repo and branch tier?**

When contributors work on an initiative branch (`{initiative_root}-small-techplan`, etc.) in the
control repo, any governance changes (e.g., amending the org constitution) committed there are
invisible to all other initiatives.  By routing governance writes to a standalone repo with its
own `universal/*` → default branch path, governance rules propagate to every downstream control repo clone
the next time it pulls from `bmad.lens.governance/default-branch`.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Initiative ID collision | Regenerate random suffix, prompt user |
| Branch already exists | Skip creation, checkout existing |
| Orphaned workflow branch | Detected by `fix-state`, prompted for cleanup |
| Phase skipped | Blocked — sequential enforcement is strict within audience |
| Multiple active workflows | Blocked — one workflow per phase at a time |
| Audience promotion before phases complete | Blocked — all phases in audience must be complete |
| Legacy p{N} branch detected | Translate via lifecycle-adapter, warn user |
| Track doesn't include requested phase | Blocked — phase not in track's active_phases |

---

## Related Workflows

- **init-initiative:** Domain: creates Level 0 branch. Service: creates Level 0s branch. Feature: creates Level 1 (root) and Level 2 (audience groups) — branch count depends on track
- **phase routers (/preplan, /businessplan, /techplan, /devproposal, /sprintplan):** Create Level 3 (phase) branches at phase start, PR + delete at phase end
- **start-workflow / finish-workflow:** Creates and closes Level 4 (workflow) branches
- **audience-promotion:** Handles small→medium→large→base promotion gates
- **fix-state:** Detects and repairs topology drift
- **lifecycle-adapter (include):** Translation tables for legacy p{N} ↔ named phase interop
