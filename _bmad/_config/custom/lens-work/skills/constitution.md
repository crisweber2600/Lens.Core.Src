# Skill: constitution

**Module:** lens-work
**Owner:** Scribe/Cornelius agent (delegated via Compass)
**Type:** Internal delegation skill

---

## Purpose

Runs inline governance checks at every workflow step. Constitution checks are skills, not separate workflows — they execute as part of every workflow step automatically. Formalizes the Scribe agent's governance API contract.

## Responsibilities

1. **Inline validation** — Check governance rules at every workflow step
2. **Rule citation** — When a violation occurs, cite the specific rule
3. **Remediation guidance** — Provide clear path to fix violations
4. **Compliance tracking** — Record check results in event log
5. **Mode enforcement** — Advisory (warn) vs Enforced (block)

## Governance Rules

Constitution checks validate:
- Initiative structure (required fields, valid types)
- Phase progression (correct order, no skipping)
- Gate requirements (required artifacts exist before gate opens)
- Branch topology (matches expected patterns)
- State consistency (state.yaml matches git reality)
- Audience configuration (valid audiences per initiative)

## Execution Model

```
Every workflow step:
  1. Read current state
  2. Run constitution checks relevant to this step
  3. IF advisory mode → log warnings, continue
  4. IF enforced mode → log violations, block if critical
  5. Append check results to event log
```

## Modes

| Mode | Behavior |
|------|----------|
| `advisory` | Warn but don't block progress |
| `enforced` | Block progress on critical violations |

Default mode is `advisory`. Configurable per initiative via `constitution_mode` in initiative config.

## Trigger Conditions

- **Automatic** at every workflow step (via background_triggers)
- Also available via explicit `/constitution` and `/compliance` commands
- Results surface only when violations are found (in automatic mode)

## Error Handling

| Error | Action |
|-------|--------|
| Minor violation (advisory) | Log warning, continue |
| Critical violation (advisory) | Log warning with emphasis, continue |
| Minor violation (enforced) | Log warning, continue |
| Critical violation (enforced) | Block progress, cite rule, show remediation |

---

_Skill spec backported from lens module on 2026-02-17_
