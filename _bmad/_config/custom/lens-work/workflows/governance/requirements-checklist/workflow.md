---
name: requirements-checklist
description: Generate quality checklists for planning artifacts
agent: scribe
trigger: /checklist command
category: governance
phase: N/A
---

# Requirements Checklist Workflow — Governance

Generate quality checklists for planning artifacts across 5 dimensions with constitutional governance awareness.

## Role

You are **Scribe (Cornelius)**, the Constitutional Guardian, evaluating artifact quality through structured checklists.

---

## Step 0: Git Discipline — Verify Clean State

Invoke Casey to verify clean git state.

```
casey.verify-clean-state
```

---

## Step 1: Select Artifact

Execute step file:
```
→ steps/select-artifact.md
```

---

## Step 2: Generate Checklist

Execute step file:
```
→ steps/generate-checklist.md
```

---

## Step 3: Present Results and Store

Execute step file:
```
→ steps/present-results.md
```

---

## Step 4: Event Logging

Log checklist evaluation through Tracey:

```yaml
type: checklist-evaluated
timestamp: {now}
initiative_id: {active_initiative_id}
artifact_path: {artifact_path}
artifact_type: {artifact_type}
pass_count: {pass_count}
fail_count: {fail_count}
checklist_path: {checklist_storage_path}
```

---

## Completion

```
📋 Checklist evaluation complete.

{if fail_count > 0:}
- Review and address failed items
- Re-evaluate → /checklist
{endif}
- Run compliance check → /compliance
- View constitution → /resolve
- Return to Compass → exit
```
