# Step: Run Analysis

**Purpose:** Execute traceability and semantic coherence validation across loaded artifacts.

---

## Analysis Dimensions

### 1. Traceability Validation

#### Forward Tracing Chains

**Chain 1: Requirements → Epics**
```yaml
# Extract requirements from prd.md
prd_requirements = extract_ids(prd_content, pattern: /^(FR|NFR|C)-\d+/)
# Example: [FR-1, FR-2, FR-3, NFR-1, NFR-2]

# Extract epic mappings from epics.md
epic_mappings = extract_mappings(epics_content, pattern: /E\d+.*(?:satisfies|implements|addresses)\s+(FR|NFR|C)-\d+/)
# Example: {E1: [FR-1, FR-2], E2: [FR-3]}

# Validate coverage
for requirement in prd_requirements:
  mapped_epics = find_epics_for_requirement(epic_mappings, requirement)
  
  if mapped_epics.empty:
    log_finding(
      severity: CRITICAL,
      category: "traceability-gap",
      message: "Requirement ${requirement} has no corresponding epic",
      artifact: "prd.md",
      remediation: "Review ${requirement} and create new epic or map to existing epic in epics.md"
    )
```

**Chain 2: Epics → Stories**
```yaml
# Extract epics from epics.md
epics = extract_ids(epics_content, pattern: /E\d+(\.\d+)?/)

# Extract story parent references from stories.md
story_mappings = extract_mappings(stories_content, pattern: /S\d+\.\d+.*(?:implements|addresses)\s+E\d+/)
# Example: {S1.1: E1, S1.2: E1, S2.1: E2}

# Validate decomposition
for epic in epics:
  stories = find_stories_for_epic(story_mappings, epic)
  
  if stories.empty:
    log_finding(
      severity: MEDIUM,
      category: "coverage-gap",
      message: "Epic ${epic} has no corresponding stories",
      artifact: "epics.md",
      remediation: "Decompose ${epic} into implementation stories in stories.md"
    )
```

**Chain 3: Constraints → Architecture**
```yaml
# Extract NFRs and constraints from prd.md
constraints = extract_ids(prd_content, pattern: /^(NFR|C)-\d+/)

# Extract architecture decisions that reference constraints
decision_mappings = extract_mappings(architecture_content, pattern: /D\d+.*(?:satisfies|addresses)\s+(NFR|C)-\d+/)

# Validate constraint propagation
for constraint in constraints:
  decisions = find_decisions_for_constraint(decision_mappings, constraint)
  
  if decisions.empty:
    log_finding(
      severity: HIGH,
      category: "constraint-drift",
      message: "Constraint ${constraint} not addressed in architecture decisions",
      artifact: "architecture.md",
      remediation: "Add architecture decision or rationale for ${constraint}"
    )
```

---

#### Backward Tracing (Orphan Detection)

**Detect Orphaned Stories:**
```yaml
# Stories that don't reference any epic
for story in all_stories:
  parent_epic = extract_parent_epic(story)
  
  if parent_epic == null:
    log_finding(
      severity: MEDIUM,
      category: "orphaned-story",
      message: "Story ${story.id} does not reference parent epic",
      artifact: "stories.md",
      remediation: "Add explicit 'Implements Epic EX' reference to story ${story.id}"
    )
  elif parent_epic not in epics:
    log_finding(
      severity: HIGH,
      category: "broken-reference",
      message: "Story ${story.id} references non-existent epic ${parent_epic}",
      artifacts: ["stories.md", "epics.md"],
      remediation: "Create epic ${parent_epic} or correct story reference"
    )
```

---

### 2. Semantic Coherence

#### Extract Domain Terms
```yaml
# Extract key terms from product brief (goals, problem statement)
domain_terms = extract_terms(product_brief_content, sections: ["Problem", "Vision", "Goals"])
# Example: ["constitution", "compliance", "inheritance chain", "governance"]

# Build term usage map across artifacts
term_usage:
  constitution:
    product-brief.md: 15 occurrences
    prd.md: 22 occurrences (also "Constitution" capitalized)
    architecture.md: 18 occurrences
  compliance:
    product-brief.md: 8 occurrences
    prd.md: 12 occurrences (also "compliance check", "compliance-check")
    architecture.md: 5 occurrences
```

#### Detect Term Variations
```yaml
# Identify inconsistent term usage
for term in domain_terms:
  variations = find_term_variations(term, all_artifacts)
  
  if variations.count > 1:
    log_finding(
      severity: HIGH,
      category: "semantic-drift",
      message: "Term '${term}' has inconsistent variations: ${variations.list}",
      artifacts: variations.artifacts,
      remediation: "Standardize on canonical term '${term}' across all artifacts"
    )
```

**Example Finding:**
```yaml
severity: HIGH
category: semantic-drift
message: "Term 'compliance' appears as 'compliance', 'compliance check', and 'compliance-check'"
artifacts: [prd.md, architecture.md, epics.md]
variations:
  - "compliance" (product-brief.md: 8)
  - "compliance check" (prd.md: 5)
  - "compliance-check" (architecture.md: 12)
remediation: "Choose canonical form (recommend 'compliance-check') and update all references"
```

---

#### Constraint Propagation Check
```yaml
# Security constraints must appear in architecture AND epics
security_keywords = ["security", "authentication", "authorization", "encryption"]

for keyword in security_keywords:
  prd_occurrences = count_occurrences(prd_content, keyword)
  
  if prd_occurrences > 0:
    # Verify keyword appears in downstream artifacts
    arch_occurrences = count_occurrences(architecture_content, keyword)
    epic_occurrences = count_occurrences(epics_content, keyword)
    
    if arch_occurrences == 0 or epic_occurrences == 0:
      log_finding(
        severity: HIGH,
        category: "constraint-propagation",
        message: "Security term '${keyword}' in PRD not addressed in ${missing_artifacts}",
        artifacts: determine_missing([prd.md, architecture.md, epics.md]),
        remediation: "Add explicit security considerations to architecture and epics"
      )
```

---

### 3. Coverage Analysis

#### Calculate Coverage Metrics
```yaml
# Requirement→Epic coverage
total_requirements = prd_requirements.count
covered_requirements = requirements_with_epic_mapping.count
requirement_coverage = (covered_requirements / total_requirements) * 100

# Epic→Story coverage
total_epics = epics.count
decomposed_epics = epics_with_stories.count
epic_coverage = (decomposed_epics / total_epics) * 100

# Constraint→Decision coverage
total_constraints = constraints.count
addressed_constraints = constraints_with_decisions.count
constraint_coverage = (addressed_constraints / total_constraints) * 100
```

#### Apply Thresholds
```yaml
# Default thresholds (overridable via custom layer)
thresholds:
  requirement_to_epic: 95%
  epic_to_story: 100%
  constraint_to_decision: 90%

# Check against thresholds
if requirement_coverage < thresholds.requirement_to_epic:
  log_finding(
    severity: HIGH,
    category: "coverage",
    message: "Requirement→Epic coverage is ${requirement_coverage}% (target: ${thresholds.requirement_to_epic}%)",
    metric: requirement_coverage,
    remediation: "Review unmapped requirements and create corresponding epics"
  )
```

---

### 4. Custom Rules (Optional)

```yaml
# Load custom traceability rules from custom layer spec
custom_spec = "_bmad/_config/custom/workflows/governance/cross-artifact-analysis.spec.md"

if file_exists(custom_spec):
  custom_rules = load_yaml_block(custom_spec, "traceability_rules")
  
  for rule in custom_rules:
    # Example rule:
    # - pattern: "FR-\\d+"
    #   must_appear_in: [epics.md]
    #   severity_if_missing: CRITICAL
    
    ids = extract_ids(prd_content, pattern: rule.pattern)
    
    for id in ids:
      for required_artifact in rule.must_appear_in:
        if not id_appears_in(id, required_artifact):
          log_finding(
            severity: rule.severity_if_missing,
            category: "custom-rule-violation",
            message: "${id} does not appear in ${required_artifact} (custom rule)",
            remediation: rule.remediation || "Add ${id} reference to ${required_artifact}"
          )
```

---

## Validation Patterns (Regex)

```yaml
patterns:
  requirements:    /^(FR|NFR|C)-\d+/
  epics:           /E\d+(\.\d+)?/
  stories:         /S\d+\.\d+/
  decisions:       /D\d+/
  
  # Traceability links
  satisfies:       /(?:satisfies|implements|addresses)\s+(FR|NFR|C|E)-\d+/
  references:      /(?:see|ref|reference)\s+\[([^\]]+)\]\([^\)]+\)/
```

---

## Output

```yaml
analysis_results:
  traceability:
    requirement_to_epic_coverage: 85%
    epic_to_story_coverage: 90%
    constraint_to_decision_coverage: 100%
    
  findings:
    - severity: CRITICAL
      category: traceability-gap
      message: "FR-3 has no corresponding epic"
      artifact: prd.md
      
    - severity: HIGH
      category: semantic-drift
      message: "Term 'compliance' has 3 variations"
      artifacts: [prd.md, architecture.md]
      
    - severity: MEDIUM
      category: coverage-gap
      message: "Epic E2 has no stories"
      artifact: epics.md
      
  metrics:
    total_requirements: 11
    total_epics: 10
    total_stories: 33
    total_findings: 8
    critical: 1
    high: 3
    medium: 4
    low: 0
```

---

## Next Step

→ Proceed to `present-findings.md` with analysis results
