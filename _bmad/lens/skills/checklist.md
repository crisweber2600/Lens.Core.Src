# Skill: checklist

**Module:** lens
**Owner:** @lens agent
**Type:** Internal delegation skill

---

## Purpose

Manages progressive phase gate checklists with expandable detail. Instead of showing all requirements upfront, checklists reveal items progressively as users work through phases.

## Responsibilities

1. **Checklist generation** — Create phase-appropriate checklists when entering a phase
2. **Progress tracking** — Update checklist items as artifacts are produced
3. **Gate validation** — Check all required items are complete before phase transition
4. **Progressive disclosure** — Show summary by default, expand on request
5. **Custom checklists** — Support per-initiative checklist overrides

## Checklist Structure (in state.yaml)

```yaml
checklist:
  plan:
    - item: "PRD complete"
      status: done          # done | in-progress | not-started | blocked
      required: true
    - item: "Epics defined"
      status: in-progress
      required: true
    - item: "UX wireframes"
      status: not-started
      required: false       # Optional items don't block gates
```

## Display Modes

### Compact (default /status)
```
Plan: 2/5 complete (1 in progress)
```

### Expanded (/lens or /Review)
```
Plan Phase Checklist:
  ✅ PRD complete
  🔄 Epics defined (in progress)
  ⬜ User stories mapped (required)
  ⬜ Acceptance criteria written (required)
  ⬜ UX wireframes (optional)
```

## Default Checklists by Phase

| Phase | Required Items |
|-------|---------------|
| pre-plan | Product brief complete, stakeholder identified, discovery complete |
| plan | PRD complete, epics defined, user stories, acceptance criteria |
| tech-plan | Architecture doc, tech decisions logged, API contracts |
| story-gen | Stories generated, estimates added, dependencies mapped |
| review | All stories reviewed, readiness checks pass, constitution compliance |
| dev | Code complete, tests pass, PR submitted |

## Trigger Conditions

- Phase entry — generate checklist for new phase
- Artifact creation — auto-update relevant checklist items
- /Review command — validate all required items complete
- Phase transition — block if required items incomplete

---

_Skill spec created on 2026-02-17 via BMAD Module workflow_
