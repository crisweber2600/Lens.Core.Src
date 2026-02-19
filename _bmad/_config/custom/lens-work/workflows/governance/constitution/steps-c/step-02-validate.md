# Step 2: Validate Inheritance

Check new constitution against parent constitutions for contradictions.

---

## Testability Evaluation

**Before inheritance validation, check articles for testability:**

```
🔬 **Testability Evaluation**

Analyzing articles for verifiable evidence requirements...
```

**For each article:**
1. Check if `evidence_required` field is specific and measurable
2. Flag vague requirements:
   - ❌ "Good test coverage" → VAGUE
   - ✅ "Test suite with >80% code coverage" → SPECIFIC
   - ❌ "Should follow best practices" → VAGUE
   - ✅ "Code review approval with checklist completed" → SPECIFIC

**Display flagged articles:**
```
{if vague articles found:}
⚠️ **Testability Issues Detected**

The following articles have vague or unmeasurable evidence requirements:

{for each vague article:}
**Article {n}: {title}**
Current evidence: "{vague_evidence}"

Issue: {description}

Suggested improvements:
{suggestions}

[S]pecify better evidence | [K]eep as-is | [E]dit article
{endfor}

{if no vague articles:}
✅ All articles have specific, measurable evidence requirements.
{endif}
```

**Capture responses:**
- If **S**pecify: Prompt for revised evidence requirement
- If **K**eep: Mark as accepted (add warning note to constitution)
- If **E**dit: Return to step-01-gather to revise article

**Continue only after all articles either pass or are explicitly accepted as-is.**

---

## Load Parent Constitutions

**IF layer_type is NOT Domain:**

1. Walk up inheritance chain
2. Load each parent constitution
3. Collect all parent articles

**Parent chain:**
- Feature → Microservice → Service → Domain
- Service → Domain
- Microservice → Service → Domain
- Domain → None (root)

**Store as:** `{parent_articles}[]`

---

## Contradiction Detection

**For each new article:**
- Compare against all parent articles
- Check for conflicts in:
  - Direct contradiction (opposite rules)
  - Scope narrowing that violates parent intent
  - Evidence requirements that conflict

**Contradiction Examples:**
- Parent: "All APIs must use REST"  
- Child: "GraphQL is the required API pattern" → CONTRADICTION

- Parent: "Security review required"
- Child: "Security review waived for small changes" → POTENTIAL CONFLICT

---

## Report Results

**IF no contradictions:**
```
✅ **Inheritance Validation Passed**

Checked against {parent_count} parent constitution(s):
{parent_list}

Your {count} articles do not contradict inherited governance.

Proceeding to ratification...
```

**LOAD:** `{installed_path}/steps-c/step-03-ratify.md`

---

## Constitutional Crisis Mode

**IF contradictions found:**
```
⚠️ **Constitutional Crisis Detected**

{count} potential contradiction(s) with parent governance:

---

**Contradiction 1:**
- Your Article: "{new_article}"
- Parent Article: "{parent_article}" (from {parent_name})
- Issue: {description}

---

**Resolution Options:**
1. **Modify your article** — Reword to align with parent
2. **Narrow scope** — Add exception clause that doesn't contradict
3. **Escalate** — Flag for governance review (parent may need amendment)
4. **Withdraw** — Remove the conflicting article

[Select option for each contradiction]
```

**For each contradiction, capture resolution:**
- Store resolution choice
- If modify: Get new article text
- If withdraw: Remove from draft

**After all resolved:**
```
✅ All contradictions resolved.

Proceeding to ratification...
```

**LOAD:** `{installed_path}/steps-c/step-03-ratify.md`
