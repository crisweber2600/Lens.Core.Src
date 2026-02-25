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

### preplan → businessplan
- [ ] Vision document exists
- [ ] Stakeholder map defined
- [ ] Initial scope outlined
- [ ] Constitution mode selected

### businessplan → techplan
- [ ] PRD/requirements complete
- [ ] User stories drafted
- [ ] Acceptance criteria defined

### techplan → [small→medium promotion]
- [ ] Architecture document complete
- [ ] Technology stack defined
- [ ] Data model specified
- [ ] Integration points documented

### [small→medium promotion] → devproposal
- [ ] Adversarial review (party mode) completed
- [ ] All small-audience phase PRs merged

### devproposal → [medium→large promotion]
- [ ] All stories generated
- [ ] Story acceptance criteria defined
- [ ] Dependencies mapped
- [ ] Estimation complete
- [ ] Readiness checklist passed

### [medium→large promotion] → sprintplan
- [ ] Stakeholder approval recorded
- [ ] Implementation priority set

### sprintplan → [large→base promotion]
- [ ] Sprint plan approved
- [ ] Story assignments confirmed
- [ ] Dev branch strategy confirmed

### [large→base promotion] → dev
- [ ] Constitution gate passed (Scribe compliance check)
- [ ] All large-audience phase PRs merged

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
  current_gate: businessplan_to_techplan
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
