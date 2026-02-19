# Step: Present Findings

**Purpose:** Generate actionable report with prioritized findings and remediation guidance.

---

## Report Structure

### Executive Summary

```markdown
## Cross-Artifact Analysis Report

**Initiative:** ${initiative_id}
**Phase:** ${phase_name} (${phase})
**Timestamp:** ${timestamp}
**Artifacts Analyzed:** ${artifacts_analyzed.count}

---

### Findings Summary

| Severity | Count |
|----------|-------|
| CRITICAL | ${critical_count} |
| HIGH     | ${high_count} |
| MEDIUM   | ${medium_count} |
| LOW      | ${low_count} |
| **TOTAL** | **${total_findings}** |

---

### Overall Health

${health_indicator}  # 🟢 Healthy | 🟡 Needs Attention | 🔴 Critical Issues

**Coverage Metrics:**
- **Requirement → Epic:** ${requirement_coverage}% (target: 95%)
- **Epic → Story:** ${epic_coverage}% (target: 100%)
- **Constraint → Decision:** ${constraint_coverage}% (target: 90%)

**Semantic Coherence:**
- Term inconsistencies detected: ${semantic_issues_count}
- Constraint propagation gaps: ${constraint_gaps_count}

---
```

---

### Detailed Findings by Severity

#### CRITICAL Findings (${critical_count})

**Require immediate action** — These issues may block implementation or cause requirements loss.

```markdown
---

**Finding #1**
- **Severity:** CRITICAL
- **Category:** Traceability Gap
- **Issue:** FR-3 (Context Loading) has no corresponding epic
- **Artifact:** prd.md (line 145)
- **Impact:** Requirement may be lost during implementation planning
- **Recommended Action:**
  1. Review FR-3 in [prd.md](prd.md#L145)
  2. Determine if new epic needed or should merge with existing epic
  3. Update [epics.md](epics.md) to include explicit "Satisfies FR-3" statement
  4. Re-run cross-artifact analysis to verify fix

---

**Finding #2**
- **Severity:** CRITICAL
- **Category:** Broken Reference
- **Issue:** Story S5.2 references non-existent epic E12
- **Artifacts:** stories.md (line 232), epics.md
- **Impact:** Story has no traceable parent, may be out of scope
- **Recommended Action:**
  1. Verify if E12 should exist — check [PRD requirements](prd.md)
  2. Either create E12 in [epics.md](epics.md) or correct S5.2 to reference correct epic
  3. Ensure story aligns with initiative scope

---
```

---

#### HIGH Findings (${high_count})

**Should be addressed before phase completion** — These issues may cause confusion or inconsistency.

```markdown
---

**Finding #3**
- **Severity:** HIGH
- **Category:** Semantic Drift
- **Issue:** Term 'compliance' appears with 3 variations
- **Artifacts:** prd.md, architecture.md, epics.md
- **Variations:**
  - "compliance" (product-brief.md: 8 occurrences)
  - "compliance check" (prd.md: 5 occurrences)
  - "compliance-check" (architecture.md: 12 occurrences)
- **Impact:** Inconsistent terminology may confuse readers and reduce searchability
- **Recommended Action:**
  1. Choose canonical term (recommend "compliance-check" for workflow name)
  2. Search and replace across all artifacts
  3. Update product brief glossary if exists

---

**Finding #4**
- **Severity:** HIGH
- **Category:** Constraint Propagation
- **Issue:** Security constraint NFR-2 not addressed in architecture
- **Artifacts:** prd.md (line 178), architecture.md
- **Impact:** Security requirements may not be considered in design
- **Recommended Action:**
  1. Review NFR-2 security requirements in [prd.md](prd.md#L178)
  2. Add corresponding architecture decision (D10+) to [architecture.md](architecture.md)
  3. Ensure epics E3 or E4 address security implementation

---
```

---

#### MEDIUM Findings (${medium_count})

**Address during normal workflow** — These issues improve quality but don't block progress.

```markdown
---

**Finding #5**
- **Severity:** MEDIUM
- **Category:** Coverage Gap
- **Issue:** Epic E2 has no corresponding stories
- **Artifacts:** epics.md (line 95), stories.md
- **Impact:** Epic may be under-specified or deferred
- **Recommended Action:**
  1. Review E2 scope in [epics.md](epics.md#L95)
  2. If in scope for this initiative, decompose E2 into stories in [stories.md](stories.md)
  3. If deferred, move E2 to "Future Work" section or separate initiative

---

**Finding #6**
- **Severity:** MEDIUM
- **Category:** Weak Traceability
- **Issue:** Epic E4 references "compliance workflow" but doesn't specify which requirement
- **Artifact:** epics.md (line 142)
- **Impact:** Implicit link reduces traceability clarity
- **Recommended Action:**
  1. Update E4 description to explicitly state "Satisfies FR-4" or relevant requirement ID
  2. Add cross-reference link to requirement definition

---
```

---

#### LOW Findings (${low_count})

**Optional improvements** — Style or consistency suggestions.

```markdown
---

**Finding #7**
- **Severity:** LOW
- **Category:** Style
- **Issue:** Inconsistent heading levels in architecture.md
- **Artifact:** architecture.md
- **Impact:** Minor readability issue
- **Recommended Action:** Standardize heading hierarchy (## Component, ### Sub-component)

---
```

---

## Presentation Options

**Provide numbered interactive menu:**

```
📊 Cross-Artifact Analysis Results

Findings: ${critical_count} CRITICAL, ${high_count} HIGH, ${medium_count} MEDIUM, ${low_count} LOW

Options:
[1] View CRITICAL findings only
[2] View all findings by severity
[3] View findings by artifact
[4] View findings by category (traceability, semantic, coverage)
[5] Export full report to file
[6] Show coverage metrics only
[7] Re-run analysis (if changes made)
[8] Return to Scribe main menu

Select option:
```

**Response to option selection:**

**[1] CRITICAL only:**
- Display CRITICAL findings section only
- After review, re-prompt with options

**[2] All by severity:**
- Display full report (CRITICAL → HIGH → MEDIUM → LOW)

**[3] By artifact:**
- Group findings by affected artifact
```markdown
### prd.md
- CRITICAL: FR-3 has no epic
- HIGH: Term variation 'compliance'

### epics.md
- HIGH: NFR-2 not addressed
- MEDIUM: E2 has no stories
```

**[4] By category:**
```markdown
### Traceability
- CRITICAL: FR-3 → Epic missing
- MEDIUM: E4 weak reference

### Semantic
- HIGH: Term 'compliance' variations

### Coverage
- MEDIUM: E2 → Stories missing
```

**[5] Export to file:**
```yaml
action: export_report
output_path: "_bmad-output/planning-artifacts/cross-artifact-report-${initiative_id}.md"
format: markdown
include_sections:
  - executive_summary
  - detailed_findings
  - remediation_guidance
  - appendix_metrics

# Generate file and confirm
message: |
  ✅ Report exported to: _bmad-output/planning-artifacts/cross-artifact-report-${initiative_id}.md
  
  You can:
  - Review the report file
  - Share with team
  - Track remediation progress
  
  [R]eturn to menu | [O]pen report file
```

**[6] Metrics only:**
```markdown
## Coverage Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Requirement → Epic | ${requirement_coverage}% | 95% | ${req_status} |
| Epic → Story | ${epic_coverage}% | 100% | ${epic_status} |
| Constraint → Decision | ${constraint_coverage}% | 90% | ${const_status} |

## Inventory

- **Requirements:** ${total_requirements} (FR: ${fr_count}, NFR: ${nfr_count}, C: ${c_count})
- **Epics:** ${total_epics}
- **Stories:** ${total_stories}
- **Decisions:** ${total_decisions}

## Findings Distribution

- **CRITICAL:** ${critical_count}
- **HIGH:** ${high_count}
- **MEDIUM:** ${medium_count}
- **LOW:** ${low_count}
```

---

## Auto-Export Logic

```yaml
# Check custom layer preference
custom_spec = "_bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md"

if file_exists(custom_spec):
  config = load_yaml_block(custom_spec, "report_format")
  auto_export = config.auto_export || false
else:
  auto_export = false

# Auto-export if enabled
if auto_export:
  report_path = "_bmad-output/planning-artifacts/cross-artifact-report-${initiative_id}.md"
  write_report(report_path, full_report_markdown)
  
  notify: |
    📄 Report auto-exported to: ${report_path}
```

---

## Tracey Event

**Event:** `cross-artifact-analyzed`

```yaml
event: cross-artifact-analyzed
timestamp: ${timestamp}
initiative_id: ${initiative_id}
phase: ${phase}
phase_name: ${phase_name}
artifacts_analyzed: ${artifacts_list}
findings:
  total: ${total_findings}
  critical: ${critical_count}
  high: ${high_count}
  medium: ${medium_count}
  low: ${low_count}
coverage:
  requirement_to_epic: ${requirement_coverage}
  epic_to_story: ${epic_coverage}
  constraint_to_decision: ${constraint_coverage}
report_exported: ${report_path || null}
```

**Append to:** `_bmad-output/lens-work/event-log.jsonl`

---

## Success Criteria

- ✅ Executive summary displayed with health indicator
- ✅ Findings categorized by severity with line numbers and remediation
- ✅ Interactive menu for finding exploration
- ✅ Report exported (if auto-export enabled or user-requested)
- ✅ Tracey event logged for audit trail
- ✅ User directed to next action (fix issues or return to Scribe menu)

---

## Next Steps

**If CRITICAL findings exist:**
```
⚠️  CRITICAL issues detected. Recommend addressing before proceeding to next phase.

[1] Review CRITICAL findings
[2] Fix issues and re-run analysis
[3] Proceed anyway (not recommended)
```

**If no CRITICAL findings:**
```
✅ No CRITICAL issues found. Artifacts are ready for next phase.

[1] Review all findings
[2] Export report for team review
[3] Return to Scribe menu
```
