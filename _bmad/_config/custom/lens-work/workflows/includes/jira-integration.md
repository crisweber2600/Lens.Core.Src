---
name: jira-integration
description: JIRA/task-tracker integration patterns and CSV-based story tracking
type: include
---

# JIRA Integration Reference

This document defines patterns for integrating lens-work with JIRA and other task trackers, including a CSV-based alternative for teams without a JIRA MCP connection.

---

## Overview

lens-work supports two modes of task tracking:

1. **JIRA MCP** — Direct integration via JIRA MCP server (when available)
2. **CSV Tracking** — Lightweight file-based tracking (always available, default)

The system prioritizes CSV tracking as the baseline and layers JIRA MCP on top when configured.

---

## Story Templates

### Standard Story Fields

```yaml
story:
  id: string               # Unique identifier (lens-generated or JIRA key)
  title: string             # Short, actionable title
  description: string       # Detailed description (markdown supported)
  acceptance_criteria:       # List of testable criteria
    - criterion: string
      met: boolean
  story_points: integer     # Fibonacci: 1, 2, 3, 5, 8, 13
  epic_link: string         # Parent epic ID or key
  status: enum              # backlog | ready | in_progress | review | done
  assignee: string          # Developer name or handle
  sprint: string            # Sprint identifier
  priority: enum            # critical | high | medium | low
  labels: list              # Tags for categorization
  phase: string             # techplan (solutioning) or devproposal (implementation)
  initiative_id: string     # Parent lens initiative
```

### Story Template (Markdown)

```markdown
# Story: {title}

**ID:** {id}
**Epic:** {epic_link}
**Points:** {story_points}
**Priority:** {priority}
**Assignee:** {assignee}

## Description

{description}

## Acceptance Criteria

- [ ] {criterion_1}
- [ ] {criterion_2}
- [ ] {criterion_3}

## Technical Notes

{technical_notes}

## Dependencies

- {dependency_1}
- {dependency_2}
```

### Dev Story Template (P4 Implementation)

```markdown
# Dev Story: {title}

**Story ID:** {id}
**Sprint:** {sprint}
**Branch:** {featureBranchRoot}-medium-devproposal-dev-story

## Implementation Plan

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| {file_path} | create/modify | {what_changes} |

### Implementation Steps

1. {step_1}
2. {step_2}
3. {step_3}

### Testing Approach

- [ ] Unit tests for {component}
- [ ] Integration test for {flow}

### Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
```

---

## Epic/Feature Linking Patterns

### Epic Structure

```yaml
epic:
  id: string               # JIRA key or lens-generated
  title: string
  description: string
  initiative_id: string     # Parent initiative
  stories: list             # Child story IDs
  status: enum              # planning | in_progress | done
  target_sprint: string     # Target completion sprint
```

### Linking Hierarchy

```
Initiative (lens-work)
└── Epic (JIRA or CSV)
    ├── Story 1
    ├── Story 2
    └── Story 3
```

### Epic-to-Phase Mapping

| Phase | Epic Type | Description |
|-------|-----------|-------------|
| P3 | Planning Epic | Created during solutioning, contains P3 stories |
| P4 | Implementation Epic | Created during implementation, contains dev stories |

---

## Sprint Query Templates

### JIRA JQL Queries

```jql
# All stories for an initiative
project = {PROJECT} AND labels = "lens:{initiative_id}"

# Current sprint stories
project = {PROJECT} AND sprint in openSprints() AND labels = "lens:{initiative_id}"

# Stories by status
project = {PROJECT} AND labels = "lens:{initiative_id}" AND status = "In Progress"

# Stories by epic
project = {PROJECT} AND "Epic Link" = {epic_key} AND labels = "lens:{initiative_id}"

# Blocked stories
project = {PROJECT} AND labels = "lens:{initiative_id}" AND status = "Blocked"

# Sprint velocity (completed points)
project = {PROJECT} AND sprint = {sprint_name} AND status = "Done" AND labels = "lens:{initiative_id}"
```

### Sprint Status Report Template

```markdown
## Sprint Status: {sprint_name}

**Initiative:** {initiative_id}
**Date:** {ISO_TIMESTAMP}

### Progress
| Status | Count | Points |
|--------|-------|--------|
| Done | {n} | {pts} |
| In Progress | {n} | {pts} |
| Ready | {n} | {pts} |
| Blocked | {n} | {pts} |

### Velocity
- Committed: {total_pts} pts
- Completed: {done_pts} pts
- Carry-over: {carry_pts} pts
```

---

## CSV-Based Story Tracking

The CSV tracker is the default tracking mechanism. It lives alongside planning artifacts and is committed to the initiative branch.

### Story CSV Location

```
_bmad-output/planning-artifacts/{initiative_id}/stories.csv
```

### CSV Format

```csv
id,title,epic,status,points,assignee,sprint,priority,phase,created_at,updated_at
```

#### Field Definitions

| Field | Type | Values | Required |
|-------|------|--------|----------|
| `id` | string | Auto-generated: `S-{NNN}` | Yes |
| `title` | string | Short story title | Yes |
| `epic` | string | Epic ID: `E-{NN}` | Yes |
| `status` | enum | `backlog`, `ready`, `in_progress`, `review`, `done` | Yes |
| `points` | integer | Fibonacci: 1,2,3,5,8,13 | No |
| `assignee` | string | Developer name or handle | No |
| `sprint` | string | Sprint identifier | No |
| `priority` | enum | `critical`, `high`, `medium`, `low` | No |
| `phase` | string | `techplan` or `devproposal` | Yes |
| `created_at` | ISO8601 | Creation timestamp | Yes |
| `updated_at` | ISO8601 | Last update timestamp | Yes |

### Example CSV

```csv
id,title,epic,status,points,assignee,sprint,priority,phase,created_at,updated_at
S-001,Set up API gateway routing,E-01,done,3,alice,sprint-1,high,devproposal,2026-02-01T10:00:00Z,2026-02-03T14:30:00Z
S-002,Implement rate limiting middleware,E-01,in_progress,5,bob,sprint-1,high,devproposal,2026-02-01T10:00:00Z,2026-02-04T09:15:00Z
S-003,Add request validation,E-01,ready,3,,sprint-2,medium,devproposal,2026-02-01T10:00:00Z,2026-02-01T10:00:00Z
S-004,Write integration tests for rate limiter,E-02,backlog,5,,,medium,devproposal,2026-02-01T10:00:00Z,2026-02-01T10:00:00Z
```

### Epic CSV Location

```
_bmad-output/planning-artifacts/{initiative_id}/epics.csv
```

### Epic CSV Format

```csv
id,title,status,story_count,total_points,completed_points,target_sprint
E-01,API Gateway Core,in_progress,3,11,3,sprint-2
E-02,Testing Infrastructure,backlog,1,5,0,sprint-3
```

---

## CSV Operations

### Query Patterns (Shell)

```bash
# List all in-progress stories
awk -F',' '$4 == "in_progress"' stories.csv

# Sum story points by status
awk -F',' 'NR>1 {pts[$4]+=$5} END {for(s in pts) print s, pts[s]}' stories.csv

# Filter by sprint
awk -F',' -v sprint="sprint-1" '$7 == sprint' stories.csv

# Count stories per epic
awk -F',' 'NR>1 {count[$3]++} END {for(e in count) print e, count[e]}' stories.csv

# Blocked stories (status = blocked OR assignee empty for ready stories)
awk -F',' '$4 == "ready" && $6 == ""' stories.csv
```

### CSV Update Pattern

When updating story status in workflows:

```bash
# Update status of story S-002 to "review"
awk -F',' -v OFS=',' '{
  if ($1 == "S-002") {
    $4 = "review";
    $11 = strftime("%Y-%m-%dT%H:%M:%SZ")
  }
  print
}' stories.csv > stories.csv.tmp && mv stories.csv.tmp stories.csv
```

---

## JIRA MCP Integration (When Available)

When a JIRA MCP server is configured, lens-work can sync CSV tracking to JIRA:

### Configuration

```yaml
# In service-map.yaml or module.yaml
integrations:
  jira:
    enabled: true
    project_key: "{PROJECT}"
    label_prefix: "lens:"
    sync_mode: "push"    # push | pull | bidirectional
```

### Sync Behavior

| Operation | CSV → JIRA | JIRA → CSV |
|-----------|------------|------------|
| Create story | Auto-create JIRA issue | Not supported (CSV is source of truth) |
| Update status | Update JIRA status | Optional pull sync |
| Add assignee | Update JIRA assignee | Optional pull sync |
| Sprint assign | Update JIRA sprint | Optional pull sync |

### Event Log Entry for JIRA Sync

```json
{"ts":"${ISO_TIMESTAMP}","event":"jira-sync","direction":"push","stories_synced":5,"errors":0}
```

---

## Related Includes

- **artifact-validator.md** — Validates story artifacts before phase gates
- **gate-event-template.md** — Gate events triggered by story completion
- **docs-path.md** — Canonical paths for story and epic files

---

## Context Enhancement Compatibility

JIRA integration uses initiative metadata from config, not from planning artifact paths.
No path changes required for JIRA sync. The initiative config's `docs.path` field is
available for JIRA ticket descriptions if link-back to artifacts is desired.

### Using docs.path in JIRA Descriptions

When creating JIRA tickets, the `docs.path` from initiative config can be included
in ticket descriptions to link back to the source planning artifacts:

```yaml
# Example: Including docs.path in JIRA ticket description
description: |
  Planning artifacts: ${initiative.docs.path}/
  Architecture: ${initiative.docs.path}/architecture.md
  Stories: ${initiative.docs.path}/stories.md
```

### CSV Tracker Path Compatibility

The CSV story tracker location follows the same path resolution as other artifacts:
- **New**: `${docs_path}/stories.csv` and `${docs_path}/epics.csv`
- **Legacy**: `_bmad-output/planning-artifacts/{initiative_id}/stories.csv`

Both locations are supported. The artifact validator handles path resolution transparently.
