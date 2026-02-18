---
name: cross-artifact-analysis
description: Validates semantic coherence and traceability across planning artifacts
agent: scribe
trigger: /analyze or AZ menu option
category: governance
---

# Cross-Artifact Analysis Workflow

**Purpose:** Ensures requirements, design decisions, and implementation artifacts maintain semantic coherence and explicit traceability throughout the planning lifecycle.

---

## Workflow Steps

### 1. Detect Scope

**File:** `steps/detect-scope.md`

**Objective:** Determine which artifacts to analyze based on current phase and initiative state.

**Logic:**
- Read state.yaml to extract `current_phase` and `active_initiative`
- Map phase to allowlisted artifacts:
  - **P1 (Analysis)**: product-brief.md
  - **P2 (Planning)**: product-brief.md, prd.md
  - **P3 (Solutioning)**: product-brief.md, prd.md, architecture.md, epics.md
  - **P4 (Implementation)**: All above + stories.md
- Validate artifact existence in `_bmad-output/planning-artifacts/`
- Set analysis scope for loading step

**Output:**
```yaml
scope:
  phase: P3-Solutioning
  artifacts:
    - product-brief.md
    - prd.md
    - architecture.md
    - epics.md
  initiative: enhanced-constitutio-93d670
```

---

### 2. Load Artifacts

**Objective:** Read and parse allowlisted artifacts for the current phase.

**Logic:**
- For each artifact in scope:
  - Read file from `_bmad-output/planning-artifacts/{artifact}`
  - Parse structure:
    - Extract headings (## Goal, ## Requirements, etc.)
    - Extract IDs: FR-\d+, NFR-\d+, C-\d+ (requirements), E\d+ (epics), S\d+\.\d+ (stories)
    - Extract constraint blocks, decision blocks
  - Build artifact metadata map

**Output:**
```yaml
loaded_artifacts:
  product-brief.md:
    goals: ["Enhance constitution framework", "Integrate spec-kit concepts"]
    constraints: ["No runtime impact", "Backward compatibility"]
  prd.md:
    requirements: [FR-1, FR-2, FR-3, NFR-1, NFR-2]
    terms: ["constitution", "compliance-check", "inheritance chain"]
  architecture.md:
    components: ["Path Resolver", "Context Loader"]
    decisions: [D1, D2, D3]
  epics.md:
    epics: [E1, E2, E3]
    maps_to: {E1: [FR-1, FR-2], E2: [FR-3, FR-4]}
```

---

### 3. Run Analysis

**File:** `steps/run-analysis.md`

**Objective:** Execute traceability and semantic coherence validation across loaded artifacts.

**Analysis Dimensions:**

#### 3a. Traceability Validation

**Forward Tracing:**
- PRD requirements (FR-*, NFR-*) → Epics (E\d+)
- Epics (E\d+) → Stories (S\d+\.\d+)
- Constraints (C-\d+) → Architecture decisions (D\d+)

**Backward Tracing:**
- Stories → Epics (each story references parent epic)
- Epics → PRD (each epic satisfies at least one requirement)
- Architecture decisions → PRD (decisions trace to requirements/constraints)

**Validation Patterns:**
```regex
PRD Requirements: /^(FR|NFR|C)-\d+/
Epic References: /E\d+(\.\d+)?/
Story References: /S\d+\.\d+/
Architecture Decisions: /D\d+/
```

#### 3b. Semantic Coherence

**Term Consistency:**
- Extract domain terms from product brief
- Check consistent usage across PRD, architecture, epics
- Flag variations: "authentication" vs "auth" vs "login"

**Constraint Propagation:**
- Security constraints in PRD must appear in architecture AND relevant epics
- Performance constraints must have measurable acceptance criteria in stories

#### 3c. Coverage Analysis

- % requirements with epic coverage
- % epics with story decomposition
- Orphaned requirements (no epic mapping)
- Orphaned epics (no stories)

**Output:**
```yaml
findings:
  - severity: CRITICAL
    category: traceability
    message: "FR-3 in PRD has no corresponding epic"
    artifact: prd.md
    location: "line 145"
    
  - severity: HIGH
    category: semantic
    message: "Term 'user session' used in PRD but 'session management' in architecture"
    artifacts: [prd.md, architecture.md]
    
  - severity: MEDIUM
    category: coverage
    message: "Epic E2 has no stories in stories.md"
    artifacts: [epics.md, stories.md]
```

---

### 4. Present Findings

**File:** `steps/present-findings.md`

**Objective:** Generate actionable report with prioritized findings and remediation guidance.

**Report Structure:**

#### Executive Summary
```markdown
## Cross-Artifact Analysis Report
**Initiative**: enhanced-constitutio-93d670
**Phase**: P3-Solutioning
**Artifacts Analyzed**: 4 files
**Findings**: 2 CRITICAL, 5 HIGH, 3 MEDIUM, 0 LOW

**Overall Health**: 🟡 Needs Attention
- Traceability: 85% coverage (target: 95%)
- Semantic coherence: 3 term inconsistencies detected
```

#### Critical Findings (require immediate action)
- List orphaned requirements
- List broken traceability chains
- Provide specific file locations and line numbers

#### Remediation Guidance
For each finding:
```markdown
**Finding**: FR-3 has no corresponding epic
**Impact**: Requirement may be lost during implementation
**Recommended Action**: 
1. Review FR-3 in prd.md (line 145)
2. Determine if new epic needed or should merge with existing epic
3. Update epics.md to include explicit "Satisfies FR-3" statement
```

**Presentation Options:**
```
[1] View CRITICAL findings only
[2] View all findings by severity
[3] View findings by artifact
[4] Export report to file
[5] Return to Scribe main menu
```

**Auto-export:** Save report to `_bmad-output/planning-artifacts/cross-artifact-report-{initiative-id}.md`

---

## Tracey Integration

**Event:** `cross-artifact-analyzed`

**Payload:**
```yaml
event: cross-artifact-analyzed
initiative: enhanced-constitutio-93d670
phase: P3
findings_count: 10
critical: 2
high: 5
medium: 3
low: 0
```

---

## Custom Layer Support

Teams can customize traceability rules, severity thresholds, and term dictionaries via:
`_bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md`

See custom layer spec (S6.5) for configuration options.

---

## Success Criteria

- ✅ All artifacts loaded successfully
- ✅ Traceability chains validated (forward + backward)
- ✅ Semantic coherence checked
- ✅ Findings presented with actionable remediation
- ✅ Report exported and Tracey event logged
