# Router Workflows — Phase Commands (v2 Lifecycle Contract)

**Module:** lens-work
**Category:** router (user-facing)
**Agent:** @lens
**Status:** Specification
**Lifecycle Version:** 2 (named phases, audience-as-promotion-backbone)

---

## Overview

Router workflows are the user-facing phase commands that map to BMAD lifecycle phases. Each command:

1. Validates prerequisites (layer detected, gates passed, audience promotion complete)
2. Invokes git-orchestration skill to manage git branches (named phase branches)
3. Routes to appropriate BMM/CIS/TEA workflows
4. Tracks progress via state-management skill (dual-write: state.yaml + initiative config)

### Lifecycle Flow

```
/preplan → /businessplan → /techplan → [small→medium] → /devproposal → [medium→large] → /sprintplan → [large→base] → /dev
```

### Audience Progression

```
small (IC creation: preplan, businessplan, techplan)
  → medium (lead review: devproposal) [gate: adversarial-review]
    → large (stakeholder: sprintplan) [gate: stakeholder-approval]
      → base (ready for execution) [gate: constitution-gate]
```

---

## Workflow: preplan (`/preplan`)

**Legacy alias:** `/pre-plan`

### Phase

PrePlan — audience: small, agent: Mary (Analyst)

### Role Authorization

PO, Architect, Tech Lead

### BMM Workflows Invoked

- Brainstorming (optional, CIS)
- Research (optional, CIS)
- Product Brief

### Sequence

1. Validate layer detected
2. git-orchestration: start-phase (if needed), start-workflow
3. Route to brainstorming/research (if requested)
4. Route to product-brief workflow
5. git-orchestration: finish-workflow
6. Offer: continue to /businessplan or pause

---

## Workflow: businessplan (`/businessplan`)

**Legacy alias:** `/spec`

### Phase

BusinessPlan — audience: small, agent: John (PM) + Sally (UX Designer)

### Role Authorization

PO, Architect, Tech Lead

### BMM Workflows Invoked

- PRD
- UX Design (if applicable)

### Sequence

1. Validate /preplan complete (preplan merged into small audience branch)
2. git-orchestration: start-phase, start-workflow
3. Route to PRD workflow
4. Route to UX workflow (if UI involved)
5. git-orchestration: finish-workflow
6. Offer: continue to /techplan or pause

---

## Workflow: techplan (`/techplan`)

**Legacy alias:** `/tech-plan`

### Phase

TechPlan — audience: small, agent: Winston (Architect)

### Role Authorization

Architect, Tech Lead

### BMM Workflows Invoked

- Architecture document
- Technology decisions
- API contracts (optional)

### Sequence

1. Validate /businessplan complete (businessplan merged into small audience branch)
2. git-orchestration: start-phase, start-workflow
3. Route to architecture design workflow
4. Route to technology decisions workflow
5. Optional: Route to API contracts workflow
6. git-orchestration: finish-workflow
7. Offer: run @lens next (or /devproposal); promotion auto-triggers when required

---

## Workflow: devproposal (`/devproposal`)

**Legacy alias:** `/plan`

### Phase

DevProposal — audience: medium, agent: John (PM)

### Role Authorization

PO, Architect, Tech Lead

### Prerequisites

- All small-audience phases complete (preplan, businessplan, techplan)
- Audience promotion (small → medium) complete — adversarial review gate passed

### BMM Workflows Invoked

- Epics
- Stories
- Readiness checklist

### Sequence

1. Validate audience promotion (small → medium) complete
2. git-orchestration: start-phase, start-workflow
3. Route to Epics workflow (with adversarial + party mode stress gate)
4. Route to Stories workflow
5. Route to Readiness workflow
6. git-orchestration: finish-workflow
7. Offer: run @lens next (or /sprintplan); promotion auto-triggers when required

---

## Workflow: sprintplan (`/sprintplan`)

**Legacy alias:** `/review`

### Phase

SprintPlan — audience: large, agent: Bob (Scrum Master)

### Role Authorization

Scrum Master (phase owner)

### Prerequisites

- DevProposal phase complete
- Audience promotion (medium → large) complete — stakeholder approval gate passed

### BMM Workflows Invoked

- Readiness re-validation
- Sprint planning
- Dev story creation

### Sequence

1. Validate audience promotion (medium → large) complete
2. Re-run readiness checklist
3. Sprint planning (prioritize stories, allocate capacity)
4. Create dev-ready story
5. Hand off to Developer
6. Offer: run @lens next (or /dev); promotion auto-triggers when required

---

## Workflow: dev (`/dev`)

### Phase

Implementation — audience: base (post all promotions)

### Role Authorization

Developer (post-sprintplan only)

### BMM Workflows Invoked

- Dev story execution
- Code review
- Retro (optional)

### Sequence

1. Validate audience promotion (large → base) complete — constitution gate passed
2. git-orchestration: checkout TargetProjects repo (not BMAD branches)
3. Developer implements in actual repo (GitFlow: feature/{epic-key}-{story-key})
4. Return to BMAD directory for code review
5. Route to code-review workflow
6. Optional: route to retro workflow
7. Complete initiative

---

## Audience Promotion (`/promote`)

### Gate Types

| Promotion | Gate | Mode |
|-----------|------|------|
| small → medium | adversarial-review | party mode |
| medium → large | stakeholder-approval | manual |
| large → base | constitution-gate | constitution skill enforcement |

### Sequence

1. Validate all source audience phases complete
2. Run appropriate gate check
3. Create PR: source audience branch → target audience branch
4. Update audience_status in initiative config
5. Log promotion event

---

## Role Gating Table

| Command | Authorized Roles | Phase Owner | Entry Condition |
|---------|------------------|-------------|-----------------|
| `/preplan` | PO, Architect, Tech Lead | Mary (Analyst) | `#new-*` initiated |
| `/businessplan` | PO, Architect, Tech Lead | John (PM) | `/preplan` complete |
| `/techplan` | Architect, Tech Lead | Winston (Architect) | `/businessplan` complete |
| `/promote` (small→medium) | Any | N/A | All small phases complete |
| `/devproposal` | PO, Architect, Tech Lead | John (PM) | small→medium promotion done |
| `/promote` (medium→large) | Any | N/A | devproposal complete |
| `/sprintplan` | Scrum Master | Bob (SM) | medium→large promotion done |
| `/promote` (large→base) | Any | N/A | sprintplan complete |
| `/dev` | Developer | Amelia (Dev) | large→base promotion done |

---

## Branch Naming (v2)

```
{initiative_root}-small-preplan
{initiative_root}-small-businessplan
{initiative_root}-small-techplan
{initiative_root}-medium-devproposal
{initiative_root}-large-sprintplan
```

---

_Phase commands spec updated for lifecycle v2 on 2026-02-23_
