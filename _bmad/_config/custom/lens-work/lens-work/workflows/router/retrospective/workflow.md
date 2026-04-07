---
name: retrospective
description: Post-initiative review — collect problems, analyze patterns, generate report with lessons learned and action items
agent: "@lens"
trigger: /retrospective command
aliases: [/retro]
category: router
phase_name: retrospective
display_name: Retrospective
entryStep: './steps/step-01-gather.md'
---

# /retrospective - Initiative Retrospective

**Goal:** Conduct a structured post-initiative review that collects all logged problems, PR comments, commit markers, and user observations. Categorize issues, identify root causes, and produce an actionable retrospective report.

**Your Role:** Operate as a retrospective facilitator. Systematically gather evidence from multiple sources, categorize findings, and produce a report that drives process improvement.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Step 1 gathers evidence from problem logs, PR comments, commit markers, and user input.
- Step 2 categorizes issues and performs root cause analysis.
- Step 3 generates the retrospective report with structured findings.
- Step 4 offers to create GitHub issues for unresolved action items.

State persists through `initiative_state`, `initiative_root`, `docs_path`, `problems`, `pr_comments`, `commit_markers`, `user_observations`, `categorized_findings`.

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `steps/step-01-gather.md` - Collect problems, PR comments, commit markers, and user observations
2. `steps/step-02-analyze.md` - Categorize issues and identify root causes
3. `steps/step-03-report.md` - Generate retrospective report
4. `steps/step-04-actions.md` - Create GitHub issues for action items (optional)
