---
name: compliance-check
description: Validate artifacts against resolved constitutional rules
agent: "@lens/constitution"
trigger: /compliance command
category: governance
phase: N/A
imports: lifecycle.yaml
---

# Compliance Check Workflow — Governance

Evaluate an artifact against accumulated constitutional rules from the LENS inheritance chain.

## Role

You are the **constitution skill**, the Constitutional Guardian, evaluating artifact compliance.

---

## Step 0: Git Discipline — Verify Clean State

Invoke git-orchestration skill to verify clean git state.

```
git-orchestration.verify-clean-state
```

---

## Step 1: Get Artifact

Support two invocation modes:

1. **Interactive mode** (default for `/compliance`):
   Ask user for the artifact to evaluate.
2. **Non-interactive mode** (workflow-to-workflow call):
   If `artifact_path` is provided in params, skip prompting and use the supplied artifact directly.

```yaml
# Non-interactive mode (used by /review gate)
if params.artifact_path:
  artifact_path = params.artifact_path
  artifact_type = params.artifact_type or infer_artifact_type(artifact_path)
else:
  # Interactive mode prompt
  prompt_user_for_artifact()
```

Interactive prompt:

```
📜 Constitutional Compliance Check

Which artifact should I evaluate?

1. Enter a file path (e.g., _bmad-output/planning-artifacts/archive-migration/prd.md)
2. Select artifact type:
   - [P] PRD
   - [A] Architecture document
   - [S] Story/Epic
   - [C] Code file

[Enter path or type]
```

Validate artifact exists and is readable. Load its content.

---

## Step 2: Resolve Constitution

Call resolve-constitution logic to get accumulated rules for current context:

1. Determine hierarchy from active initiative
2. Walk chain parent-first: Org → Domain → Service → Repo (per lifecycle.yaml resolution_order)
3. Collect all applicable articles
4. Collect track permissions, required gates, and additional review participants

```
Resolving constitution for current context...

Found {constitution_count} constitution(s):
{list constitutions with layers}

Total articles to check: {article_count}
Track governance: {permitted_tracks_count} track rules, {required_gates_count} gate rules
```

**If no constitutions found:**
```
📜 No rules defined. Compliance check not applicable.

There are no constitutions governing this context.
This is expected if governance has not been configured for this scope.
```

Exit gracefully — this is not an error.

---

If invoked non-interactively and no constitutions exist, return:

```yaml
compliance_result:
  artifact_path: {artifact_path}
  artifact_type: {artifact_type}
  verdict: NO_RULES
  pass_count: 0
  warn_count: 0
  fail_count: 0
  constitution_count: 0
  article_count: 0
  track_permitted: true
  gate_violations: []
```

---

## Step 2a: Track & Gate Validation

Before evaluating articles, validate initiative track and gate compliance:

```yaml
# Load initiative context
initiative = load("_bmad-output/lens-work/initiatives/{active_id}.yaml")
track = initiative.track  # e.g., "full", "feature", "tech-change"

# Track permission check (intersection of all permitted_tracks in chain)
if permitted_tracks and track not in permitted_tracks:
  track_violation = {
    severity: "FAIL",
    rule: "Track '${track}' not permitted by constitution chain",
    restricting_layers: [layers that excluded this track],
    permitted: list(permitted_tracks)
  }

# Required gate check (union of all required_gates in chain)
# Compare against track's default gates from lifecycle.yaml
track_config = lifecycle.tracks[track]
track_default_gates = derive_gates_from_track(track_config)

missing_gates = required_gates - track_default_gates
if missing_gates:
  gate_violations = [{
    severity: "WARN",
    rule: "Constitution requires gate '${gate}' but track '${track}' skips it",
    gate: gate,
    required_by: [layers that require this gate]
  } for gate in missing_gates]
```

Track violations produce FAIL (blocking). Gate violations produce WARN (advisory — the gate will be enforced at promotion time regardless).

---
## Step 3: Evaluate Each Article

For each article in the resolved constitution, evaluate the artifact:

1. Read the article's rule and evidence requirements

2. **Determine enforcement level** by parsing the article header:
   - Match header against regex: `^###\s+Article\s+\w+:.*\(ADVISORY\)`
   - If `(ADVISORY)` marker is present → enforcement = **ADVISORY** (max severity: WARN)
   - If `(ADVISORY)` marker is absent → enforcement = **MANDATORY** (default; max severity: FAIL)
   - Note: `(NON-NEGOTIABLE)` marker is valid for documentation clarity but has **no behavioral effect** — all non-ADVISORY articles already default to FAIL enforcement

3. Search the artifact for:
   - Direct mention of the requirement
   - Section addressing the topic
   - Evidence matching the required evidence type
   - Implicit compliance through design/content

4. Classify each article (enforcement-aware):
   - **PASS** — Clear evidence of compliance found in artifact
   - **WARN** — Topic not addressed or only partially addressed (not verified). Also the maximum severity for `(ADVISORY)` articles — even explicit non-compliance produces WARN, never FAIL.
   - **FAIL** — Direct contradiction or explicit non-compliance found. **Only applies to MANDATORY articles.** If the article is `(ADVISORY)`, cap the result at WARN instead.

```
Evaluating Article {id}: {title} [{MANDATORY|ADVISORY}]...
```

---

## Step 4: Generate Report

### Report Header

```
📜 Constitutional Compliance Review

Artifact: {artifact_path}
Type: {artifact_type}
Context: {layer} — {name}
Track: {track}

Checking against: {constitution_count} constitution(s), {article_count} articles
Resolution chain: {chain_layers} (per lifecycle.yaml)
Date: {today_date}

{if track_violation:}
❌ TRACK VIOLATION: Track '{track}' not permitted by {restricting_layers}
   Permitted tracks: {permitted_tracks}
{endif}

{if gate_violations:}
⚠️ GATE ADVISORIES:
{for each gate_violation:}
  - Gate '{gate}' required by {required_by} but skipped by track '{track}'
{endfor}
{endif}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verdict

Determine overall verdict (enforcement-aware):
- Track violation (track not permitted) → **NON-COMPLIANT** (always blocking)
- Any FAIL from a **MANDATORY** article → **NON-COMPLIANT**
- All PASS → **COMPLIANT**
- Mix of PASS and WARN (including ADVISORY-capped WARNs and gate advisories) → **CONDITIONAL PASS**

Note: `(ADVISORY)` article violations are capped at WARN and **never** trigger NON-COMPLIANT.
Note: Gate violations are WARN-level — they advise but don't block (gates are enforced at promotion time).

```
{if COMPLIANT:}
✅ VERDICT: COMPLIANT
All {article_count} articles satisfied ({mandatory_count} mandatory, {advisory_count} advisory).

{if CONDITIONAL PASS:}
⚠️ VERDICT: CONDITIONAL PASS
{pass_count} satisfied, {warn_count} not verified (includes {advisory_warn_count} advisory), 0 mandatory violations.

{if NON-COMPLIANT:}
❌ VERDICT: NON-COMPLIANT
{fail_count} mandatory violation(s) detected.
{if advisory_warn_count > 0:}
Additionally: {advisory_warn_count} advisory warning(s) (non-blocking).
```

### Detailed Results

```
## Results by Article

{for each article:}

{PASS|WARN|FAIL} [{MANDATORY|ADVISORY}] Article {id}: {title} — {status}

  {if PASS:}
  Enforcement: {MANDATORY|ADVISORY}
  Evidence: {evidence_quote_or_section}
  Location: {section_reference}

  {if WARN:}
  Enforcement: {MANDATORY|ADVISORY}
  Expected: {expected_evidence}
  Found: No mention of {topic}
  {if ADVISORY:} ℹ️ Advisory article — this warning is non-blocking
  Recommendation: Add section addressing {requirement}

  {if FAIL:}
  Enforcement: MANDATORY
  Issue: {violation_description}
  Location: {section_reference}
  Required Action: {remediation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Summary

```
## Summary

N/total PASS | N/total WARN | N/total FAIL

Articles: {mandatory_count} mandatory, {advisory_count} advisory

{if recommendations:}
## Recommendations
{numbered list of items to address}
```

---

## Step 5: Event Logging

Log compliance evaluation event:

```yaml
type: compliance-evaluated
timestamp: {now}
artifact_path: {artifact_path}
artifact_type: {artifact_type}
constitution_resolved: {list of constitutions checked}
pass_count: {pass_count}
warn_count: {warn_count}
fail_count: {fail_count}
initiative_id: {active_initiative_id}  # REQUIRED for compliance events
```

Note: `initiative_id` is **required** for compliance events (compliance always runs in initiative context).

---

## Step 6: Return Machine-Readable Result

When invoked by another workflow, return a structured summary:

```yaml
compliance_result:
  artifact_path: {artifact_path}
  artifact_type: {artifact_type}
  verdict: {COMPLIANT|CONDITIONAL_PASS|NON_COMPLIANT|NO_RULES}
  pass_count: {pass_count}
  warn_count: {warn_count}
  fail_count: {fail_count}
  constitution_count: {constitution_count}
  article_count: {article_count}
  track_permitted: {true|false}
  gate_violations: [{gate_name, required_by}]
  resolution_chain: [{layer, name}]
```

`NO_RULES` is returned when no constitutions exist for the context.

---

## Completion

```
Compliance check complete.

{if violations:}
- Fix violations and re-check → /compliance
{endif}
- View full constitution → /resolve
- Show ancestry → /ancestry
- Return to @lens → exit
```

