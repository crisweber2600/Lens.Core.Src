# Custom Layer Specification: Cross-Artifact Analysis

**Purpose:** Allows teams to customize traceability rules, severity thresholds, and term dictionaries without modifying source workflow.

**Location:** Copy this file to `_bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md` and customize as needed.

---

## Overview

The cross-artifact-analysis workflow supports team-specific customization through the custom layer pattern. This spec defines the available customization points and their configuration syntax.

---

## Customizable Parameters

### 1. Artifact Mapping Override

**Purpose:** Add custom artifacts to phase analysis or override default mapping.

**Configuration:**
```yaml
# custom_artifact_map
custom_artifact_map:
  p2:  # Planning phase
    - product-brief.md
    - prd.md
    - technical-constraints.md  # Custom artifact
    
  p3:  # Solutioning phase
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
    - security-analysis.md  # Custom artifact
```

**Usage:** Custom artifacts are merged with defaults. Use this to include team-specific planning documents.

---

### 2. Traceability Rules

**Purpose:** Define custom patterns and validation rules for your initiative types.

**Configuration:**
```yaml
# traceability_rules
traceability_rules:
  - pattern: "FR-\\d+"
    must_appear_in: [epics.md]
    severity_if_missing: CRITICAL
    remediation: "Map requirement to epic with 'Satisfies FR-X' statement"
    
  - pattern: "NFR-\\d+"
    must_appear_in: [architecture.md, epics.md]
    severity_if_missing: HIGH
    remediation: "Add architecture decision and implementation epic for NFR"
    
  - pattern: "SEC-\\d+"  # Custom security requirement pattern
    must_appear_in: [architecture.md, security-analysis.md]
    severity_if_missing: CRITICAL
    remediation: "Security requirements must have explicit architecture decisions"
```

**Parameters:**
- `pattern`: Regex pattern for ID extraction
- `must_appear_in`: List of artifacts that must reference this ID
- `severity_if_missing`: CRITICAL | HIGH | MEDIUM | LOW
- `remediation`: (Optional) Custom remediation guidance

---

### 3. Term Dictionary

**Purpose:** Define canonical terms and acceptable synonyms to detect semantic drift.

**Configuration:**
```yaml
# term_dictionary
term_dictionary:
  - canonical: "user authentication"
    synonyms: ["auth", "login", "sign-in"]
    flag_if_not_canonical: true
    severity: MEDIUM
    
  - canonical: "compliance-check"
    synonyms: ["compliance", "compliance check"]
    flag_if_not_canonical: true
    severity: HIGH
    
  - canonical: "constitution"
    synonyms: [] # No acceptable synonyms
    flag_if_not_canonical: true
    severity: HIGH
```

**Parameters:**
- `canonical`: The preferred term to use consistently
- `synonyms`: List of acceptable alternatives (will still flag if found)
- `flag_if_not_canonical`: true to generate findings for synonym usage
- `severity`: Severity level for term variation findings

**Usage:** The workflow checks for canonical term usage and flags variations for consistency.

---

### 4. Coverage Thresholds

**Purpose:** Customize acceptable coverage percentages for your team's quality standards.

**Configuration:**
```yaml
# thresholds
thresholds:
  requirement_to_epic_coverage: 95%  # Default: 90%
  epic_to_story_coverage: 100%       # Default: 95%
  constraint_to_decision_coverage: 100%  # Default: 90%
```

**Usage:** Workflow compares actual coverage against these thresholds and logs HIGH findings if below target.

---

### 5. Report Format

**Purpose:** Customize report generation and presentation behavior.

**Configuration:**
```yaml
# report_format
report_format:
  include_line_numbers: true         # Default: true
  group_by: severity                 # Options: severity | artifact | category
  auto_export: true                  # Default: false
  export_path: "_bmad-output/planning-artifacts/reports/"  # Custom export directory
  include_remediation: true          # Default: true
  include_metrics: true              # Default: true
```

**Parameters:**
- `include_line_numbers`: Show artifact line numbers in findings
- `group_by`: Primary grouping for findings presentation
- `auto_export`: Automatically export report without prompting
- `export_path`: Custom directory for exported reports
- `include_remediation`: Include "Recommended Action" sections
- `include_metrics`: Include coverage metrics in report

---

### 6. Custom Categories

**Purpose:** Define team-specific finding categories beyond default (traceability, semantic, coverage).

**Configuration:**
```yaml
# custom_categories
custom_categories:
  - name: security-compliance
    description: "Security requirements and architecture alignment"
    severity_default: HIGH
    
  - name: performance-validation
    description: "Performance constraints and measurable criteria"
    severity_default: MEDIUM
```

**Usage:** Custom categories appear in findings reports alongside default categories.

---

## Example: Full Custom Spec

```yaml
# Custom Layer Spec: Cross-Artifact Analysis
# Location: _bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md

# Custom artifacts for Planning phase
custom_artifact_map:
  p2:
    - product-brief.md
    - prd.md
    - security-requirements.md

# Team-specific traceability rules
traceability_rules:
  - pattern: "FR-\\d+"
    must_appear_in: [epics.md]
    severity_if_missing: CRITICAL
    
  - pattern: "SEC-\\d+"
    must_appear_in: [security-requirements.md, architecture.md]
    severity_if_missing: CRITICAL

# Domain term dictionary
term_dictionary:
  - canonical: "compliance-check"
    synonyms: ["compliance", "compliance check"]
    flag_if_not_canonical: true
    severity: HIGH

# Stricter thresholds for enterprise projects
thresholds:
  requirement_to_epic_coverage: 100%
  epic_to_story_coverage: 100%
  constraint_to_decision_coverage: 100%

# Report customization
report_format:
  group_by: artifact
  auto_export: true
  export_path: "_bmad-output/planning-artifacts/qa-reports/"
```

---

## Installation Instructions

1. **Copy this spec to custom layer:**
   ```bash
   cp src/modules/lens-work/workflows/governance/cross-artifact-analysis/cross-artifact-analysis.spec.md \
      _bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md
   ```

2. **Edit the custom spec** to match your team's needs

3. **Re-run cross-artifact analysis** — changes take effect immediately

---

## Validation

The workflow validates custom specs on load:
- **YAML syntax**: Ensures valid YAML structure
- **Pattern validity**: Tests regex patterns for syntax errors
- **Threshold ranges**: Validates percentages are 0-100
- **Path existence**: Checks custom artifact paths

Invalid config falls back to defaults with warning logged.

---

## Precedence Rules

**Custom layer overrides source:**
1. Thresholds: Custom values replace defaults
2. Traceability rules: Custom rules ADD to defaults (union)
3. Term dictionary: Custom terms ADD to defaults
4. Report format: Custom settings replace defaults
5. Artifact map: Custom artifacts MERGE with defaults (union)

**Example:** If source defines FR-* rule and custom defines SEC-* rule, both rules are active.

---

## Related Files

- **Source workflow:** `src/modules/lens-work/workflows/governance/cross-artifact-analysis/workflow.md`
- **Custom layer docs:** `_bmad/_config/custom/README.md`
- **Custom layer sync:** Handled by S10.5 (Custom Layer Sync story)

---

## Support

For questions about custom layer configuration, see:
- [Custom Layer Guide](../../../../docs/custom-layer-guide.md)
- [BMAD.Lens Custom Layer README](../../../../_bmad/_config/custom/README.md)
