---
name: checklist-update
description: Update progressive checklist state after workflow operations
agent: lens
trigger: auto (workflow_end, phase_transition)
category: background
user_facing: false
---

# Checklist Update (Background)

**Purpose:** Update progressive checklist items in state.yaml after workflows complete or phases transition.

---

## Trigger Behavior

### On `workflow_end`

```yaml
state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

current_phase = initiative.current_phase
phase_name = phase_to_name(current_phase)    # e.g., "p1" → "pre-plan"

# Get the checklist for this phase
checklist = state.active_initiative.checklist[phase_name] || []

if checklist.length == 0:
  # Initialize default checklist for this phase
  checklist = get_default_checklist(phase_name)
  state.active_initiative.checklist[phase_name] = checklist

# Auto-detect produced artifacts
docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
impl_path = "_bmad-output/implementation-artifacts/"

artifact_map = {
  "pre-plan": {
    "product-brief.md": "Product brief complete",
    "brainstorm-notes.md": "Brainstorm complete",
    "research-summary.md": "Discovery report"
  },
  "plan": {
    "prd.md": "PRD complete",
    "epics.md": "Epics defined",
    "user-stories.md": "User stories mapped",
    "acceptance-criteria.md": "Acceptance criteria written"
  },
  "tech-plan": {
    "architecture.md": "Architecture doc",
    "tech-decisions.md": "Tech decisions logged",
    "api-contracts.md": "API contracts"
  },
  "story-gen": {
    "implementation-stories.md": "Stories generated",
    "story-estimates.md": "Estimates added",
    "dependency-map.md": "Dependencies mapped"
  }
}

# Check which artifacts now exist
if artifact_map[phase_name]:
  for filename, checklist_item_name in artifact_map[phase_name]:
    path = phase_name in ["story-gen", "dev"] ? "${impl_path}/${filename}" : "${docs_path}/${filename}"
    if file_exists(path):
      # Mark matching checklist item as done
      item = checklist.find(c => c.item == checklist_item_name)
      if item and item.status != "done":
        item.status = "done"

# Write updated checklist back to state
state.active_initiative.checklist[phase_name] = checklist
write_file("_bmad-output/lens/state.yaml", state)
```

### On `phase_transition`

```yaml
state = load("_bmad-output/lens/state.yaml")
new_phase = phase_to_name(new_phase_number)

# Generate checklist for the new phase
new_checklist = get_default_checklist(new_phase)
state.active_initiative.checklist[new_phase] = new_checklist

write_file("_bmad-output/lens/state.yaml", state)
```

---

## Default Checklists

```yaml
default_checklists:
  pre-plan:
    - item: "Product brief complete"
      required: true
      status: not-started
    - item: "Stakeholder identified"
      required: true
      status: not-started
    - item: "Discovery report"
      required: false
      status: not-started
    - item: "Brainstorm complete"
      required: false
      status: not-started

  plan:
    - item: "PRD complete"
      required: true
      status: not-started
    - item: "Epics defined"
      required: true
      status: not-started
    - item: "User stories mapped"
      required: true
      status: not-started
    - item: "Acceptance criteria written"
      required: true
      status: not-started
    - item: "UX wireframes"
      required: false
      status: not-started

  tech-plan:
    - item: "Architecture doc"
      required: true
      status: not-started
    - item: "Tech decisions logged"
      required: true
      status: not-started
    - item: "API contracts"
      required: false
      status: not-started
    - item: "Data model"
      required: false
      status: not-started

  story-gen:
    - item: "Stories generated"
      required: true
      status: not-started
    - item: "Estimates added"
      required: false
      status: not-started
    - item: "Dependencies mapped"
      required: false
      status: not-started

  review:
    - item: "Checklist complete"
      required: true
      status: not-started
    - item: "Constitution compliance"
      required: true
      status: not-started
    - item: "Readiness report generated"
      required: true
      status: not-started

  dev:
    - item: "Code complete"
      required: true
      status: not-started
    - item: "Tests pass"
      required: true
      status: not-started
    - item: "PR submitted"
      required: true
      status: not-started
    - item: "Code review approved"
      required: false
      status: not-started
```
