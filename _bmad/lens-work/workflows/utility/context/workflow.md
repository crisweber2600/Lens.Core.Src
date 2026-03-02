---
name: context
description: "Display current active context — initiative, lens, phase, audience, branch, and status summary"
agent: "@lens"
trigger: "/context or CX via @lens"
category: utility
version: "2.0.0"
---

# Context Display Workflow

**Purpose:** Display the current active context for the lens-work session, showing the active initiative, lens (domain/service/feature scope), current phase, audience level, active branch, and a concise status summary.

---

## Input Parameters

None required — reads from `_bmad-output/lens-work/state.yaml`.

---

## Steps

### Step 1 — Read State File

Read `_bmad-output/lens-work/state.yaml`. If the file does not exist or is empty, display:

```
No active context. Run /onboard or /new-domain to get started.
```

### Step 2 — Extract Context Fields

From `state.yaml`, extract:

| Field | Source Path |
|---|---|
| Active initiative | `state.active_initiative` |
| Lens scope | `state.active_initiative.lens` (domain/service/feature) |
| Current phase | `state.active_initiative.current_phase` |
| Audience | `state.active_initiative.audience` |
| Active branch | `state.active_initiative.branch` |
| Gate status | `state.active_initiative.gate_status` |
| Last action | `state.last_event.description` |

### Step 3 — Display Context Block

Format and display as:

```
🔬 LENS Context
═══════════════════════════════════════════
Initiative : {active_initiative.name} ({active_initiative.id})
Lens       : {lens} ({lens_type}: domain|service|feature)
Phase      : {current_phase}
Audience   : {audience} (small|medium|large|base)
Branch     : {branch}
Gate       : {gate_status}
Last Action: {last_event.description}
═══════════════════════════════════════════
```

### Step 4 — Show Next Available Actions

Based on the current phase and audience, list the next recommended commands:

| Condition | Suggested Commands |
|---|---|
| Phase = preplan, audience = small | `BP` Business Plan |
| Phase = businessplan, audience = small | `TP` Tech Plan |
| Phase = techplan, audience = small | Promote to medium → `DP` Dev Proposal |
| Phase = devproposal, audience = medium | `SP` Sprint Plan |
| Phase = sprintplan, audience = large | Promote to base → `DV` Dev Loop |
| Any phase | `ST` Status, `SW` Switch Context, `H` Help |

---

## Output

- Formatted context block displayed inline
- No files written

---

## Error Handling

| Condition | Action |
|---|---|
| `state.yaml` missing | Display "No active context" message with onboarding instructions |
| `active_initiative` null | Display "No initiative selected" — suggest `SW` Switch or `ND` New Domain |
| Branch name unavailable | Display "(branch unknown)" and suggest `RB` Recreate Branches |
