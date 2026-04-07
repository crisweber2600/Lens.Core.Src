# LENS Workbench — Lifecycle Visual Guide

**Module:** lens-work v3.2  
**Schema Version:** 3.2  
**Last Updated:** April 1, 2026

This guide provides a complete visual reference for the LENS Workbench lifecycle — from initiative creation through dev-ready execution, including every slash command, branch, commit, artifact, and PR along the way.

---

## Table of Contents

1. [Full Lifecycle Overview](#full-lifecycle-overview)
2. [Initiative Scoping & Creation](#initiative-scoping--creation)
3. [Milestone & Phase Architecture](#milestone--phase-architecture)
4. [Phase-by-Phase Walkthrough](#phase-by-phase-walkthrough)
5. [Branch Topology — Control Repo](#branch-topology--control-repo)
6. [Branch Topology — Target Projects](#branch-topology--target-projects)
7. [Promotion & Gate Sequence](#promotion--gate-sequence)
8. [Track Profiles](#track-profiles)
9. [Command Reference Matrix](#command-reference-matrix)
10. [v3.1 Enhancements](#v31-enhancements)

---

## Full Lifecycle Overview

```mermaid
flowchart TB
    subgraph ONBOARD["🚀 Onboarding"]
        OB["/onboard<br/>Bootstrap control repo"]
    end

    subgraph INIT["📋 Initiative Creation"]
        NI["/create-initiative<br/>domain · service · feature"]
    end

    subgraph TECHPLAN_MS["Milestone: techplan"]
        PP["/preplan<br/>🤖 Mary · Analyst"]
        BP["/businessplan<br/>🤖 John · PM + Sally · UX"]
        TP["/techplan<br/>🤖 Winston · Architect"]
    end

    subgraph DEVPROPOSAL_MS["Milestone: devproposal"]
        DP["/devproposal<br/>🤖 John · PM"]
    end

    subgraph SPRINTPLAN_MS["Milestone: sprintplan"]
        SP["/sprintplan<br/>🤖 Bob · Scrum Master"]
    end

    subgraph DEVREADY["Milestone: dev-ready"]
        DV["/dev<br/>🔧 Delegation to target repos"]
    end

    subgraph DEVCOMPLETE["Milestone: dev-complete (v3.1)"]
        DC["Dev-completion review<br/>All epics merged"]
    end

    OB --> NI
    NI --> PP
    PP -->|"auto-advance"| BP
    BP -->|"auto-advance"| TP
    TP -->|"auto-advance + promote"| GATE1{{"⚔️ Adversarial<br/>Review Gate"}}
    GATE1 --> DP
    DP -->|"auto-advance + promote"| GATE2{{"👥 Stakeholder<br/>Approval Gate"}}
    GATE2 --> SP
    SP -->|"auto-advance + promote"| GATE3{{"⚖️ Constitution<br/>Gate"}}
    GATE3 --> DV
    DV -->|"all stories merged"| DC
    DC -->|"dev-completion review"| CLOSE["/close<br/>completed"]

    style ONBOARD fill:#e8f5e9,stroke:#4caf50
    style INIT fill:#e3f2fd,stroke:#2196f3
    style TECHPLAN_MS fill:#fff3e0,stroke:#ff9800
    style DEVPROPOSAL_MS fill:#fce4ec,stroke:#e91e63
    style SPRINTPLAN_MS fill:#f3e5f5,stroke:#9c27b0
    style DEVREADY fill:#e0f2f1,stroke:#009688
    style DEVCOMPLETE fill:#e8f5e9,stroke:#4caf50
    style CLOSE fill:#efebe9,stroke:#795548
    style GATE1 fill:#ffcdd2,stroke:#f44336
    style GATE2 fill:#ffcdd2,stroke:#f44336
    style GATE3 fill:#ffcdd2,stroke:#f44336
```

---

## Initiative Scoping & Creation

```mermaid
flowchart LR
    subgraph SCOPES["Initiative Scope Hierarchy"]
        D["🏢 Domain<br/><i>e.g. 'payments'</i><br/>Organizational container"]
        S["🔧 Service<br/><i>e.g. 'payments-gateway'</i><br/>Organizational container"]
        F["🎯 Feature<br/><i>e.g. 'payments-gateway-oauth'</i><br/>Has phases & milestones"]
    end

    D -->|"contains"| S
    S -->|"contains"| F

    NI["/create-initiative"]
    NI -->|"scope: domain"| D
    NI -->|"scope: service"| S
    NI -->|"scope: feature"| F

    style D fill:#fff9c4,stroke:#f9a825
    style S fill:#fff9c4,stroke:#f9a825
    style F fill:#c8e6c9,stroke:#388e3c
```

| Scope | Branch Created | Has Phases? | Config File |
|-------|---------------|-------------|-------------|
| Domain | `{domain}` | No | `_bmad-output/lens-work/initiatives/{domain}/initiative.yaml` |
| Service | `{domain}-{service}` | No | `_bmad-output/lens-work/initiatives/{domain}/{service}/initiative.yaml` |
| Feature | `{domain}-{service}-{feature}` | **Yes** | `_bmad-output/lens-work/initiatives/{domain}/{service}/{feature}.yaml` |

**On `/create-initiative` (feature scope):**
- **Branches created:** `{root}` (initiative root) + `{root}-techplan` (first milestone)
- **Commits:** `initiative.yaml` config file committed to `{root}` branch
- **Sensing:** Automatic cross-initiative overlap detection runs pre-creation

---

## Milestone & Phase Architecture

```mermaid
flowchart LR
    subgraph MS1["techplan milestone"]
        direction TB
        P1["preplan"]
        P2["businessplan"]
        P3["techplan"]
        P1 --> P2 --> P3
    end

    subgraph MS2["devproposal milestone"]
        P4["devproposal"]
    end

    subgraph MS3["sprintplan milestone"]
        P5["sprintplan"]
    end

    subgraph MS4["dev-ready milestone"]
        P6["dev<br/><i>(delegation, not a phase)</i>"]
    end

    subgraph MS5["dev-complete milestone (v3.1)"]
        P7["close<br/><i>(dev-completion review)</i>"]
    end

    MS1 -->|"Adversarial Review<br/>PR: techplan → devproposal"| MS2
    MS2 -->|"Stakeholder Approval<br/>PR: devproposal → sprintplan"| MS3
    MS3 -->|"Constitution Gate<br/>PR: sprintplan → dev-ready"| MS4
    MS4 -->|"All stories merged<br/>Dev-completion review"| MS5

    style MS1 fill:#fff3e0,stroke:#ff9800
    style MS2 fill:#fce4ec,stroke:#e91e63
    style MS3 fill:#f3e5f5,stroke:#9c27b0
    style MS4 fill:#e0f2f1,stroke:#009688
    style MS5 fill:#e8f5e9,stroke:#4caf50
    style P6 fill:#b2dfdb,stroke:#009688,stroke-dasharray: 5 5
    style P7 fill:#c8e6c9,stroke:#4caf50,stroke-dasharray: 5 5
```

**Key concepts:**
- **Phases** are work stages within a milestone where artifacts are produced
- **Milestones** are branches that collect phase artifacts and gate promotions via PRs
- **Lazy creation:** Only `{root}` and `{root}-techplan` exist at init. Higher milestone branches (`devproposal`, `sprintplan`, `dev-ready`) are created on-demand at promotion time

---

## Phase-by-Phase Walkthrough

### Phase 1: PrePlan (`/preplan`)

```mermaid
flowchart LR
    CMD["/preplan"] --> BRANCH["Branch:<br/>{root}-techplan"]
    BRANCH --> AGENT["🤖 Mary<br/>Analyst"]
    AGENT --> ARTIFACTS["📄 product-brief<br/>📄 research<br/>📄 brainstorm"]
    ARTIFACTS --> COMMIT["Commit artifacts<br/>to {root}-techplan"]
    COMMIT --> AUTO["Auto-advance → /businessplan"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style AGENT fill:#fff3e0,stroke:#ff9800
    style ARTIFACTS fill:#f1f8e9,stroke:#8bc34a
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/preplan` |
| **Agent** | Mary (Analyst) |
| **Working branch** | `{root}-techplan` |
| **Artifacts committed** | `product-brief.md`, `research.md`, `brainstorm.md` |
| **PR created** | None (stays on same milestone branch) |
| **Auto-advance** | → `/businessplan` (no promotion needed) |

---

### Phase 2: BusinessPlan (`/businessplan`)

```mermaid
flowchart LR
    CMD["/businessplan"] --> BRANCH["Branch:<br/>{root}-techplan"]
    BRANCH --> AGENT["🤖 John (PM)<br/>+ Sally (UX)"]
    AGENT --> ARTIFACTS["📄 prd<br/>📄 ux-design"]
    ARTIFACTS --> COMMIT["Commit artifacts<br/>to {root}-techplan"]
    COMMIT --> AUTO["Auto-advance → /techplan"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style AGENT fill:#fff3e0,stroke:#ff9800
    style ARTIFACTS fill:#f1f8e9,stroke:#8bc34a
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/businessplan` |
| **Agent** | John (PM), supporting: Sally (UX) |
| **Working branch** | `{root}-techplan` |
| **Artifacts committed** | `prd.md`, `ux-design.md` |
| **PR created** | None (stays on same milestone branch) |
| **Auto-advance** | → `/techplan` (no promotion needed) |

---

### Phase 3: TechPlan (`/techplan`)

```mermaid
flowchart LR
    CMD["/techplan"] --> BRANCH["Branch:<br/>{root}-techplan"]
    BRANCH --> AGENT["🤖 Winston<br/>Architect"]
    AGENT --> ARTIFACTS["📄 architecture"]
    ARTIFACTS --> COMMIT["Commit artifacts<br/>to {root}-techplan"]
    COMMIT --> PROMOTE["Auto-advance → /devproposal<br/>⚠️ auto_advance_promote: true"]
    PROMOTE --> PR["📬 PR: techplan → devproposal<br/>⚔️ Adversarial Review Gate"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style AGENT fill:#fff3e0,stroke:#ff9800
    style ARTIFACTS fill:#f1f8e9,stroke:#8bc34a
    style PR fill:#ffcdd2,stroke:#f44336
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/techplan` |
| **Agent** | Winston (Architect) |
| **Working branch** | `{root}-techplan` |
| **Artifacts committed** | `architecture.md` |
| **PR created** | `{root}-techplan` → `{root}-devproposal` (milestone promotion) |
| **Gate** | Adversarial review (party mode) |
| **Auto-advance** | → `/devproposal` (with auto promotion) |
| **Branch created** | `{root}-devproposal` (lazy, at promotion time) |

**Adversarial Review Participants:**
| Artifact | Lead | Participants | Focus |
|----------|------|-------------|-------|
| product-brief | John | John, Winston, Sally | Actionable? Buildable? User-centered? |
| prd | Winston | Winston, Mary, Sally | Buildable? Well-researched? UX-aligned? |
| ux-design | John | John, Winston, Mary | Serves requirements? Technically feasible? |
| architecture | John | John, Mary, Bob | Meets spec? Practical? Sprintable? |

---

### Phase 4: DevProposal (`/devproposal`)

```mermaid
flowchart LR
    CMD["/devproposal"] --> BRANCH["Branch:<br/>{root}-devproposal"]
    BRANCH --> AGENT["🤖 John<br/>PM"]
    AGENT --> ARTIFACTS["📄 epics<br/>📄 stories<br/>📄 implementation-readiness"]
    ARTIFACTS --> COMMIT["Commit artifacts<br/>to {root}-devproposal"]
    COMMIT --> PROMOTE["Auto-advance → /sprintplan<br/>⚠️ auto_advance_promote: true"]
    PROMOTE --> PR["📬 PR: devproposal → sprintplan<br/>👥 Stakeholder Approval Gate"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style AGENT fill:#fff3e0,stroke:#ff9800
    style ARTIFACTS fill:#f1f8e9,stroke:#8bc34a
    style PR fill:#ffcdd2,stroke:#f44336
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/devproposal` |
| **Agent** | John (PM) |
| **Working branch** | `{root}-devproposal` |
| **Artifacts committed** | `epics.md`, `stories.md`, `implementation-readiness.md` |
| **PR created** | `{root}-devproposal` → `{root}-sprintplan` (milestone promotion) |
| **Gate** | Stakeholder approval |
| **Auto-advance** | → `/sprintplan` (with auto promotion) |
| **Branch created** | `{root}-sprintplan` (lazy, at promotion time) |

---

### Phase 5: SprintPlan (`/sprintplan`)

```mermaid
flowchart LR
    CMD["/sprintplan"] --> BRANCH["Branch:<br/>{root}-sprintplan"]
    BRANCH --> AGENT["🤖 Bob<br/>Scrum Master"]
    AGENT --> ARTIFACTS["📄 sprint-status<br/>📄 story-files"]
    ARTIFACTS --> COMMIT["Commit artifacts<br/>to {root}-sprintplan"]
    COMMIT --> PROMOTE["Auto-advance → /dev<br/>⚠️ auto_advance_promote: true"]
    PROMOTE --> PR["📬 PR: sprintplan → dev-ready<br/>⚖️ Constitution Gate"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style AGENT fill:#fff3e0,stroke:#ff9800
    style ARTIFACTS fill:#f1f8e9,stroke:#8bc34a
    style PR fill:#ffcdd2,stroke:#f44336
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/sprintplan` |
| **Agent** | Bob (Scrum Master) |
| **Working branch** | `{root}-sprintplan` |
| **Artifacts committed** | `sprint-status.yaml`, individual story files |
| **PR created** | `{root}-sprintplan` → `{root}-dev-ready` (milestone promotion) |
| **Gate** | Constitution gate (4-level hierarchy) |
| **Auto-advance** | → `/dev` (with auto promotion) |
| **Branch created** | `{root}-dev-ready` (lazy, at promotion time) |

---

### Delegation: Dev (`/dev`)

```mermaid
flowchart LR
    CMD["/dev"] --> RESOLVE["Resolve target repo<br/>from initiative config"]
    RESOLVE --> TARGET["🔧 Target Project Repo<br/>{target_projects_path}/{domain}/{service}/{repo}"]
    TARGET --> EPICB["Branch: feature/{epic-key}"]
    EPICB --> STORYB["Branch: feature/{epic-key}-{story-key}"]
    STORYB --> IMPL["Implementation agents<br/>write code here"]
    IMPL --> STORYPR["📬 PR: story → epic<br/>Code review gate"]
    STORYPR --> EPICPR["📬 PR: epic → develop<br/>Feature-complete review"]

    style CMD fill:#e3f2fd,stroke:#2196f3
    style TARGET fill:#e0f2f1,stroke:#009688
    style STORYPR fill:#c8e6c9,stroke:#4caf50
    style EPICPR fill:#c8e6c9,stroke:#4caf50
```

| Detail | Value |
|--------|-------|
| **Slash command** | `/dev` |
| **NOT a lifecycle phase** | Delegation to implementation agents |
| **Working repo** | Target project (not control repo) |
| **Branches created** | `feature/{epic-key}`, `feature/{epic-key}-{story-key}` |
| **Commits** | Implementation code in target repo only |
| **PRs created** | Story → Epic (code review), Epic → develop (feature review) |
| **Control repo updates** | Sprint-status tracking only (in `_bmad-output/`) |

---

## Branch Topology — Control Repo

```mermaid
gitGraph
    commit id: "init control repo"
    branch payments-gateway-oauth
    commit id: "initiative.yaml"
    branch payments-gateway-oauth-techplan
    commit id: "product-brief.md"
    commit id: "prd.md + ux-design.md"
    commit id: "architecture.md"
    branch payments-gateway-oauth-devproposal
    commit id: "epics.md + stories.md"
    branch payments-gateway-oauth-sprintplan
    commit id: "sprint-status.yaml"
    commit id: "story-files"
    branch payments-gateway-oauth-dev-ready
    commit id: "promoted ✅"
```

### Branch Lifecycle Summary

| Branch | Created When | Contains | Merged Via |
|--------|-------------|----------|------------|
| `{root}` | `/create-initiative` | `initiative.yaml` config | — (initiative root) |
| `{root}-techplan` | `/create-initiative` | PrePlan + BusinessPlan + TechPlan artifacts | PR → `{root}-devproposal` |
| `{root}-devproposal` | First promotion (lazy) | DevProposal artifacts | PR → `{root}-sprintplan` |
| `{root}-sprintplan` | Second promotion (lazy) | SprintPlan artifacts | PR → `{root}-dev-ready` |
| `{root}-dev-ready` | Third promotion (lazy) | All accumulated artifacts | — (execution baseline) |

### PR Summary — Control Repo

| PR | Source → Target | Gate | When Created |
|----|----------------|------|-------------|
| Milestone promotion 1 | `{root}-techplan` → `{root}-devproposal` | ⚔️ Adversarial review | After `/techplan` completes |
| Milestone promotion 2 | `{root}-devproposal` → `{root}-sprintplan` | 👥 Stakeholder approval | After `/devproposal` completes |
| Milestone promotion 3 | `{root}-sprintplan` → `{root}-dev-ready` | ⚖️ Constitution gate | After `/sprintplan` completes |

---

## Branch Topology — Target Projects

```mermaid
gitGraph
    commit id: "main"
    branch develop
    commit id: "develop base"
    branch feature/EPIC-1
    commit id: "epic scaffold"
    branch feature/EPIC-1-STORY-1
    commit id: "implement story 1"
    commit id: "tests + docs"
    checkout feature/EPIC-1
    merge feature/EPIC-1-STORY-1 id: "PR: story → epic"
    branch feature/EPIC-1-STORY-2
    commit id: "implement story 2"
    checkout feature/EPIC-1
    merge feature/EPIC-1-STORY-2 id: "PR: story → epic"
    checkout develop
    merge feature/EPIC-1 id: "PR: epic → develop"
    branch release/1.0
    commit id: "release prep"
    checkout main
    merge release/1.0 id: "PR: release → main"
```

| PR | Source → Target | Gate |
|----|----------------|------|
| Story completion | `feature/{epic}-{story}` → `feature/{epic}` | Code review |
| Epic completion | `feature/{epic}` → `develop` | Feature-complete review |
| Release cut | `develop` → `release/{version}` | Release readiness |
| Production deploy | `release/{version}` → `main` | Production gate |

---

## Promotion & Gate Sequence

```mermaid
sequenceDiagram
    participant User
    participant LENS as @lens Agent
    participant Git as Git (Control Repo)
    participant API as GitHub REST API
    participant Review as Reviewers

    Note over User,Review: Phase work (preplan → businessplan → techplan)
    User->>LENS: /techplan
    LENS->>Git: Commit architecture.md to {root}-techplan
    LENS->>LENS: auto_advance_promote: true
    LENS->>Git: Create branch {root}-devproposal (lazy)
    LENS->>API: POST /repos/.../pulls (techplan → devproposal)
    API-->>LENS: PR #42 created
    LENS-->>User: PR ready for adversarial review

    Note over User,Review: Adversarial Review Gate (party mode)
    Review->>API: Review + Approve PR #42
    User->>LENS: /promote
    LENS->>LENS: Verify PR merged + sensing check
    LENS-->>User: Promoted to devproposal milestone

    Note over User,Review: DevProposal phase
    User->>LENS: /devproposal
    LENS->>Git: Commit epics + stories to {root}-devproposal
    LENS->>Git: Create branch {root}-sprintplan (lazy)
    LENS->>API: POST /repos/.../pulls (devproposal → sprintplan)
    API-->>LENS: PR #43 created

    Note over User,Review: Stakeholder Approval Gate
    Review->>API: Review + Approve PR #43
    User->>LENS: /promote

    Note over User,Review: SprintPlan phase
    User->>LENS: /sprintplan
    LENS->>Git: Commit sprint-status + stories to {root}-sprintplan
    LENS->>Git: Create branch {root}-dev-ready (lazy)
    LENS->>API: POST /repos/.../pulls (sprintplan → dev-ready)

    Note over User,Review: Constitution Gate
    Review->>API: Review + Approve PR #44
    User->>LENS: /dev (delegated to target repo)
```

---

## Track Profiles

```mermaid
gantt
    title Lifecycle Tracks — Phase Coverage
    dateFormat X
    axisFormat %s

    section full
    preplan           :a1, 0, 1
    businessplan      :a2, 1, 2
    techplan          :a3, 2, 3
    devproposal       :a4, 3, 4
    sprintplan        :a5, 4, 5

    section feature
    businessplan      :b1, 1, 2
    techplan          :b2, 2, 3
    devproposal       :b3, 3, 4
    sprintplan        :b4, 4, 5

    section tech-change
    techplan          :c1, 2, 3
    devproposal       :c2, 3, 4
    sprintplan        :c3, 4, 5

    section hotfix
    techplan          :d1, 2, 3

    section hotfix-express
    techplan          :g1, 2, 3

    section spike
    preplan           :e1, 0, 1

    section quickdev
    devproposal       :f1, 3, 4

    section express
    expressplan       :h1, 0, 1
```

| Track | Phases | Milestones | Start | Use Case |
|-------|--------|-----------|-------|----------|
| **full** | preplan → businessplan → techplan → devproposal → sprintplan | techplan, devproposal, sprintplan, dev-ready | `/preplan` | Complete lifecycle |
| **feature** | businessplan → techplan → devproposal → sprintplan | techplan, devproposal, sprintplan, dev-ready | `/businessplan` | Known business context |
| **tech-change** | techplan → devproposal → sprintplan | techplan, devproposal, sprintplan, dev-ready | `/techplan` | Pure technical change |
| **hotfix** | techplan | techplan, dev-ready | `/techplan` | Urgent fix |
| **hotfix-express** | techplan | techplan, dev-ready | `/techplan` | Critical fix — bypasses constitution + adversarial review |
| **spike** | preplan | techplan | `/preplan` | Research only |
| **quickdev** | devproposal | devproposal, dev-ready | `/devproposal` | Rapid execution |
| **express** | expressplan | — (no milestones) | `/expressplan` | Solo/small — combined planning, no PRs |

---

## Command Reference Matrix

### Phase Commands

| Command | Code | Phase | Agent | Branch | Artifacts | PR Created | Auto-Advance |
|---------|------|-------|-------|--------|-----------|-----------|--------------|
| `/preplan` | PP | PrePlan | Mary (Analyst) | `{root}-techplan` | product-brief, research, brainstorm | — | → `/businessplan` |
| `/businessplan` | BP | BusinessPlan | John (PM) + Sally (UX) | `{root}-techplan` | prd, ux-design | — | → `/techplan` |
| `/techplan` | TP | TechPlan | Winston (Architect) | `{root}-techplan` | architecture | techplan → devproposal | → `/devproposal` (promote) |
| `/devproposal` | DP | DevProposal | John (PM) | `{root}-devproposal` | epics, stories, readiness | devproposal → sprintplan | → `/sprintplan` (promote) |
| `/sprintplan` | SP | SprintPlan | Bob (Scrum Master) | `{root}-sprintplan` | sprint-status, story-files | sprintplan → dev-ready | → `/dev` (promote) |
| `/dev` | DV | *(delegation)* | Implementation agents | Target repo branches | Code in target project | Story → epic, epic → develop | — |

### Utility Commands

| Command | Code | Purpose | Branches Affected | Output |
|---------|------|---------|-------------------|--------|
| `/onboard` | OB | Bootstrap control repo | None | `profile.yaml` |
| `/create-initiative` | NI | Create domain/service/feature | `{root}` + `{root}-techplan` | `initiative.yaml` |
| `/status` | ST | Show git-derived state | None (read-only) | Console output |
| `/next` | NX | Recommend next action | None (read-only) | Console output |
| `/switch` | SW | Change active initiative | Checkout existing branch | — |
| `/help` | HP | Show commands + version | None | Console output |
| `/discover` | DS | Inspect TargetProjects repos | None | `discovery-report` |
| `/module-management` | MM | Check/update module version | None | Console output |
| `/close` | CL | Complete/abandon/supersede | None (state change) | Close state |
| `/lens-upgrade` | UG | Migrate schema version | May update configs | Updated configs |
| `/dashboard` | DB | Cross-initiative status + Gantt | None (read-only) | Consolidated overview |

### Governance Commands

| Command | Code | Purpose | Gate Type | Sensing |
|---------|------|---------|-----------|---------|
| `/promote` | PR | Promote milestone (approval-only) | Per-milestone gate | Auto at promotion |
| `/sense` | SN | Cross-initiative detection (content-aware) | Informational or hard gate | On-demand |
| `/constitution` | CN | Resolve governance | 4-level hierarchy | — |

---

## Complete Artifact Inventory

| Phase | Artifact | File Pattern | Location |
|-------|----------|-------------|----------|
| PrePlan | Product Brief | `product-brief.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| PrePlan | Research | `research.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| PrePlan | Brainstorm | `brainstorm.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| BusinessPlan | PRD | `prd.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| BusinessPlan | UX Design | `ux-design.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| TechPlan | Architecture | `architecture.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| DevProposal | Epics | `epics.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| DevProposal | Stories | `stories.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| DevProposal | Readiness | `implementation-readiness.md` | `_bmad-output/lens-work/initiatives/{path}/` |
| SprintPlan | Sprint Status | `sprint-status.yaml` | `_bmad-output/lens-work/initiatives/{path}/` |
| SprintPlan | Story Files | `story-{id}.md` | `_bmad-output/lens-work/initiatives/{path}/` |

---

## Constitution Governance

```mermaid
flowchart TB
    L1["🌐 Level 1: org/constitution.md<br/><i>Universal defaults</i>"]
    L2["🏢 Level 2: {domain}/constitution.md<br/><i>Domain-specific</i>"]
    L3["🔧 Level 3: {domain}/{service}/constitution.md<br/><i>Service-specific</i>"]
    L4["📦 Level 4: {domain}/{service}/{repo}/constitution.md<br/><i>Repo-specific</i>"]

    L1 -->|"additive inheritance"| L2
    L2 -->|"additive inheritance"| L3
    L3 -->|"additive inheritance"| L4

    L4 --> RESOLVE["⚖️ Resolved Constitution<br/><i>Lower levels add, never remove</i>"]
    RESOLVE --> CAPS["Capabilities:<br/>• permitted_tracks<br/>• required_gates<br/>• additional_review_participants<br/>• required_artifacts<br/>• enforce_stories<br/>• gate_collapsing (v3.1)<br/>• parallel_phases (v3.1)<br/>• bypass_gates (v3.1)<br/>• dev_completion_requirements (v3.1)"]

    style L1 fill:#e8eaf6,stroke:#3f51b5
    style L2 fill:#c5cae9,stroke:#3f51b5
    style L3 fill:#9fa8da,stroke:#3f51b5
    style L4 fill:#7986cb,stroke:#3f51b5,color:#fff
    style RESOLVE fill:#e0f2f1,stroke:#009688
```

---

## v3.1 Enhancements

All 10 improvement suggestions from the original v3.0 visual guide have been implemented in v3.1. See [v3.1-improvements.md](v3.1-improvements.md) for full details.

| # | Improvement | Schema Key | Status |
|---|------------|-----------|--------|
| 1 | Promote as approval-only | `promote_semantics` | ✅ Implemented |
| 2 | Squash-merge + branch cleanup | `branch_cleanup` | ✅ Implemented |
| 3 | Express hotfix track | `tracks.hotfix-express` | ✅ Implemented |
| 4 | Parallel phase execution | `parallel_phases` | ✅ Implemented |
| 5 | Per-artifact validation hooks | `artifact_validation_hooks` | ✅ Implemented |
| 6 | Content-aware sensing | `content_aware_sensing` | ✅ Implemented |
| 7 | Dashboard command | `/dashboard` workflow | ✅ Implemented |
| 8 | Template artifact starters | `assets/templates/` | ✅ Implemented |
| 9 | dev-complete milestone | `milestones.dev-complete` | ✅ Implemented |
| 10 | Gate collapsing | `gate_collapsing` | ✅ Implemented |
