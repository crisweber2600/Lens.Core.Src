---
name: 'step-02-analyze'
description: 'Categorize issues, identify patterns, and perform root cause analysis'
nextStepFile: './step-03-report.md'
---

# Step 2: Analyze And Categorize

**Goal:** Group all evidence into categories, identify recurring patterns, determine root causes, and score initiative health.

---

## EXECUTION SEQUENCE

### 1. Categorize All Findings

```yaml
# Merge all evidence sources into unified findings
all_findings = merge_evidence(
  session.problems,
  session.gate_results,
  session.review_outcomes,
  session.user_observations
)

# Categorize by type
categories:
  process:      # Workflow, lifecycle, or ceremony issues
  tooling:      # Tool failures, IDE issues, agent limitations
  planning:     # Estimation, scope, requirements issues
  communication: # Stakeholder, team, or handoff issues
  technical:    # Code quality, architecture, or tech debt
  governance:   # Constitution, gates, or approval friction

categorized_findings = categorize(all_findings, categories)
```

### 2. Identify Patterns

```yaml
# Look for recurring themes across categories
patterns = []

# Same issue across multiple phases?
cross_phase_patterns = find_cross_phase_issues(categorized_findings, session.phase_transitions)

# Repeated blockages at specific gates?
gate_friction_patterns = find_gate_friction(session.gate_results)

# Escalating severity over time?
severity_trends = analyze_severity_timeline(session.problems)

patterns = [cross_phase_patterns, gate_friction_patterns, severity_trends].flatten()
```

### 3. Root Cause Analysis

For each pattern with 2+ occurrences, apply 5-Whys analysis:

```
For each pattern in patterns:
  - What happened? (symptom)
  - Why did it happen? (immediate cause)
  - Why did that happen? (contributing factor)
  - What is the systemic root cause?
  - What action would prevent recurrence?
```

```yaml
root_causes = perform_root_cause_analysis(patterns)
```

### 4. Score Initiative Health

```yaml
health_score:
  lifecycle_adherence:  # Did the initiative follow its track phases properly?
  gate_pass_rate:       # What percentage of gates passed on first attempt?
  problem_severity_distribution: # Ratio of blockers vs warnings vs notes
  velocity_trend:       # Were later phases faster or slower?
  overall:              # Weighted composite score (A-F)

session.categorized_findings = categorized_findings
session.patterns = patterns
session.root_causes = root_causes
session.health_score = health_score
```

### 5. Present Analysis Summary

```
📊 Analysis Complete
━━━━━━━━━━━━━━━━━━━
Total findings:      ${all_findings.length}
Patterns identified: ${patterns.length}
Root causes:         ${root_causes.length}
Health score:        ${health_score.overall}

Category Breakdown:
  Process:        ${categorized_findings.process.length}
  Tooling:        ${categorized_findings.tooling.length}
  Planning:       ${categorized_findings.planning.length}
  Communication:  ${categorized_findings.communication.length}
  Technical:      ${categorized_findings.technical.length}
  Governance:     ${categorized_findings.governance.length}
```

---

## NEXT STEP DIRECTIVE

After analysis is complete, proceed to: `{nextStepFile}`
