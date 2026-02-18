# Step 1: Gather Constitution Requirements

Collect articles for a new constitution.

---

## Context Check

**Confirm with user:**
- Current LENS layer: `{current_layer}` 
- Constitution root: `{constitution_root}`
- Target path: `{constitution_root}/{layer_path}/constitution.md`

---

## Layer Selection

**Ask:**
```
📜 Creating a new constitution.

What layer is this constitution for?

1. **Domain** — Enterprise-wide rules (applies to everything)
2. **Service** — Service boundary rules (applies to service + all microservices)
3. **Microservice** — API/component rules (applies to microservice + features)
4. **Feature** — Feature-specific rules (narrowest scope)

[Enter 1-4 or layer name]
```

**Based on selection, set:**
- `{layer_type}` = Domain | Service | Microservice | Feature
- `{template_path}` = `{project-root}/_bmad/lens-work/templates/constitutions/{layer_type-lower}-constitution.md`

---

## Name the Constitution

**Ask:**
```
What name for this constitution?

Examples:
- "Acme Corp" (Domain)
- "ecommerce" (Service)  
- "checkout-api" (Microservice)
- "express-checkout" (Feature)
```

**Store as:** `{constitution_name}`

---

## Show Template

**Load:** `{template_path}`

**Display:**
```
📜 Here's the template structure for a {layer_type} constitution:

[Show template structure - Preamble, Articles, Governance]

I'll help you fill in each section.
```

---

## Inheritance Context Guidance

**IF layer is NOT Domain:**

```
📚 **Inheritance Guidance**

This constitution will inherit from parent constitution(s):
{parent_chain}

**What inheritance means:**
- ✅ You CAN add new articles specific to this scope
- ✅ You CAN narrow/specialize inherited rules (with compatible constraints)
- ❌ You CANNOT contradict parent articles
- ❌ You CANNOT remove inherited governance

**Parent principles you're inheriting:**

{if parents exist:}
{for each parent constitution:}
**From {parent_layer}/{parent_name}:**
{for each parent article:}
- Article {n}: {title} — {summary}
{endfor}
{endfor}

**Recommendation:** Review parent principles from the **Principle Catalog** before
defining articles to ensure alignment and avoid contradictions.

**Access catalog:** See `_bmad/lens-work/data/governance/principle-catalog.md`
{endif}

{if no parents:}
(No parent constitutions found — you are creating a root constitution)
{endif}
```

**Offer catalog access:**
```
Would you like to review the Principle Catalog for guidance? [Y/N]
```

**IF Y:**
- Load and display `{project-root}/_bmad/lens-work/data/governance/principle-catalog.md`
- Highlight principles relevant to selected layer
- Return to gather flow

**IF N:**
- Continue to preamble

---

## Gather Preamble

**Ask:**
```
**Preamble**

What is the purpose of this constitution? 
What should it ensure across all governed work?

(2-4 sentences describing the "why")
```

**Store as:** `{preamble}`

---

## Gather Articles

**Loop until user signals done:**

```
📋 **Article {n}: {title}**

1. What rule should this article establish?
2. What's the rationale? (Why does this rule exist?)
3. What evidence is required to satisfy this article?

[Enter article content, or "done" when finished]
```

**For each article, store:**
- `{article_title}`
- `{article_rule}`
- `{article_rationale}`
- `{article_evidence}`

---

## Minimum Articles Check

**IF article count < 3:**
```
⚠️ Constitutional best practice: At least 3 articles for meaningful governance.

Current: {count} articles

Add more articles? [Y/N]
```

---

## Proceed to Validation

**When complete:**
```
✅ Constitution draft ready:
- Name: {constitution_name}
- Layer: {layer_type}
- Articles: {count}

Proceeding to inheritance validation...
```

**LOAD:** `{installed_path}/steps-c/step-02-validate.md`
