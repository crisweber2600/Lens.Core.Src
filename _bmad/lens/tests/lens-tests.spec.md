# Lens Test Specification

**Module:** lens
**Created:** 2026-02-17
**Status:** Placeholder — To be expanded during development

---

## Test Categories

### 1. State Management Tests

| Test | Description | Expected |
|------|-------------|----------|
| Init state | /new creates valid state.yaml | State matches template |
| Phase advance | Phase transition updates gate_status | Correct gate marked |
| Event logging | State mutation appends to event-log.jsonl | Entry exists with correct format |
| State repair | /fix reconstructs state from events | State matches expected |
| State sync | /sync detects branch drift | Drift reported and fixed |
| Error tracking | Error appends to background_errors | Error appears in state |

### 2. Branch Topology Tests

| Test | Description | Expected |
|------|-------------|----------|
| Init branches | /new creates root + audience branches | All branches exist |
| Phase branch | Phase command creates -p{N} branch | Branch exists and is checked out |
| Branch naming | All branches match flat pattern | No slashes in branch names |
| PR creation | Phase end creates PR | PR targets audience branch |
| Branch cleanup | Phase end deletes phase branch | Phase branch removed |

### 3. Constitution Tests

| Test | Description | Expected |
|------|-------------|----------|
| Gate enforcement | Skipping phase blocked in enforced mode | Error with rule citation |
| Advisory mode | Violation in advisory mode logs warning | Warning logged, not blocked |
| Artifact validation | Missing required artifact blocks gate | Error listing missing artifacts |

### 4. Checklist Tests

| Test | Description | Expected |
|------|-------------|----------|
| Checklist generation | Phase entry creates phase checklist | Items match phase defaults |
| Auto-update | Artifact creation marks item done | Checklist updated |
| Gate validation | /Review checks all required items | Blockers listed if incomplete |
| Progressive display | /status shows compact, /lens shows expanded | Different detail levels |

### 5. Command Routing Tests

| Test | Description | Expected |
|------|-------------|----------|
| Phase routing | Each phase command routes to correct workflow | Correct workflow invoked |
| Initiative commands | /new and /switch work correctly | State updated |
| Utility commands | /status, /sync, /fix produce correct output | Expected output |
| Discovery commands | /onboard, /discover, /bootstrap work | Artifacts created |

### 6. Integration Tests

| Test | Description | Expected |
|------|-------------|----------|
| BMM routing | /plan routes to BMM workflows | BMM workflow invoked |
| CIS routing | /pre-plan routes through CIS | CIS workflow invoked |
| TEA routing | /Review invokes TEA quality gates | TEA gates checked |
| Cross-module state | Module reads Lens state correctly | Contract version verified |

---

## Test Execution

Tests are designed to be run as behavioral validation scenarios. Each test describes a user action and expected system response. Use BMAD TEA module for formal test planning.

---

_Test spec created on 2026-02-17 via BMAD Module workflow_
