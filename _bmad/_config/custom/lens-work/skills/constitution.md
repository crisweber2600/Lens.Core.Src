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
- Phase progression (correct order, no skipping — per lifecycle.yaml phase_order)
- Gate requirements (required artifacts exist before gate opens)
- Branch topology (matches expected patterns per lifecycle.yaml branch_patterns)
- State consistency (state.yaml matches git reality)
- Audience configuration (valid audiences per initiative track)
- **Track permissions** — Initiative track must be in constitution's `permitted_tracks` list
- **Required gates** — Constitution can mandate gates that tracks would otherwise skip
- **Review participants** — Constitution can add `additional_review_participants` to adversarial reviews (additive inheritance)
- **Required artifacts** — Constitution can require additional artifacts beyond phase defaults

## Constitution Hierarchy (lifecycle.yaml)

Resolution order: `[org, domain, service, repo]` (parent-first, additive inheritance).
Children can only ADD rules — never remove or weaken parent rules.

### Track Enforcement

Constitutions at any level may define `permitted_tracks`:
```yaml
permitted_tracks: [full, feature, tech-change]  # hotfix and spike not allowed
```
If ANY level in the chain restricts tracks, the intersection applies.
An initiative's track must be permitted by ALL constitutions in its chain.

### Required Gates

Constitutions may add `required_gates` that force gates even for tracks that skip them:
```yaml
required_gates: [adversarial-review]  # Force review even for tech-change track
```
Gates accumulate additively up the chain — if any constitution requires a gate, it's required.

### Additional Review Participants

Constitutions may add participants to adversarial review sessions:
```yaml
additional_review_participants:
  prd: [security-reviewer]
  architecture: [compliance-officer]
```
Participants accumulate additively — all additions from all levels participate.

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
