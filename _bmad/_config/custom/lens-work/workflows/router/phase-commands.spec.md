# Router Workflows — Phase Commands

**Module:** lens-work
**Category:** router (user-facing)
**Agent:** Compass
**Status:** Specification

---

## Overview

Router workflows are the user-facing phase commands that map to BMAD lifecycle phases. Each command:

1. Validates prerequisites (layer detected, gates passed)
2. Invokes Casey to manage git branches
3. Routes to appropriate BMM/CIS/TEA workflows
4. Tracks progress via Tracey

---

## Workflow: pre-plan (`/pre-plan`)

### Phase

Analysis (Phase 1)

### Role Authorization

PO, Architect, Tech Lead

### BMM Workflows Invoked

- Brainstorming (optional, CIS)
- Research (optional, CIS)
- Product Brief

### Sequence

1. Validate layer detected
2. Casey: start-phase (if needed), start-workflow
3. Route to brainstorming/research (if requested)
4. Route to product-brief workflow
5. Casey: finish-workflow
6. Offer: continue to /spec or pause

---

## Workflow: spec (`/spec`)

### Phase

Planning (Phase 2)

### Role Authorization

PO, Architect, Tech Lead

### BMM Workflows Invoked

- PRD
- UX (if applicable)
- Architecture

### Sequence

1. Validate /pre-plan complete
2. Casey: start-phase, start-workflow
3. Route to PRD workflow
4. Route to UX workflow (if UI involved)
5. Route to Architecture workflow
6. Casey: finish-workflow, finish-phase
7. Casey: open-large-review (if p2 + arch complete)

---

## Workflow: plan (`/plan`)

### Phase

Solutioning (Phase 3)

### Role Authorization

PO, Architect, Tech Lead

### BMM Workflows Invoked

- Epics
- Stories
- Readiness checklist

### Sequence

1. Validate /spec complete
2. Casey: start-phase, start-workflow
3. Route to Epics workflow
4. Route to Stories workflow
5. Route to Readiness workflow
6. Casey: finish-workflow, finish-phase
7. Offer: proceed to /review

---

## Workflow: review (`/review`)

### Phase

Implementation Gate

### Role Authorization

Scrum Master (gate owner)

### BMM Workflows Invoked

- Readiness re-validation
- Sprint planning
- Dev story creation

### Sequence

1. Validate /plan complete
2. Re-run readiness checklist
3. Sprint planning (if Scrum)
4. Create dev-ready story
5. Hand off to Developer
6. Casey: open-final-pbr (if large review complete)

---

## Workflow: dev (`/dev`)

### Phase

Implementation (Phase 4)

### Role Authorization

Developer (post-review only)

### BMM Workflows Invoked

- Dev story execution
- Code review
- Retro (optional)

### Sequence

1. Validate /review complete (dev story exists)
2. Casey: checkout TargetProjects repo (not BMAD branches)
3. Developer implements in actual repo
4. Return to BMAD directory for code review
5. Route to code-review workflow
6. Optional: route to retro workflow
7. Complete initiative

---

## Role Gating Table

| Command | Authorized Roles | Entry Condition |
|---------|------------------|-----------------|
| `/pre-plan` | PO, Architect, Tech Lead | `#new-*` initiated |
| `/spec` | PO, Architect, Tech Lead | `/pre-plan` complete |
| `/plan` | PO, Architect, Tech Lead | `/spec` complete |
| `/review` | Scrum Master | `/plan` complete |
| `/dev` | Developer | `/review` produces dev story |

---

_Workflow spec created on 2026-02-03 via BMAD Module workflow_
