# Step 3: Present Results and Store

## Purpose

Format checklist results, display to user, and store at the leaf-constitution path.

---

## Format Results

### Report Header

```
📋 Requirements Quality Checklist

Artifact: {artifact_path}
Type: {artifact_type}
Date: {today_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall: {pass_count}/{total_count} PASS | {fail_count}/{total_count} FAIL
```

### Results by Dimension

For each of the 5 dimensions:

```
## {Dimension Name}

{for each item:}
{PASS|FAIL} — {item_text}
  Rationale: {rationale}

Dimension Score: {dim_pass}/{dim_total}
```

### Summary

```
## Summary

| Dimension | Pass | Fail | Score |
|-----------|------|------|-------|
| Completeness | {n} | {n} | {n}/{n} |
| Clarity | {n} | {n} | {n}/{n} |
| Consistency | {n} | {n} | {n}/{n} |
| Measurability | {n} | {n} | {n}/{n} |
| Coverage | {n} | {n} | {n}/{n} |
| **Total** | **{pass_count}** | **{fail_count}** | **{pass_count}/{total_count}** |

{if fail_count > 0:}
## Recommendations
{numbered list of failed items with improvement suggestions}
```

---

## Store Checklist

### Resolve Leaf Constitution

1. From `constitutional_context.resolved_constitution`, identify the **leaf** (most specific) constitution in the inheritance chain
2. If no leaf constitution: use the root domain constitution
3. If no constitutional context at all: store at `_bmad-output/lens-work/checklists/{artifact_type}.md` (fallback)

### Storage Path

```
_bmad-output/lens-work/constitutions/{layer}/{name}/checklists/{artifact_type}.md
```

Where:
- `{layer}` = leaf constitution layer (domain, service, microservice, feature)
- `{name}` = leaf constitution name
- `{artifact_type}` = the artifact type being evaluated (product-brief, prd, architecture, epics, stories)

### Write File

1. Create directory path if it doesn't exist
2. Write the full checklist report to the storage path
3. **Overwrite** any existing file (idempotent — re-evaluation replaces previous result)
4. Commit via Casey with governance-prefixed message:
   ```
   governance: checklist evaluation — {artifact_type} for {constitution_name}
   ```
