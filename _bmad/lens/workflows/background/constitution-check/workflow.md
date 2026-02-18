---
name: constitution-check
description: Inline governance validation at workflow boundaries
agent: lens
trigger: auto (workflow_start, phase_transition)
category: background
user_facing: false
---

# Constitution Check (Background)

**Purpose:** Run governance validation via the constitution skill at every workflow boundary.

---

## Trigger Behavior

### On `workflow_start`

```yaml
state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

# Determine governance mode
mode = initiative.governance_mode || "advisory"    # advisory | enforced

# Run phase-appropriate checks
checks = get_checks_for_phase(initiative.current_phase)

results = []
for check in checks:
  result = evaluate_check(check, initiative, state)
  results.push(result)

# Process results
violations = results.filter(r => r.status == "violation")
warnings = results.filter(r => r.status == "warning")

if violations.length > 0:
  if mode == "enforced":
    # BLOCK — do not allow workflow to proceed
    output: |
      🚫 Constitution Check FAILED (enforced mode)
      
      Violations:
      ${violations.map(v => `  ├── ${v.rule}: ${v.message}\n  │   └── Fix: ${v.remediation}`).join("\n")}
    
    # Log to event log
    append_event("constitution_violation", {
      mode: mode,
      violations: violations,
      action: "blocked"
    })
    
    exit: 1    # Block workflow

  else:    # advisory mode
    output: |
      ⚠️ Constitution Check — Warnings
      ${violations.map(v => `  ├── ${v.rule}: ${v.message}`).join("\n")}
      └── Advisory mode: proceeding despite violations
    
    append_event("constitution_violation", {
      mode: mode,
      violations: violations,
      action: "advised"
    })

if warnings.length > 0:
  output: |
    📋 Constitution notes:
    ${warnings.map(w => `  └── ${w.message}`).join("\n")}

if violations.length == 0 and warnings.length == 0:
  append_event("constitution_passed", {phase: initiative.current_phase})
```

### On `phase_transition`

```yaml
# Full compliance scan before allowing phase advancement
state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

mode = initiative.governance_mode || "advisory"

# Phase transition checks are more comprehensive
checks = [
  check_required_artifacts(initiative.current_phase),
  check_gate_prerequisites(initiative.current_phase),
  check_branch_topology(initiative),
  check_state_consistency(state, initiative),
  check_audience_configuration(initiative)
]

results = evaluate_all(checks)
violations = results.filter(r => r.status == "violation")

if violations.length > 0 and mode == "enforced":
  output: |
    🚫 Phase transition blocked by constitution
    ${violations.map(v => `  ├── ${v.rule}: ${v.message}\n  │   └── Fix: ${v.remediation}`).join("\n")}
  exit: 1

# Advisory mode always allows transition
```

---

## Governance Rules

| Rule | Check | Severity |
|------|-------|----------|
| `init.required_fields` | Initiative has name, type, and target | Critical |
| `phase.sequential` | Phases advance in order (no skip) | Critical |
| `gate.prerequisites` | Previous gate passed before next phase | Critical |
| `branch.topology` | Expected branches exist | High |
| `state.consistency` | state.yaml matches git reality | High |
| `audience.valid` | Audience config has at least 1 entry | Medium |
| `artifacts.exist` | Required phase artifacts present | Medium |
| `role.authorized` | User role matches phase requirements | Low (advisory) |

---

## Modes

| Mode | Behavior |
|------|----------|
| `advisory` | Log warnings, never block. Default. |
| `enforced` | Block on Critical/High violations. |
