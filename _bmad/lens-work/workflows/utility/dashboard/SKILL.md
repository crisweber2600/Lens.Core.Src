---
name: lens-work-dashboard
description: "LENS Workbench skill 'dashboard' wrapper. Use when multi-initiative status overview is needed."
---

# Dashboard Skill

**Purpose:** Generate a consolidated multi-initiative dashboard  
**Type:** Read-only  
**Workflow:** [workflow.md](workflow.md)

## When to Use

- User runs `/dashboard` or `/db`
- Agent needs multi-initiative context
- User asks "what initiatives are active" or "show all initiatives"

## Invocation

Load `workflow.md` and execute the dashboard algorithm.

## Output

Mermaid diagram + summary table of all active initiatives grouped by domain/service.
