---
name: constitution-check
description: Run governance validation via constitution skill at workflow boundaries
agent: "@lens/constitution"
trigger: "background (auto-triggered)"
category: background
---

# Background Workflow: constitution-check

**Purpose:** Run governance validation at workflow boundaries. Delegates to the constitution skill (@lens/constitution). Ensures all operations comply with active constitutions.

---

## Trigger Conditions

| Trigger | Action |
|---------|--------|
| `workflow_start` | Validate governance rules for the starting workflow |
| `phase_transition` | Comprehensive governance check (artifacts, gates, topology, state) |

---

## Execution Steps

### On workflow_start

```yaml
1. Load current state + initiative config
2. Determine governance mode:
   - Check initiative config for constitution_mode (advisory | enforced)
   - Default: advisory
3. Load applicable constitutions (inheritance chain: Domain → Service → Feature)
4. Run workflow-appropriate checks:
   a. Is this workflow valid for the current phase?
   b. Does the user role match the expected role for this workflow?
   c. Are prerequisite artifacts present?
5. Report results:
   IF advisory mode → log warnings to event-log, continue
   IF enforced mode → log violations, BLOCK if critical
6. Append check results to event-log.jsonl
```

### On phase_transition (comprehensive)

```yaml
1. Load current state + initiative config + all applicable constitutions
2. Run comprehensive checks:
   a. Required artifacts exist for current phase gate
   b. Gate prerequisites met (all required checklist items done)
   c. Branch topology valid (delegate to branch-validate)
   d. State consistent (state.yaml matches initiative config)
   e. Audience configuration valid for next phase
   f. All constitution articles satisfied
3. Report results:
   IF advisory mode → log warnings, continue
   IF enforced mode → log violations, BLOCK if critical
4. Log constitution_passed or constitution_violation event
```

---

## Governance Modes

| Mode | Behavior |
|------|----------|
| `advisory` | Warn but don't block progress. All violations logged as warnings. |
| `enforced` | Block progress on critical violations. Minor violations are warnings. |

Default mode is `advisory`. Configurable per initiative via `constitution_mode` in initiative config.

---

## Check Categories

| Category | Checks |
|----------|--------|
| **Structure** | Initiative config has required fields, valid types |
| **Phase** | Correct phase ordering, no skipping |
| **Gate** | Required artifacts exist before gate opens |
| **Topology** | Branch patterns match expected topology |
| **State** | state.yaml matches git reality |
| **Audience** | Valid audiences per initiative, correct routing |
| **Constitution** | All articles in inheritance chain satisfied |

---

## Constitution Inheritance Chain

Constitutions inherit parent-first:
```
Domain → Service → Microservice → Feature
```

Articles are **additive** — children cannot weaken parent rules. When checking compliance, all ancestor constitutions are loaded and merged.

---

## Error Handling

| Error | Action |
|-------|--------|
| No constitutions found | Skip governance checks, log info |
| Constitution file corrupted | Log error, skip that constitution |
| Advisory violation | Log warning, continue workflow |
| Enforced critical violation | Block workflow, cite rule, show remediation |
| Enforced minor violation | Log warning, continue workflow |

---

_Background workflow backported from lens module on 2026-02-17_
