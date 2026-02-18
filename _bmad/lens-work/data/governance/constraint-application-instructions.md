# Constitutional Constraint Application Instructions

**Purpose:** Standardized instructions for artifact-creation agents to apply `constitutional_context` as active constraints during artifact generation.

**Referenced by:** All artifact-creation workflows (brainstorm, product-brief, PRD, architecture, epics, stories).

---

## Graceful Skip Check

**Before applying any constraints, check availability:**

1. If `constitutional_context` is **null** or **undefined** → SKIP this entire instruction block silently. Proceed with normal artifact generation.
2. If `constitutional_context.status == "no_constitution"` → SKIP silently. No governance applies to this context.
3. Otherwise → proceed with constraint application below.

---

## Step 1: Extract Relevant Articles

From `constitutional_context.resolved_constitution`, extract all articles from the inheritance chain:

1. Read each article's title, rule text, rationale, and evidence requirements
2. Note the layer of origin (Domain, Service, Microservice, Feature) for each article
3. Note the enforcement level:
   - Articles with `(ADVISORY)` in the header → **ADVISORY** (guidance only, non-blocking)
   - All other articles → **MANDATORY** (hard constraints, blocking on violation)
   - `(NON-NEGOTIABLE)` marker indicates documentation emphasis but has no additional behavioral effect beyond the default MANDATORY enforcement

---

## Step 2: Apply Phase-Relevant Focusing

To manage token budget effectively (per NFR-3), focus on articles most relevant to the current artifact type:

| Artifact Type | Priority Focus |
|---------------|----------------|
| **Brainstorm/Research** | All articles (broad exploration) — light touch |
| **Product Brief** | Architecture, quality, security articles |
| **PRD** | All articles — requirements must address governance |
| **Architecture** | Architecture, security, observability, API articles |
| **Epics** | Architecture, process articles |
| **Stories** | Testing, quality, security, documentation articles |

When token budget is constrained:
- Prioritize **MANDATORY** articles over **ADVISORY** articles
- Prioritize articles from the **leaf (most specific) constitution** over parent layers
- Include at minimum all **NON-NEGOTIABLE** marked articles regardless of focus

---

## Step 3: Treat Articles as Active Constraints

During artifact generation, apply each relevant article as follows:

### For MANDATORY Articles (default)
- **Treat as hard constraints** — the generated artifact MUST address or comply with these rules
- If the article requires specific evidence (e.g., "TDD approach documented"), ensure the artifact includes a section or reference addressing it
- If the article conflicts with user requirements, surface the conflict explicitly rather than silently ignoring
- Reference the article in the artifact where it influenced content

### For ADVISORY Articles
- **Treat as guidance** — the generated artifact SHOULD consider these recommendations
- Include advisory considerations where practical, but do not let them override explicit user requirements
- Note advisory alignment in the artifact where relevant

---

## Step 4: Reference Constitutional Articles in Artifacts

Where a constitutional article influenced the content of the generated artifact, add explicit references:

**Examples:**
- "Per Article I (TDD): All components include test strategy specifications."
- "Aligned with Article III (API-First): REST endpoints defined before implementation."
- "Article V (Domain-Driven Documentation) addressed in Section 4.2."

**Referencing guidelines:**
- Reference articles naturally within the relevant section, not as a separate appendix
- Use the format: `Per Article {ID} ({short title}): {how it was applied}`
- Only reference articles that actually influenced the content — do not force-reference all articles
- For ADVISORY articles, use: `Considering Article {ID} ({short title}, ADVISORY): {how it was considered}`

---

## Step 5: Report Unaddressable Articles

If any MANDATORY article cannot be addressed in the current artifact type (e.g., a testing article in a product brief), note this:

```
Note: Article {ID} ({title}) applies to implementation artifacts rather than {current_artifact_type}. 
It will be evaluated during compliance checks at the appropriate phase.
```

This ensures traceability without forcing irrelevant content into artifacts.
