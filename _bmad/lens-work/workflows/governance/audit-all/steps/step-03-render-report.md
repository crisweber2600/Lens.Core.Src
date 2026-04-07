---
name: 'step-03-render-report'
description: 'Render the aggregate audit report'
---

# Step 3: Render Audit Report

**Goal:** Present a consolidated compliance dashboard across all initiatives.

---

## EXECUTION SEQUENCE

### 1. Compute Summary

```yaml
total_initiatives = len(initiative_entries)
total_findings = sum(len(f) for f in audit_findings.values())
high_count = count findings where severity == "high"
medium_count = count findings where severity == "medium"
low_count = count findings where severity == "low"
clean_count = count initiatives where len(findings) == 0

health = "Healthy" if high_count == 0 else ("Needs Attention" if high_count <= 2 else "Critical")
```

### 2. Render Summary

```yaml
output: |
  ## 🔍 Cross-Initiative Audit Report

  | Metric | Value |
  |--------|-------|
  | Initiatives scanned | ${total_initiatives} |
  | Clean (no findings) | ${clean_count} |
  | Total findings | ${total_findings} |
  | High | ${high_count} |
  | Medium | ${medium_count} |
  | Low | ${low_count} |
  | Overall health | ${health} |
```

### 3. Render Per-Initiative Detail

```yaml
if total_findings > 0:
  output: |
    ### Findings By Initiative

    | Initiative | Severity | Check | Finding |
    |-----------|----------|-------|---------|
    ${for root, findings in audit_findings.items():}
    ${for f in findings:}
    | ${root} | ${f.severity} | ${f.check} | ${f.message} |
    ${end}
    ${end}
else:
  output: "✅ All initiatives passed compliance checks."
```

### 4. Recommendations

```yaml
if high_count > 0:
  output: |
    ### ⚠️ Recommended Actions
    ${for root, findings in audit_findings.items():}
    ${for f in findings where f.severity == "high":}
    - **${root}**: ${f.message} — run `/status` on this initiative to investigate
    ${end}
    ${end}
```

---

## WORKFLOW COMPLETE
