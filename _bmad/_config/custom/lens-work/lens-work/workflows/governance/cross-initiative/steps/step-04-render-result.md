---
name: 'step-04-render-result'
description: 'Render the sensing report and optionally enforce the hard gate'
---

# Step 4: Render The Sensing Result

**Goal:** Present the overlap report clearly and only block when the caller explicitly requests hard-gate enforcement.

---

## EXECUTION SEQUENCE

### 1. Render The Report

```yaml
overlap_lines = map(sensing_report.overlaps || [], item ->
  "- " + item.initiative + " (" + item.phase + "/" + item.audience + ") — " + item.conflict_reason + "\n  💡 " + derive_overlap_guidance(item)
)

# derive_overlap_guidance returns context-aware next steps:
#   name_conflict   → "Consider renaming to avoid slug collision, or merge with the existing initiative."
#   scope_overlap   → "Review whether this work belongs in the existing initiative instead."
#   resource_clash  → "Coordinate with the owner of the overlapping initiative before proceeding."
#   default         → "Run /status on the overlapping initiative to assess its current state."

if sensing_result.blocks_promotion == true and inputs.enforce_gate == true:
  output: |
    ⚠️ Cross-initiative sensing requires explicit conflict resolution.
    ${overlap_lines.join("\n")}
  FAIL("❌ Hard-gated sensing overlaps must be resolved before promotion can continue.")

output: |
  ## Cross-Initiative Sensing

  Gate mode: ${sensing_result.gate_mode}
  Overlaps: ${sensing_result.has_overlaps ? "yes" : "no"}

  ${sensing_result.has_overlaps ? overlap_lines.join("\n") : "No overlapping initiatives detected ✅"}
```