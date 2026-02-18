# Skill: checklist

**Module:** lens-work
**Owner:** Tracey agent (delegated via Compass)
**Type:** Internal delegation skill

---

## Purpose

Progressive phase gate checklists with artifact auto-detection. Tracks what's needed to pass each gate, automatically detects when artifacts are created, and updates checklist status. Formalizes the Tracey agent's checklist API contract.

## Responsibilities

1. **Phase gate tracking** — Maintain required items per gate
2. **Artifact auto-detection** — Scan for required artifacts and mark items complete
3. **Progressive disclosure** — Show only relevant items for current phase
4. **Gate readiness** — Report when all items satisfied for gate progression
5. **Manual override** — Allow marking items via explicit commands

## Checklist Items Per Gate

### pre-plan → plan
- [ ] Vision document exists
- [ ] Stakeholder map defined
- [ ] Initial scope outlined
- [ ] Constitution mode selected

### plan → tech-plan
- [ ] PRD/requirements complete
- [ ] User stories drafted
- [ ] Acceptance criteria defined
- [ ] Audience routing configured

### tech-plan → story-gen
- [ ] Architecture document complete
- [ ] Technology stack defined
- [ ] Data model specified
- [ ] Integration points documented

### story-gen → review
- [ ] All stories generated
- [ ] Story acceptance criteria defined
- [ ] Dependencies mapped
- [ ] Estimation complete

### review → dev
- [ ] Review complete
- [ ] Approval recorded
- [ ] Implementation priority set
- [ ] Dev branch strategy confirmed

## Auto-Detection Logic

```
For each checklist item:
  1. Check if corresponding artifact file exists
  2. Check if artifact has required content markers
  3. IF both → mark item complete, log to event-log
  4. IF missing → keep item pending
  5. Report gate readiness percentage
```

## State Integration

Checklist state persisted in `state.yaml` under `checklist:` key:

```yaml
checklist:
  current_gate: plan_to_tech_plan
  items:
    - id: prd_complete
      status: complete
      detected_at: "2026-02-17T10:00:00Z"
    - id: user_stories
      status: pending
  gate_ready: false
  gate_ready_pct: 50
```

## Error Handling

| Error | Action |
|-------|--------|
| Artifact file missing | Keep item pending, no error |
| Artifact exists but empty | Keep item pending, warn |
| State write failure | Log error, retry once |
| Unknown checklist item | Ignore, log warning |

---

_Skill spec backported from lens module on 2026-02-17_
