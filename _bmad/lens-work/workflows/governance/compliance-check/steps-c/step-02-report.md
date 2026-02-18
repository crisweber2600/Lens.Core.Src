# Step 2: Compliance Report

Generate and display the compliance report.

---

## Report Header

```
🧾 **Constitutional Compliance Review**

**Artifact:** {artifact_path}
**Type:** {artifact_type}
**Context:** {layer_path} ({layer_type})

**Checking against:** {constitution_count} constitution(s), {article_count} articles

**Date:** {today_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Verdict Banner

**IF COMPLIANT:**
```
✅ **VERDICT: COMPLIANT**

All {article_count} articles satisfied ({mandatory_count} mandatory, {advisory_count} advisory).
This artifact is cleared for implementation.
```

**IF CONDITIONAL_PASS:**
```
⚠️ **VERDICT: CONDITIONAL PASS**

{pass_count} PASS, {warn_count} WARN (includes {advisory_warn_count} advisory), 0 mandatory violations.
Review unverified items before proceeding.
```

**IF NON-COMPLIANT:**
```
❌ **VERDICT: NON-COMPLIANT**

{fail_count} mandatory violation(s) detected.
This artifact requires remediation before implementation.
```

---

## Detailed Results

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Results by Article

{for each article:}

{status_icon} **Article {id}: {title}** — {PASS|WARN|FAIL} [{MANDATORY|ADVISORY}]

{if PASS:}
   **Evidence:** {evidence_quote}
   **Location:** {location}

{if WARN:}
   **Enforcement:** {MANDATORY|ADVISORY}
   **Expected:** {expected_evidence}
   **Found:** No mention of {topic}
   **Recommendation:** Add section addressing {requirement}

{if FAIL:}
   **Enforcement:** MANDATORY
   **Issue:** {violation_description}
   **Location:** {location}
   **Required Action:** {remediation}

---
```

---

## Summary by Constitution

```
## Compliance by Source

**Domain Constitution ({domain_name}):**
- ✅ {pass_count}/{total} PASS
- ⚠️ {warn_count} WARN ({advisory_warn_count} advisory)
- ❌ {fail_count} FAIL (mandatory only)

**Service Constitution ({service_name}):**
- ✅ {pass_count}/{total} PASS
- ...

**Local Constitution ({local_name}):**
- ✅ {pass_count}/{total} PASS
- ...
```

---

## Recommendations

**IF warn_count > 0:**
```
## Recommendations

The following items were not explicitly addressed in the artifact:

{for each WARN:}
{n}. **{article_title}** [{MANDATORY|ADVISORY}]
   - Add: {suggested_content}
   - Section: {suggested_location}
```

**IF fail_count > 0:**
```
## Required Remediations

The following mandatory violations must be resolved:

{for each FAIL:}
{n}. **{article_title}** [MANDATORY]
   - Issue: {issue}
   - Fix: {remediation}
   - Priority: {High | Medium}
```

---

## Save Report Option

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Save this report?

1. [Y] Save to {artifact_path}.compliance.md
2. [N] Don't save
3. [C] Save to custom location

[Enter selection]
```

**IF save:**
- Write report to file
- Add timestamp and artifact reference

---

## Audit Trail

Log `compliance-evaluated` through Tracey with:
- timestamp
- artifact_path
- artifact_type
- constitution_resolved
- pass_count
- warn_count
- fail_count
- initiative_id (required)

---

## Completion

```
Compliance check complete.

What's next?
{if fail_count > 0:}
- Fix mandatory violations and re-check -> /compliance
{endif}
- View full constitution -> /resolve
- Return to menu -> H
```
