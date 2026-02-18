# Artifact Validator Reference

**Module:** lens
**Type:** Include (shared reference for workflows)

---

## Purpose

Defines the expected artifacts for each lifecycle phase and provides validation rules used by the checklist and constitution skills.

## Required Artifacts by Phase

### Pre-Plan (P1)
| Artifact | Type | Location |
|----------|------|----------|
| Product brief | Document | planning-artifacts/product-brief.md |
| Brainstorm notes | Document (optional) | planning-artifacts/brainstorm-notes.md |
| Research summary | Document (optional) | planning-artifacts/research-summary.md |

### Plan (P2)
| Artifact | Type | Location |
|----------|------|----------|
| PRD | Document | planning-artifacts/prd.md |
| Epic definitions | Document | planning-artifacts/epics.md |
| User stories | Document (optional) | planning-artifacts/user-stories.md |
| Acceptance criteria | Document (optional) | planning-artifacts/acceptance-criteria.md |

### Tech-Plan (P3)
| Artifact | Type | Location |
|----------|------|----------|
| Architecture document | Document | planning-artifacts/architecture.md |
| Tech decisions log | Document | planning-artifacts/tech-decisions.md |
| API contracts | Document (optional) | planning-artifacts/api-contracts.md |

### Story-Gen (P4)
| Artifact | Type | Location |
|----------|------|----------|
| Implementation stories | Document | implementation-artifacts/implementation-stories.md |
| Story estimates | Document (optional) | implementation-artifacts/story-estimates.md |
| Dependency map | Document (optional) | implementation-artifacts/dependency-map.md |

### Review (P5)
| Artifact | Type | Location |
|----------|------|----------|
| Readiness report | Document | _bmad-output/lens/readiness-report-{id}.md |
| Constitution compliance | Log | event-log.jsonl |

### Dev (P6)
| Artifact | Type | Location |
|----------|------|----------|
| Source code | Code | repo working tree |
| Tests | Code | repo working tree |
| PR | Git | remote |

## Validation Rules

1. Artifact must exist at expected path
2. Artifact must be non-empty
3. Artifact must have been modified in current phase (not stale)
4. Required artifacts block gate; optional artifacts warn only

---

_Include file created on 2026-02-17 via BMAD Module workflow_
