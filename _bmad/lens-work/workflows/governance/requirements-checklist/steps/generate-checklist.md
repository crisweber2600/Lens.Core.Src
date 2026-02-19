# Step 2: Generate Checklist

## Purpose

Generate quality checklist items across 5 dimensions, using constitutional context for governance-aware evaluation.

---

## Constitutional Context Check

**Before generating governance-specific items:**

1. If `constitutional_context` is **null** or **undefined** → skip constitutional items silently
2. If `constitutional_context.status == "no_constitution"` → skip constitutional items silently
3. Otherwise → include constitutional governance items in each dimension

---

## 5-Dimension Checklist Generation

For each dimension, generate **at least 3 context-specific items** derived from the artifact content — not from a static template. All items MUST follow the pattern:

> **"Are [X] defined/specified for [Y]?"**

Never use "Verify that X works." This validates the **quality of what is written**, not whether implementations function ("unit tests for English").

Items MUST be **artifact-type-aware** — PRD items differ from architecture items differ from story items.

---

### Dimension 1: Completeness

Evaluate whether the artifact addresses all expected areas for its type.

**Artifact-type-specific generation:**

- `product-brief`: Are stakeholders identified? Are success criteria defined? Are constraints enumerated? Are open questions resolved?
- `prd`: Are all functional requirements specified with acceptance criteria? Are non-functional requirements addressed? Are user stories present? Are out-of-scope items documented?
- `architecture`: Are component boundaries defined? Are integration points specified? Are data flows documented? Are architecture decisions recorded with rationale?
- `epics`: Are all PRD functional requirements traced to at least one epic? Are epic scope boundaries clear? Are acceptance criteria defined per epic?
- `stories`: Are acceptance criteria defined for every story? Are dependencies documented? Are story points estimated? Are technical notes provided?

**Constitutional items (when context available):**

For each article in `constitutional_context.resolved_constitution`:
- "Are Article {id} ({title}) requirements addressed in this artifact?"

---

### Dimension 2: Clarity

Evaluate whether requirements are unambiguous and specific.

- Are requirements free of subjective adjectives without measurable targets (e.g., "fast", "easy", "good", "clean")?
- Are technical terms defined or referenced consistently?
- Are conditional behaviors explicitly stated (if/then/else)?
- Are roles and responsibilities clearly assigned?
- Are boundary conditions specified (min/max, edge cases)?

---

### Dimension 3: Consistency

Evaluate internal consistency within the artifact.

- Are naming conventions used consistently throughout?
- Are referenced identifiers (FR-X, NFR-Y, Story S-X, Epic E-X) used consistently?
- Are priority/severity classifications applied consistently?
- Are terms and abbreviations used with the same meaning throughout?
- Do cross-references (to other artifacts or sections) resolve correctly?

---

### Dimension 4: Measurability

Evaluate whether requirements can be objectively verified.

- Are acceptance criteria binary (pass/fail) rather than subjective?
- Are performance targets quantified (response time, throughput, etc.)?
- Are "Evidence Required" criteria specific enough to evaluate objectively?
- Are success metrics defined with concrete thresholds?
- Are test approaches implied by the requirement specification?

---

### Dimension 5: Coverage

Evaluate cross-reference completeness.

- Are all referenced documents/artifacts traceable?
- Are edge cases and error scenarios addressed?
- Are non-functional requirements (security, performance, accessibility) covered?
- Are rollback/failure recovery scenarios documented?
- Are integration and deployment considerations addressed?

---

## Item Assessment

For each generated item:

1. Examine the artifact content for evidence
2. Classify as:
   - **PASS** — Clear evidence found in artifact
   - **FAIL** — Not addressed or insufficiently addressed
3. Include brief rationale (1-2 sentences) explaining the assessment

---

## Output

Collect all items with assessments into `{checklist_items}`:

```
{dimension}: {item_text}
Assessment: {PASS|FAIL}
Rationale: {brief_explanation}
```

Calculate:
- `{pass_count}` — total PASS items
- `{fail_count}` — total FAIL items
- `{total_count}` — total items generated
