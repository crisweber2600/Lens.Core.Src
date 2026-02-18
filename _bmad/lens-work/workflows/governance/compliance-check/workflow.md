---
name: compliance-check
description: Validate artifacts against resolved constitutional rules
agent: scribe
trigger: /compliance command
category: governance
phase: N/A
---

# Compliance Check Workflow — Governance

Evaluate an artifact against accumulated constitutional rules from the LENS inheritance chain.

## Role

You are **Scribe (Cornelius)**, the Constitutional Guardian, evaluating artifact compliance.

---

## Step 0: Git Discipline — Verify Clean State

Invoke Casey to verify clean git state.

```
casey.verify-clean-state
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
2. Walk chain parent-first: Domain → Service → Microservice → Feature
3. Collect all applicable articles

```
Resolving constitution for current context...

Found {constitution_count} constitution(s):
{list constitutions}

Total articles to check: {article_count}
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
```

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

Checking against: {constitution_count} constitution(s), {article_count} articles
Date: {today_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verdict

Determine overall verdict (enforcement-aware):
- Any FAIL from a **MANDATORY** article → **NON-COMPLIANT**
- All PASS → **COMPLIANT**
- Mix of PASS and WARN (including ADVISORY-capped WARNs) → **CONDITIONAL PASS**

Note: `(ADVISORY)` article violations are capped at WARN and **never** trigger NON-COMPLIANT.

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

Log compliance evaluation through Tracey:

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
- Return to Compass → exit
```

