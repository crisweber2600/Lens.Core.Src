---
name: checklist-update
description: Update progressive checklist items and gate readiness after workflows complete
agent: tracey
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

### pre-plan → plan gate
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

### plan → tech-plan gate
```yaml
- item: "PRD complete"
  status: not-started
  required: true
- item: "Epics defined"
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

### tech-plan → story-gen gate
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

### story-gen → review gate
```yaml
- item: "Stories generated"
  status: not-started
  required: true
- item: "Estimates added"
  status: not-started
  required: true
- item: "Dependencies mapped"
  status: not-started
  required: true
```

### review → dev gate
```yaml
- item: "All stories reviewed"
  status: not-started
  required: true
- item: "Readiness checks pass"
  status: not-started
  required: true
- item: "Constitution compliance"
  status: not-started
  required: true
- item: "Sprint plan approved"
  status: not-started
  required: false
```

---

## Artifact Auto-Detection Map

Maps filenames (relative to initiative docs_path) to checklist items:

```yaml
artifact_map:
  pre-plan:
    "product-brief.md": "Product brief complete"
    "brainstorm-notes.md": "Brainstorm notes"
    "research-summary.md": "Discovery complete"
  plan:
    "prd.md": "PRD complete"
    "epics.md": "Epics defined"
    "user-stories.md": "User stories mapped"
    "acceptance-criteria.md": "Acceptance criteria written"
    "ux-wireframes.md": "UX wireframes"
  tech-plan:
    "architecture.md": "Architecture doc complete"
    "tech-decisions.md": "Tech decisions logged"
    "api-contracts.md": "API contracts defined"
    "data-model.md": "Data model specified"
  story-gen:
    "implementation-stories.md": "Stories generated"
    "story-estimates.md": "Estimates added"
    "dependency-map.md": "Dependencies mapped"
  review:
    "review-report.md": "All stories reviewed"
    "readiness-check.md": "Readiness checks pass"
    "compliance-report.md": "Constitution compliance"
```

---

## Display Modes

**Compact** (used in /status via Tracey):
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
