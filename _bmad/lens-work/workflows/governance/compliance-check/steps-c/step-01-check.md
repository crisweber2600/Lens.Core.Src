# Step 1: Check Compliance

Load artifact and evaluate against constitution.

---

## Get Artifact

**If not provided:**
```
🧾 **Constitutional Compliance Check**

Which artifact should I evaluate?

Options:
1. Enter file path (e.g., docs/prd-checkout.md)
2. Select artifact type:
   - [P] PRD
   - [A] Architecture document
   - [S] Story/Epic
   - [C] Code file

[Enter path or type]
```

**Validate artifact exists:**
- If path: Check file exists
- If type: Search common locations

---

## Load Artifact Content

**Read artifact file:**
```
Loading artifact: {artifact_path}

File size: {size}
Type: {detected_type}
```

**Parse artifact:**
- Extract sections/headers
- Identify key content areas
- Note any existing compliance sections

---

## Resolve Constitution

**Get resolved constitution for context:**
- Use resolve-constitution logic
- Get all applicable articles

```
Resolving constitution for {current_layer}...

Found {constitution_count} constitution(s):
- {constitution_list}

Total articles to check: {article_count}
```

---

## Evaluate Each Article

**For each article in resolved constitution:**

1. **Determine enforcement level** by parsing the article header:
   - Match header against regex: `^###\s+Article\s+\w+:.*\(ADVISORY\)`
   - If `(ADVISORY)` marker is present → enforcement = **ADVISORY** (max severity: WARN)
   - If `(ADVISORY)` marker is absent → enforcement = **MANDATORY** (default; max severity: FAIL)
   - Note: `(NON-NEGOTIABLE)` marker is valid for documentation clarity but has **no behavioral effect** — all non-ADVISORY articles already default to FAIL enforcement

```
Evaluating Article {id}: {title} [{MANDATORY|ADVISORY}]...
```

2. **Check artifact for:**
   - Direct mention of the requirement
   - Section addressing the topic
   - Evidence matching required evidence type
   - Implicit compliance through design

3. **Classify each article** (enforcement-aware):
   - ✅ **PASS** — Clear evidence of compliance found
   - ⚠️ **WARN** — Topic not addressed or only partially addressed (not verified). Also the maximum severity for `(ADVISORY)` articles — even explicit non-compliance produces WARN, never FAIL.
   - ❌ **FAIL** — Direct contradiction or explicit non-compliance found. **Only applies to MANDATORY articles.** If the article is `(ADVISORY)`, cap the result at WARN instead.

---

## Collect Results

**Store evaluation:**
```yaml
results:
  - article: "I"
    title: "{title}"
    enforcement: MANDATORY | ADVISORY
    status: PASS | WARN | FAIL
    evidence: "{quote or section reference}"
    location: "{line numbers or section}"
    notes: "{additional context}"
```

---

## Calculate Verdict

**Rules** (enforcement-aware):
- Any ❌ FAIL from a **MANDATORY** article → **NON-COMPLIANT**
- All ✅ PASS → **COMPLIANT**
- Mix of ✅ PASS and ⚠️ WARN (including ADVISORY-capped WARNs) → **CONDITIONAL PASS**

Note: `(ADVISORY)` article violations are capped at WARN and **never** trigger NON-COMPLIANT.

**Store:**
- `{verdict}` = COMPLIANT | CONDITIONAL_PASS | NON_COMPLIANT
- `{pass_count}`
- `{warn_count}`
- `{fail_count}`
- `{mandatory_count}`
- `{advisory_count}`

---

## Proceed to Report

**LOAD:** `{installed_path}/steps-c/step-02-report.md`
