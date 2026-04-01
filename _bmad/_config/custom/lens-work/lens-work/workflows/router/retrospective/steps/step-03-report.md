---
name: 'step-03-report'
description: 'Generate the retrospective report with structured findings and lessons learned'
nextStepFile: './step-04-actions.md'
---

# Step 3: Generate Retrospective Report

**Goal:** Produce a comprehensive retrospective report as a markdown document committed to the initiative's docs path.

---

## EXECUTION SEQUENCE

### 1. Generate Report

Create the report at: `${session.docs_path}/retrospective-report.md`

```markdown
# Retrospective Report: ${session.initiative_root}

**Date:** ${current_date}
**Track:** ${session.initiative.track}
**Health Score:** ${session.health_score.overall}

---

## Executive Summary

{2-3 sentence summary of initiative outcomes, key findings, and overall health assessment}

## Timeline

| Phase | Started | Duration | Gate Result |
|-------|---------|----------|-------------|
{for each phase_transition in session.phase_transitions}
| ${phase} | ${start_date} | ${duration} | ${gate_result} |
{end for}

## What Went Well

{Extracted from user observations and successful patterns}

## What Needs Improvement

### By Category

#### Process
{categorized_findings.process — each with severity, phase, and description}

#### Planning
{categorized_findings.planning}

#### Technical
{categorized_findings.technical}

#### Tooling
{categorized_findings.tooling}

#### Communication
{categorized_findings.communication}

#### Governance
{categorized_findings.governance}

## Patterns Identified

{for each pattern in session.patterns}
### Pattern: ${pattern.name}
- **Occurrences:** ${pattern.count}
- **Phases affected:** ${pattern.phases}
- **Severity:** ${pattern.severity}
- **Description:** ${pattern.description}
{end for}

## Root Cause Analysis

{for each root_cause in session.root_causes}
### ${root_cause.pattern}
- **Symptom:** ${root_cause.symptom}
- **Immediate cause:** ${root_cause.immediate_cause}
- **Root cause:** ${root_cause.root_cause}
- **Recommended action:** ${root_cause.action}
- **Priority:** ${root_cause.priority}
{end for}

## Health Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Lifecycle Adherence | ${health_score.lifecycle_adherence} | |
| Gate Pass Rate | ${health_score.gate_pass_rate} | |
| Problem Distribution | ${health_score.problem_severity_distribution} | |
| Velocity Trend | ${health_score.velocity_trend} | |
| **Overall** | **${health_score.overall}** | |

## Action Items

{Generated in the next step — placeholder for cross-reference}

## Appendix: Raw Problem Log

{Include full problems.md content if it exists}
```

### 2. Commit Report

```yaml
invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${session.docs_path}/retrospective-report.md
  phase: "RETRO:REPORT"
  initiative: ${session.initiative_root}
  description: "retrospective report generated"
```

### 3. Present Report Summary

```
📄 Retrospective Report Generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: ${session.docs_path}/retrospective-report.md
Health Score: ${session.health_score.overall}
Patterns Found: ${session.patterns.length}
Root Causes: ${session.root_causes.length}
Action Items: pending (next step)

The report has been committed. Would you like to proceed
to create action items from the root causes?
```

---

## NEXT STEP DIRECTIVE

After report is committed, proceed to: `{nextStepFile}`
