# Step 1: Select Artifact

## Purpose

Identify and load the artifact to evaluate for quality.

---

## Input Parameters

Accept `artifact_path` and `artifact_type` if provided as workflow parameters. Otherwise, prompt interactively.

## Interactive Selection

```
📋 Requirements Quality Checklist

Which artifact should I evaluate?

1. [PB] Product Brief
2. [PR] PRD
3. [AR] Architecture
4. [EP] Epics
5. [ST] Stories

Or enter a file path directly.

[Select type or enter path]
```

## Artifact Discovery

Based on selection, resolve the artifact path:

1. If path provided directly → validate file exists
2. If type selected → look in active initiative's artifact directory:
   - `product-brief` → `{initiative_docs_path}/product-brief.md`
   - `prd` → `{initiative_docs_path}/prd.md`
   - `architecture` → `{initiative_docs_path}/architecture.md`
   - `epics` → `{initiative_docs_path}/epics.md`
   - `stories` → `{initiative_docs_path}/stories.md`

3. Validate artifact exists and is readable. If not found:
```
⚠️ Artifact not found at expected path: {path}
Please provide a direct file path or check your initiative state.
```

## Load Artifact

Load the artifact content for evaluation. Set:
- `{artifact_path}` — resolved file path
- `{artifact_type}` — one of: product-brief, prd, architecture, epics, stories
- `{artifact_content}` — full text content of the artifact
