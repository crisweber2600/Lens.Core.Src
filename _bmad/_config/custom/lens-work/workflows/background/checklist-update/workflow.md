---
name: checklist-update
description: Update progressive checklist items and gate readiness after workflows complete
agent: "@lens/state-management"
trigger: "background (auto-triggered)"
category: background
---

# Background Workflow: checklist-update

**Purpose:** Update progressive checklist items after workflows complete. Auto-detects produced artifacts and marks matching checklist items as done. Generates default checklists for new phases.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `workflow_end` | Auto-detect produced artifacts, mark matching checklist items done |
| `phase_transition` | Generate default checklist for the new phase |

---

## Execution Steps

### On workflow_end

```yaml
1. Load state.yaml → checklist section
2. Load initiative config for current phase and docs_path
3. Scan artifact locations for files matching the artifact_map
4. For each matched artifact:
   a. Mark corresponding checklist item as "done"
   b. Set detected_at timestamp
   c. Log to event-log.jsonl
5. Calculate gate readiness:
   a. Count required items with status "done"
   b. Calculate gate_ready_pct
   c. Set gate_ready = true if all required items are done
6. Write updated checklist to state.yaml
```

### On phase_transition

```yaml
1. Load default checklist for the new phase (from default_checklists below)
2. Merge with any existing checklist items (preserve completed items)
3. Set current_gate to the new phase's gate
4. Write updated checklist to state.yaml
5. Log checklist_generated event to event-log.jsonl
```

---

## Default Checklists by Phase

### preplan → businessplan gate
```yaml
- item: "Product brief complete"
  status: not-started
  required: true
- item: "Stakeholder identified"
  status: not-started
  required: true
- item: "Discovery complete"
  status: not-started
  required: true
- item: "Brainstorm notes"
  status: not-started
  required: false
```

### businessplan → techplan gate
```yaml
- item: "PRD complete"
  status: not-started
  required: true
- item: "User stories mapped"
  status: not-started
  required: true
- item: "Acceptance criteria written"
  status: not-started
  required: true
- item: "UX wireframes"
  status: not-started
  required: false
```

### techplan → [small→medium promotion] gate
```yaml
- item: "Architecture doc complete"
  status: not-started
  required: true
- item: "Tech decisions logged"
  status: not-started
  required: true
- item: "API contracts defined"
  status: not-started
  required: true
- item: "Data model specified"
  status: not-started
  required: false
```

### [small→medium] → devproposal gate
```yaml
- item: "Adversarial review (party mode) passed"
  status: not-started
  required: true
- item: "All small-audience phase PRs merged"
  status: not-started
  required: true
```

### devproposal → [medium→large promotion] gate
```yaml
- item: "Epics defined"
  status: not-started
  required: true
- item: "Stories generated"
  status: not-started
  required: true
- item: "Estimates added"
  status: not-started
  required: true
- item: "Dependencies mapped"
  status: not-started
  required: true
- item: "Readiness checklist passed"
  status: not-started
  required: true
```

### [medium→large] → sprintplan gate
```yaml
- item: "Stakeholder approval received"
  status: not-started
  required: true
```

### sprintplan → [large→base promotion] gate
```yaml
- item: "Sprint plan approved"
  status: not-started
  required: true
- item: "Story assignments confirmed"
  status: not-started
  required: true
```

### [large→base] → dev gate
```yaml
- item: "Constitution compliance passed"
  status: not-started
  required: true
- item: "All large-audience phase PRs merged"
  status: not-started
  required: true
```

---

## Artifact Auto-Detection Map

Maps filenames (relative to initiative docs_path) to checklist items:

```yaml
artifact_map:
  preplan:
    "preplan-product-brief.md": "Product brief complete"
    "preplan-brainstorm-notes.md": "Brainstorm notes"
    "preplan-research-notes.md": "Discovery complete"
  businessplan:
    "businessplan-prd.md": "PRD complete"
    "businessplan-ux-design.md": "UX wireframes"
  techplan:
    "techplan-architecture.md": "Architecture doc complete"
    "techplan-tech-decisions.md": "Tech decisions logged"
    "techplan-api-contracts.md": "API contracts defined"
  devproposal:
    "devproposal-epics.md": "Epics defined"
    "devproposal-stories/": "Stories generated"
    "devproposal-readiness-checklist.md": "Readiness checklist passed"
  sprintplan:
    "sprintplan-sprint-plan.md": "Sprint plan approved"
```

---

## Display Modes

**Compact** (used in /status via state-management):
```
Plan: 2/5 complete (1 in progress)
```

**Expanded** (used in /lens or /review):
```
Plan Phase Checklist:
  ✅ PRD complete
  🔄 Epics defined (in progress)
  ⬜ User stories mapped (required)
  ⬜ Acceptance criteria written (required)
  ⬜ UX wireframes (optional)
```

---

## Gate Blocking

Phase transitions check that all `required: true` items have `status: done` before allowing advancement. This is enforced in conjunction with the constitution-check background workflow.

---

## Error Handling

| Error | Action |
|-------|--------|
| Artifact file missing | Keep item pending, no error |
| Artifact exists but empty | Keep item pending, warn |
| State write failure | Log error, retry once |
| Unknown checklist item | Ignore, log warning |

---

_Background workflow backported from lens module on 2026-02-17_
