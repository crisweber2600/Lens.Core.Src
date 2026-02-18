---
name: artifact-validator
description: Artifact validation schemas, rules, and integration patterns for lens-work phase gates
type: include
---

# Artifact Validator Reference

This document defines validation schemas for all artifact types, validation rules, and how router workflows integrate validation before allowing phase progression.

---

## Overview

The artifact validator runs at phase transitions to ensure all required artifacts exist, contain required sections, and are non-empty. It is invoked automatically by router workflows (Compass) and can be run manually via `status` workflow.

---

## Validation Output Format

All validation results use this standard output format:

```
📋 Artifact Validation: {phase_name} (P{N})
├── ✅ {filename} — {pass_message}
├── ⚠️ {filename} — {warning_message}
├── ❌ {filename} — {error_message}
└── Result: {PASSED | PASSED_WITH_WARNINGS | BLOCKED} ({pass_count} passed, {warn_count} warnings, {fail_count} failed)
```

### Result Statuses

| Result | Meaning | Gate Effect |
|--------|---------|-------------|
| `PASSED` | All required artifacts present and complete | Gate passes |
| `PASSED_WITH_WARNINGS` | All required present, some optional missing or incomplete | Gate passes with advisory |
| `BLOCKED` | One or more required artifacts missing or invalid | Gate blocks |

---

## Required Artifacts Per Phase

### P1 — Analysis

```yaml
phase: p1
phase_name: Analysis
artifacts:
  - path: "_bmad-output/planning-artifacts/{id}/p1-product-brief.md"
    required: true
    sections:
      - "Problem Statement"
      - "Target Users"
      - "Proposed Solution"
      - "Success Metrics"
    min_length: 500  # characters

  - path: "_bmad-output/planning-artifacts/{id}/p1-research-notes.md"
    required: false
    sections:
      - "Competitors"
      - "Market Analysis"
    min_length: 200

  - path: "_bmad-output/planning-artifacts/{id}/p1-brainstorm-notes.md"
    required: false
    sections: []
    min_length: 100
```

### P2 — Planning

```yaml
phase: p2
phase_name: Planning
artifacts:
  - path: "_bmad-output/planning-artifacts/{id}/p2-prd.md"
    required: true
    sections:
      - "Overview"
      - "Requirements"
      - "User Stories"
      - "Non-Functional Requirements"
      - "Constraints"
    min_length: 1000

  - path: "_bmad-output/planning-artifacts/{id}/p2-ux-design.md"
    required: false
    sections:
      - "User Flows"
      - "Wireframes"
      - "Accessibility"
    min_length: 500

  - path: "_bmad-output/planning-artifacts/{id}/p2-architecture.md"
    required: true
    sections:
      - "System Overview"
      - "Component Architecture"
      - "Data Model"
      - "API Design"
      - "Technology Stack"
      - "Security Considerations"
    min_length: 1500
```

### P3 — Solutioning

```yaml
phase: p3
phase_name: Solutioning
artifacts:
  - path: "_bmad-output/planning-artifacts/{id}/p3-epics.md"
    required: true
    sections:
      - "Epic List"
    min_length: 300

  - path: "_bmad-output/planning-artifacts/{id}/p3-stories/"
    required: true
    type: directory
    min_files: 1
    file_pattern: "story-*.md"
    per_file_sections:
      - "Description"
      - "Acceptance Criteria"

  - path: "_bmad-output/planning-artifacts/{id}/p3-readiness-checklist.md"
    required: true
    sections:
      - "Architecture Review"
      - "Story Completeness"
      - "Risk Assessment"
    min_length: 300

  - path: "_bmad-output/planning-artifacts/{id}/stories.csv"
    required: false
    type: csv
    required_columns:
      - "id"
      - "title"
      - "epic"
      - "status"
    min_rows: 1

  - path: "_bmad-output/planning-artifacts/{id}/epics.csv"
    required: false
    type: csv
    required_columns:
      - "id"
      - "title"
      - "status"
    min_rows: 1
```

### P4 — Implementation

```yaml
phase: p4
phase_name: Implementation
artifacts:
  - path: "_bmad-output/implementation-artifacts/{id}/p4-sprint-plan.md"
    required: false
    sections:
      - "Sprint Goals"
      - "Story Assignments"
    min_length: 200

  - path: "_bmad-output/implementation-artifacts/{id}/p4-dev-stories/"
    required: true
    type: directory
    min_files: 1
    file_pattern: "dev-story-*.md"
    per_file_sections:
      - "Implementation Plan"
      - "Definition of Done"

  - path: "_bmad-output/implementation-artifacts/{id}/p4-review-notes.md"
    required: false
    sections:
      - "Review Summary"
    min_length: 100

  - path: "_bmad-output/implementation-artifacts/{id}/p4-retro.md"
    required: false
    sections:
      - "What Went Well"
      - "What Could Improve"
      - "Action Items"
    min_length: 200
```

---

## Validation Rules

### File Existence Check

```bash
validate_file_exists() {
  local filepath="$1"
  local required="$2"

  if [ -f "$filepath" ]; then
    echo "✅ $(basename $filepath) — file exists"
    return 0
  elif [ "$required" = "true" ]; then
    echo "❌ $(basename $filepath) — file not found"
    return 1
  else
    echo "⚠️ $(basename $filepath) — optional file not found"
    return 2  # warning
  fi
}
```

### Section Presence Check

```bash
validate_sections() {
  local filepath="$1"
  shift
  local sections=("$@")
  local missing=()

  for section in "${sections[@]}"; do
    if ! grep -qi "^#.*${section}" "$filepath"; then
      missing+=("$section")
    fi
  done

  if [ ${#missing[@]} -eq 0 ]; then
    echo "✅ $(basename $filepath) — all required sections present"
    return 0
  else
    echo "⚠️ $(basename $filepath) — missing sections: ${missing[*]}"
    return 2
  fi
}
```

### Content Length Check

```bash
validate_length() {
  local filepath="$1"
  local min_length="$2"

  char_count=$(wc -c < "$filepath")
  if [ "$char_count" -ge "$min_length" ]; then
    echo "✅ $(basename $filepath) — content length OK (${char_count} chars)"
    return 0
  else
    echo "⚠️ $(basename $filepath) — content too short (${char_count}/${min_length} chars)"
    return 2
  fi
}
```

### Directory Check

```bash
validate_directory() {
  local dirpath="$1"
  local min_files="$2"
  local pattern="$3"

  if [ ! -d "$dirpath" ]; then
    echo "❌ $(basename $dirpath)/ — directory not found"
    return 1
  fi

  file_count=$(find "$dirpath" -name "$pattern" -type f | wc -l)
  if [ "$file_count" -ge "$min_files" ]; then
    echo "✅ $(basename $dirpath)/ — ${file_count} files found"
    return 0
  else
    echo "❌ $(basename $dirpath)/ — too few files (${file_count}/${min_files} required)"
    return 1
  fi
}
```

### CSV Validation

```bash
validate_csv() {
  local filepath="$1"
  shift
  local required_columns=("$@")

  if [ ! -f "$filepath" ]; then
    echo "⚠️ $(basename $filepath) — CSV not found"
    return 2
  fi

  header=$(head -1 "$filepath")
  missing=()
  for col in "${required_columns[@]}"; do
    if ! echo "$header" | grep -qi "$col"; then
      missing+=("$col")
    fi
  done

  if [ ${#missing[@]} -eq 0 ]; then
    row_count=$(tail -n +2 "$filepath" | wc -l)
    echo "✅ $(basename $filepath) — valid CSV (${row_count} rows)"
    return 0
  else
    echo "⚠️ $(basename $filepath) — missing columns: ${missing[*]}"
    return 2
  fi
}
```

---

## Workflow Integration

### Router Invocation Pattern

Router workflows (Compass) call the validator before allowing phase progression:

```yaml
# Example: /spec router checking P1 artifacts before allowing P2
validate_phase_artifacts:
  phase: p1
  initiative_id: ${initiative.id}
  artifact_path: "_bmad-output/planning-artifacts/${initiative.id}"

  result = run_validation(phase="p1", initiative_id=${initiative.id})

  if result.status == "BLOCKED":
    output: |
      ❌ Phase gate blocked — missing required artifacts
      ${result.output}
      
      Action: Complete the missing artifacts before proceeding.
    exit: 1

  if result.status == "PASSED_WITH_WARNINGS":
    output: |
      ⚠️ Phase gate passed with warnings
      ${result.output}
      
      Proceeding to P2 — consider addressing warnings.
```

### Full Validation Run

```yaml
# Run all checks for a phase
run_validation:
  params:
    phase: string
    initiative_id: string

  steps:
    1. Load artifact schema for ${phase}
    2. For each artifact in schema:
       a. Check file/directory existence
       b. If file exists and has required sections, check sections
       c. If file exists and has min_length, check length
       d. If CSV, validate columns
    3. Aggregate results:
       - If any required artifact failed → BLOCKED
       - If any optional artifact warned → PASSED_WITH_WARNINGS
       - Otherwise → PASSED
    4. Log gate-check event to event-log.jsonl
    5. Return result with output string
```

### Status Workflow Integration

The `status` workflow can run validation on-demand without blocking:

```yaml
# From status workflow
invoke: validate_phase_artifacts
params:
  phase: ${current.phase}
  initiative_id: ${initiative.id}
  mode: "report"  # report mode = no blocking, just output

output: |
  📋 Current Phase Artifact Status
  ${validation_output}
```

---

## Validation Examples

### P1 — All Passed

```
📋 Artifact Validation: Analysis (P1)
├── ✅ p1-product-brief.md — all required sections present
├── ✅ p1-research-notes.md — all required sections present
├── ✅ p1-brainstorm-notes.md — file exists
└── Result: PASSED (3 passed, 0 warnings, 0 failed)
```

### P2 — Passed with Warnings

```
📋 Artifact Validation: Planning (P2)
├── ✅ p2-prd.md — all required sections present
├── ⚠️ p2-ux-design.md — missing sections: Accessibility
├── ✅ p2-architecture.md — all required sections present
└── Result: PASSED_WITH_WARNINGS (2 passed, 1 warning, 0 failed)
```

### P3 — Blocked

```
📋 Artifact Validation: Solutioning (P3)
├── ✅ p3-epics.md — all required sections present
├── ❌ p3-stories/ — directory not found
├── ⚠️ p3-readiness-checklist.md — content too short (120/300 chars)
├── ⚠️ stories.csv — CSV not found
└── Result: BLOCKED (1 passed, 2 warnings, 1 failed)
```

### P4 — Partial

```
📋 Artifact Validation: Implementation (P4)
├── ⚠️ p4-sprint-plan.md — optional file not found
├── ✅ p4-dev-stories/ — 3 files found
├── ⚠️ p4-review-notes.md — optional file not found
├── ⚠️ p4-retro.md — optional file not found
└── Result: PASSED_WITH_WARNINGS (1 passed, 3 warnings, 0 failed)
```

---

---

## Path-Aware Validation

When validating artifact existence, check the docs_path first, then fall back to legacy path:

```pseudocode
function validate_artifact(artifact_name, docs_path):
  primary = "${docs_path}/${artifact_name}"
  legacy = "_bmad-output/planning-artifacts/${artifact_name}"
  
  if file_exists(primary):
    return { path: primary, status: "OK" }
  elif file_exists(legacy):
    emit_warning("⚠️ Artifact found at legacy path. Run migration: /compass migrate")
    return { path: legacy, status: "LEGACY" }
  else:
    return { path: null, status: "MISSING" }
```

### Path Resolution Order

1. **Primary**: `${docs_path}/${artifact_name}` — Initiative-specific docs path (new)
2. **Fallback**: `_bmad-output/planning-artifacts/${artifact_name}` — Legacy flat path (deprecated)
3. **Missing**: Artifact not found at either location

### Deprecation Behavior

When an artifact is found ONLY at the legacy path:
- Validation still **passes** (artifact exists)
- A **deprecation warning** is emitted in the validation output
- The warning includes the migration command: `/compass migrate`
- The validation result includes `status: "LEGACY"` for programmatic detection

## Required Planning Artifacts

| Artifact | Required By Phase |
|----------|------------------|
| product-brief.md | spec, plan, review |
| prd.md | plan, review |
| architecture.md | plan, review |
| epics.md | review |
| stories.md | review |
| readiness-checklist.md | review |

---

## Related Includes

- **docs-path.md** — Canonical paths that validators check
- **gate-event-template.md** — Gate events logged by validation results
- **jira-integration.md** — CSV formats validated by CSV checker
