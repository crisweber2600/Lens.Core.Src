# API Reference

Complete schema documentation for Lens state files, event log, initiative configuration, commands, skills, and cross-module contracts.

## State Contract

### state.yaml

Located at `_bmad-output/lens/state.yaml`. This is the mutable current-state file, updated atomically at workflow boundaries.

```yaml
# Contract version — other modules check this before reading state
lens_contract_version: "2.0"

active_initiative:
  # Initiative identifier (matches the filename in initiatives/)
  id: "auth-flow"                          # type: string, required

  # Initiative type — determines branch topology
  type: "feature"                          # type: enum [domain, service, feature]

  # Current lifecycle phase
  current_phase: "p2"                      # type: enum [null, p1, p2, p3, p4, p5, p6]
                                           # null = created but no phase started

  # Flat hyphen-separated root branch name
  feature_branch_root: "platform-user-mgmt-auth-flow"  # type: string

  # Audience branches configured for this initiative
  audiences:                               # type: string[], min 1 item
    - "small"
    - "medium"
    - "large"

  # Currently targeted audience
  current_audience: "medium"               # type: string, must be in audiences[]

  # Currently checked-out branch
  current_phase_branch: "platform-user-mgmt-auth-flow-medium-p2"  # type: string

  # Per-phase gate status — tracks lifecycle progression
  gate_status:                             # type: object, all 6 keys required
    pre-plan: "passed"                     # enum [not-started, in-progress, passed]
    plan: "in-progress"
    tech-plan: "not-started"
    story-gen: "not-started"
    review: "not-started"
    dev: "not-started"

  # Per-phase checklist — progressive disclosure
  checklist:                               # type: object, keys are phase names
    pre-plan:
      - item: "Product brief created"
        status: "done"                     # enum [done, in-progress, not-started, blocked]
        required: true                     # type: boolean
      - item: "Brainstorming session completed"
        status: "done"
        required: false

# Background workflow errors — accumulated, cleared by /sync
background_errors: []                      # type: object[], each has ts, source, message

# Current workflow execution status
workflow_status: "idle"                    # type: enum [idle, running]
```

**Field constraints:**

| Field | Type | Constraints |
|-------|------|-------------|
| `lens_contract_version` | string | Must be `"2.0"` |
| `active_initiative.id` | string | Must match a file in `initiatives/` |
| `active_initiative.type` | enum | `domain`, `service`, or `feature` |
| `active_initiative.current_phase` | enum | `null`, `p1`–`p6` |
| `active_initiative.audiences` | string[] | Minimum 1 element |
| `active_initiative.gate_status.*` | enum | `not-started`, `in-progress`, `passed` |
| `active_initiative.checklist.*.status` | enum | `done`, `in-progress`, `not-started`, `blocked` |
| `background_errors` | object[] | Each object has `ts` (ISO 8601), `source` (string), `message` (string) |
| `workflow_status` | enum | `idle` or `running` |

### initiative-template.yaml

Located at `_bmad-output/lens/initiatives/{id}.yaml`. One file per initiative, created by `/new`.

```yaml
id: "auth-flow"
type: "feature"                      # domain | service | feature
name: "User Authentication Flow"
description: "JWT-based auth with OAuth2 provider support"

# Hierarchy — determines featureBranchRoot construction
domain_prefix: "platform"
service_prefix: "user-mgmt"         # empty for domain initiatives

# Branch topology — feature initiatives only
feature_branch_root: "platform-user-mgmt-auth-flow"
audiences:
  - small
  - medium
  - large

# Phase-to-audience mapping — determines which audience branch each phase PR targets
review_audience_map:
  p1: small
  p2: medium
  p3: large
  p4: large
  p5: large
  p6: large

# Documentation output path
docs_path: "Docs/platform/user-mgmt/auth-flow/"

# Phase tracking — kept in sync with state.yaml via dual-write
current_phase: "p2"                  # null | p1 | p2 | p3 | p4 | p5 | p6
gate_status:
  pre-plan: passed
  plan: in-progress
  tech-plan: not-started
  story-gen: not-started
  review: not-started
  dev: not-started

# Git configuration
remote: origin

# Governance mode
constitution_mode: advisory          # advisory | enforced

# Metadata
created_at: "2026-02-17T10:30:00Z"
created_by: "jane@example.com"
```

**Dual-write contract:** When `gate_status` or `current_phase` changes, the `state-management` skill writes to **both** `state.yaml` and the initiative config file. This keeps them synchronized. If they drift, `/sync` detects it and `/fix` resolves it.

## Event Log

### Schema

Located at `_bmad-output/lens/event-log.jsonl`. Append-only, one JSON object per line.

```json
{
  "ts": "ISO 8601 timestamp",
  "event": "event type string",
  "initiative": "initiative ID",
  "user": "git user identity",
  "details": {}
}
```

### Event Types

There are 12 event types. Each includes a `details` object with event-specific payload:

#### initiative_created

Fired by `/new` when a new initiative is created.

```json
{"ts": "2026-02-17T10:30:00Z", "event": "initiative_created", "initiative": "auth-flow", "user": "jane@example.com", "details": {"type": "feature", "name": "User Authentication Flow", "branches": ["platform-user-mgmt-auth-flow", "platform-user-mgmt-auth-flow-small", "platform-user-mgmt-auth-flow-medium", "platform-user-mgmt-auth-flow-large"]}}
```

#### phase_transition

Fired when the current phase changes (advancing to the next phase).

```json
{"ts": "2026-02-17T11:00:00Z", "event": "phase_transition", "initiative": "auth-flow", "user": "jane@example.com", "details": {"from": "p1", "to": "p2", "gate": "pre-plan=passed"}}
```

#### workflow_start

Fired at the beginning of any workflow execution.

```json
{"ts": "2026-02-17T11:05:00Z", "event": "workflow_start", "initiative": "auth-flow", "user": "jane@example.com", "details": {"phase": "p2", "workflow": "plan"}}
```

#### workflow_end

Fired when a workflow completes successfully.

```json
{"ts": "2026-02-17T12:30:00Z", "event": "workflow_end", "initiative": "auth-flow", "user": "jane@example.com", "details": {"phase": "p2", "workflow": "plan", "artifacts": ["prd.md", "epics.md"]}}
```

#### gate_opened

Fired when a phase gate transitions to `passed`.

```json
{"ts": "2026-02-17T12:31:00Z", "event": "gate_opened", "initiative": "auth-flow", "user": "jane@example.com", "details": {"gate": "plan", "artifacts_validated": ["prd.md", "epics.md"], "checklist_complete": true}}
```

#### gate_blocked

Fired when a gate check fails (missing artifacts, incomplete checklist).

```json
{"ts": "2026-02-17T12:30:00Z", "event": "gate_blocked", "initiative": "auth-flow", "user": "jane@example.com", "details": {"gate": "plan", "reason": "Missing required artifact: epics.md", "mode": "enforced"}}
```

#### state_synced

Fired by `/sync` after reconciliation.

```json
{"ts": "2026-02-17T13:00:00Z", "event": "state_synced", "initiative": "auth-flow", "user": "jane@example.com", "details": {"drift_detected": true, "fixes": ["updated current_phase_branch"]}}
```

#### state_fixed

Fired by `/fix` after rebuilding state from event log.

```json
{"ts": "2026-02-17T13:05:00Z", "event": "state_fixed", "initiative": "auth-flow", "user": "jane@example.com", "details": {"events_replayed": 14, "fields_rebuilt": ["gate_status", "current_phase"]}}
```

#### state_overridden

Fired by `/override` after manual state modification.

```json
{"ts": "2026-02-17T13:10:00Z", "event": "state_overridden", "initiative": "auth-flow", "user": "jane@example.com", "details": {"field": "gate_status.plan", "old_value": "not-started", "new_value": "passed"}}
```

#### context_switch

Fired by `/switch` when changing the active initiative.

```json
{"ts": "2026-02-17T14:00:00Z", "event": "context_switch", "initiative": "auth-flow", "user": "jane@example.com", "details": {"from": "data-pipeline", "to": "auth-flow"}}
```

#### initiative_archived

Fired by `/archive` when archiving an initiative.

```json
{"ts": "2026-03-01T09:00:00Z", "event": "initiative_archived", "initiative": "auth-flow", "user": "jane@example.com", "details": {"archive_path": "_bmad-output/lens/archive/auth-flow-2026-03-01/", "phases_completed": 6}}
```

#### error

Fired when any error occurs, including background workflow failures.

```json
{"ts": "2026-02-17T11:05:30Z", "event": "error", "initiative": "auth-flow", "user": "jane@example.com", "details": {"source": "branch-validate", "message": "Missing audience branch: platform-user-mgmt-auth-flow-medium", "severity": "warning"}}
```

## Branch Patterns

Six levels of branch naming. All flat, hyphen-separated, no slashes:

| Level | Pattern | Regex |
|-------|---------|-------|
| Domain | `{domain_prefix}` | `^[a-z][a-z0-9-]+$` |
| Service | `{domain_prefix}-{service_prefix}` | `^[a-z][a-z0-9-]+-[a-z][a-z0-9-]+$` |
| Root | `{featureBranchRoot}` | `^[a-z][a-z0-9-]+(-[a-z][a-z0-9-]+){2,}$` |
| Audience | `{featureBranchRoot}-{audience}` | `^.+-(?:small\|medium\|large\|[a-z-]+)$` |
| Phase | `{featureBranchRoot}-{audience}-p{N}` | `^.+-[a-z]+-p[0-9]+$` |
| Workflow | `{featureBranchRoot}-{audience}-p{N}-{workflow}` | `^.+-[a-z]+-p[0-9]+-[a-z0-9-]+$` |

These patterns are also defined in `module.yaml` under the `git.branch_patterns` section.

## Commands

### Complete Command Table

| Command | Type | Category | Workflow Path | R/W | Prerequisites |
|---------|------|----------|---------------|-----|---------------|
| `/onboard` | Discovery | discovery | `discovery/onboard` | R/W | Git identity configured |
| `/discover` | Discovery | discovery | `discovery/discover` | R/W | Config exists |
| `/bootstrap` | Discovery | discovery | `discovery/bootstrap` | R/W | Repo inventory exists |
| `/new` | Initiative | initiative | `initiative/init-initiative` | R/W | None |
| `/switch` | Initiative | initiative | `initiative/switch-context` | R/W | At least one initiative exists |
| `/pre-plan` | Phase | phase | `phase/pre-plan` | R/W | Initiative created |
| `/plan` | Phase | phase | `phase/plan` | R/W | Gate: pre-plan=passed |
| `/tech-plan` | Phase | phase | `phase/tech-plan` | R/W | Gate: plan=passed |
| `/Story-Gen` | Phase | phase | `phase/story-gen` | R/W | Gate: tech-plan=passed |
| `/Review` | Phase | phase | `phase/review` | R/W | Gate: story-gen=passed |
| `/Dev` | Phase | phase | `phase/dev` | R/W | Gate: review=passed |
| `/status` | Utility | utility | `utility/status` | R | Active initiative exists |
| `/lens` | Context | — | *(inline)* | R | Active initiative exists |
| `/sync` | Recovery | utility | `utility/sync-state` | R/W | State or branches exist |
| `/fix` | Recovery | utility | `utility/fix-state` | R/W | Event log exists |
| `/override` | Recovery | utility | `utility/override-state` | R/W | State exists |
| `/resume` | Recovery | utility | `utility/resume` | R/W | Event log has unfinished workflow |
| `/archive` | Utility | utility | `utility/archive` | R/W | Active initiative exists |

### Phase Module Routing

| Phase | Command | Primary Module | Artifacts Produced |
|-------|---------|---------------|-------------------|
| P1 | `/pre-plan` | CIS + BMM | `product-brief.md` |
| P2 | `/plan` | BMM | `prd.md`, `epics.md` |
| P3 | `/tech-plan` | BMM | `architecture.md`, `tech-decisions.md` |
| P4 | `/Story-Gen` | BMM | `implementation-stories.md` |
| P5 | `/Review` | Lens (native) | `readiness-report-{id}.md` |
| P6 | `/Dev` | BMM | Source code, tests, PR |

## Skills

### Skill Reference

| Skill | File | Triggers | State Fields Touched |
|-------|------|----------|---------------------|
| `git-orchestration` | `skills/git-orchestration.md` | Branch creation, phase start, workflow start/end, PR creation | `current_phase_branch`, `feature_branch_root`, `audiences` |
| `state-management` | `skills/state-management.md` | State read/write, event logging, dual-write sync | All `state.yaml` fields, initiative config sync |
| `discovery` | `skills/discovery.md` | `/onboard`, `/discover`, `/bootstrap` | Profile creation, repo inventory |
| `constitution` | `skills/constitution.md` | `workflow_start`, `phase_transition` | Event log (constitution_check entries) |
| `checklist` | `skills/checklist.md` | Phase entry, artifact creation, phase transition | `checklist` object in state |

### Skill Trigger Conditions

| Trigger | Skills Activated |
|---------|-----------------|
| Initiative created | git-orchestration, state-management |
| Workflow start | git-orchestration, state-management, constitution |
| Workflow end | state-management, checklist |
| Phase transition | git-orchestration, state-management, constitution, checklist |
| Artifact created | checklist |
| `/Review` command | constitution (full scan), checklist (full validation) |

## Cross-Module Contract

Lens exposes state to other BMAD modules through `lens_contract_version: "2.0"` in `state.yaml`. When routing to BMM, CIS, or TEA, Lens passes:

| Data | Source | Purpose |
|------|--------|---------|
| Current phase | `active_initiative.current_phase` | Module adapts workflow to current lifecycle stage |
| Initiative type | `active_initiative.type` | Module applies type-specific behavior |
| Gate status | `active_initiative.gate_status` | Module verifies prerequisites are met |
| Constitution results | Latest `constitution_check` event | Module respects governance decisions |
| Audience config | `active_initiative.audiences` + `current_audience` | Module knows the review scope |
| Feature branch root | `active_initiative.feature_branch_root` | Module creates branches in the right topology |

Other modules read Lens state by:

1. Checking `lens_contract_version` in `state.yaml` to confirm compatibility
2. Reading `active_initiative` for context
3. Writing artifacts to the configured `docs_path` or standard artifact directories

Lens does not expose skill internals or background workflow details to other modules. The contract boundary is `state.yaml` and the initiative config.

## File Locations Summary

| File | Path | Managed By |
|------|------|-----------|
| Global config | `_bmad/lens/config.yaml` | Installer, user edits |
| Agent spec | `_bmad/lens/agents/lens.agent.yaml` | Installer |
| State | `_bmad-output/lens/state.yaml` | `state-management` skill |
| Event log | `_bmad-output/lens/event-log.jsonl` | `state-management` skill |
| Initiative configs | `_bmad-output/lens/initiatives/{id}.yaml` | `/new`, `state-management` dual-write |
| User profiles | `_bmad-output/lens/profiles/{name}.yaml` | `/onboard` |
| Repo inventory | `_bmad-output/lens/repo-inventory.yaml` | `/discover` |
| Bootstrap report | `_bmad-output/lens/bootstrap-report.md` | `/bootstrap` |
| Dashboards | `_bmad-output/lens/dashboards/` | Background workflows (when telemetry enabled) |
| Snapshots | `_bmad-output/lens/snapshots/` | Recovery workflows |
| Archive | `_bmad-output/lens/archive/{id}-{date}/` | `/archive` |
| Copilot instructions | `.github/lens-instructions.md` | Installer |

## Related Documentation

- [Architecture](architecture.md) — How skills, state, and modules connect
- [Configuration](configuration.md) — Install-time and per-initiative settings
- [Branch Topology](branch-topology.md) — Branch naming convention and lifecycle
- [Constitution Guide](constitution-guide.md) — Governance rules and modes
