# Core Workflows — Git Lifecycle Operations

**Module:** lens-work
**Category:** core (auto-triggered)
**Agent:** Casey
**Status:** Specification

---

## Workflow: start-workflow

### Trigger

Compass invokes when user begins a workflow within a phase

### Purpose

Create a workflow branch with merge-gate validation.

### Sequence

1. Validate merge gate (previous workflow must be merged)
2. Create branch: `{featureBranchRoot}-{audience}-p{phase}-{workflow_name}`
3. Checkout to new branch
4. Update state.yaml
5. Log to event-log.jsonl

### Gate Check

```bash
git merge-base --is-ancestor {previous_workflow_branch} {phase_branch}
```

If false → block with message.

---

## Workflow: finish-workflow

### Trigger

Compass invokes when workflow completes

### Purpose

Commit, push, and print PR link.

### Sequence

1. Stage all changes
2. Commit with message: `[lens-work] Complete {workflow_name}`
3. Push to origin
4. Print PR link: `{remote}/compare/{phase}...{workflow}`
5. Update state.yaml
6. Log to event-log.jsonl

---

## Workflow: start-phase

### Trigger

First workflow of a new phase

### Purpose

Create phase branch from size.

### Sequence

1. Validate previous phase complete (all workflows merged)
2. Create branch: `{featureBranchRoot}-{audience}-p{phase_number}`
3. Checkout to new branch
4. Update state.yaml
5. Log to event-log.jsonl

---

## Workflow: finish-phase

### Trigger

All workflows in phase complete

### Purpose

Push phase branch and print PR to size.

### Sequence

1. Validate all workflows merged
2. Push phase branch
3. Print PR link: `{remote}/compare/{size}...{phase}`
4. Update state.yaml
5. Log to event-log.jsonl

---

## Workflow: open-large-review

### Trigger

Phase 2 complete + architecture workflow merged

### Purpose

Open PR from small → large for large review.

### Sequence

1. Validate p2 complete
2. Print PR link: `{remote}/compare/large...small`
3. Log to event-log.jsonl

---

## Workflow: open-final-pbr

### Trigger

Large review merged

### Purpose

Open PR from large → base for final PBR.

### Sequence

1. Validate large merged from small
2. Print PR link: `{remote}/compare/base...large`
3. Log to event-log.jsonl

---

_Workflow spec created on 2026-02-03 via BMAD Module workflow_
