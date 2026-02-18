# API Reference

This reference documents the lens-work module runtime data formats, schemas, event types, and integration touchpoints used by workflows and agents.

---

## Storage Locations

lens-work stores state and configuration under `_bmad-output/lens-work/`.

**Files and directories:**

| Path | Description | Git Status |
|------|-------------|------------|
| `_bmad-output/lens-work/state.yaml` | Personal state (active initiative pointer) | git-ignored |
| `_bmad-output/lens-work/initiatives/{id}.yaml` | Shared initiative config | committed |
| `_bmad-output/lens-work/event-log.jsonl` | Append-only event log for recovery/audit | committed |
| `_bmad-output/lens-work/domain-map.yaml` | Domain architecture map | committed |
| `_bmad/lens-work/service-map.yaml` | Service-to-repo mapping | committed |
| `_bmad-output/lens-work/repo-inventory.yaml` | Discovered repo inventory | committed |
| `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md` | Constitution documents | committed |

---

## `state.yaml` (Personal State)

> **Git-ignored.** Each collaborator has their own local copy. Tracks the individual user's current position in the initiative. Size/size is NOT stored here -- read from initiative config instead.

```yaml
# LENS Workbench State
# Auto-managed by lens-work - do not edit manually

version: 2
active_initiative: chat-spark-backend-alignment-50cf37
current_phase: p3
current_phase_name: Solutioning
active_branch: "chat/chat-spark-backend-alignment-50cf37/small-3"
updated_at: "2026-02-05T22:44:19Z"

current:
  phase: p3
  phase_name: "Solutioning"
  workflow: review
  workflow_status: completed
  review_completed_at: "2026-02-06T15:52:42Z"

# Backward-compat fields for legacy tooling
initiative:
  id: chat-spark-backend-alignment-50cf37
  name: "CHAT Spark Backend Alignment"
  layer: feature
  target_repos:
    - bmadServer
    - bmad-chat

branches:
  base: "chat-chat-spark-backend-alignment-50cf37"
  small: "chat-chat-spark-backend-alignment-50cf37-small"
  large: "chat-chat-spark-backend-alignment-50cf37-large"
  active: "chat-chat-spark-backend-alignment-50cf37-small"

gates: []
blocks: []
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version (current: 2) |
| `active_initiative` | string | Initiative ID pointer -- used to load initiative config |
| `current_phase` | string | Current phase identifier (e.g., `p3`) |
| `current_phase_name` | string | Human-readable phase name |
| `active_branch` | string | Currently checked-out branch |
| `updated_at` | string (ISO-8601) | Last state update timestamp |
| `current.phase` | string | Current phase (canonical) |
| `current.phase_name` | string | Current phase name |
| `current.workflow` | string | Active workflow name |
| `current.workflow_status` | enum | `pending`, `in_progress`, `completed`, `blocked` |
| `branches.base` | string | Base branch name |
| `branches.small` | string | Small size branch |
| `branches.large` | string | Large size branch |
| `branches.active` | string | Currently active branch |
| `gates` | array | Gate status entries |
| `blocks` | array | Active blockers |

**Loading pattern used by all downstream workflows:**

```yaml
# Step 1: Load personal state to find active initiative
state = load("_bmad-output/lens-work/state.yaml")

# Step 2: Load initiative config using the active_initiative pointer
# Domain-layer: initiatives/{domain_prefix}/Domain.yaml
# Service/feature: initiatives/{id}.yaml
if initiative_layer == "domain":
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}/Domain.yaml")
else:
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")

# Step 3: Use both for workflow logic
current_phase = state.current.phase
size = initiative.size           # ALWAYS read size/size from shared initiative config
domain_prefix = initiative.domain_prefix
target_repos = initiative.target_repos
```

> **Domain-layer note:** For domain-layer initiatives, `active_initiative` equals the `domain_prefix` (e.g., `bmad`). The initiative config is `Domain.yaml` inside the domain folder, not a top-level `{id}.yaml` file.

---

## `initiatives/{id}.yaml` (Shared Initiative Config)

> **Git-committed.** Shared across collaborators. Holds the canonical initiative definition, configuration, and size/size assignment. Size is always read from this file.

```yaml
id: chat-spark-backend-alignment-50cf37
name: "CHAT Spark Backend Alignment"
layer: feature
size: small                        # Size assignment (small or large)
domain: BMAD/CHAT
domain_prefix: chat
service: CHAT
created_at: "2026-02-05T22:44:19Z"
created_by: "Cris Weber"
target_repos:
  - bmadServer
  - bmad-chat
repo_branches:
  bmadServer: "feature/chat-spark-backend-alignment-50cf37"
  bmad-chat: "feature/chat-spark-backend-alignment-50cf37"
current_phase: p3
current_phase_name: Solutioning
phases:
  p1:
    status: completed
    phase_name: Analysis
    completed_at: "2026-02-05T22:44:19Z"
  p2:
    status: completed
    phase_name: Planning
    completed_at: "2026-02-05T22:44:19Z"
  p3:
    status: completed
    phase_name: Solutioning
    completed_at: "2026-02-05T22:44:19Z"
gates:
  p1_complete:
    status: passed
    verified_at: "2026-02-05T22:44:19Z"
  p2_complete:
    status: passed
    verified_at: "2026-02-05T22:44:19Z"
  p3_complete:
    status: passed
    verified_at: "2026-02-06T15:52:42Z"
  large_review:
    status: passed_with_warnings
    verified_at: "2026-02-05T22:44:19Z"
    note: "Large review intentionally pre-approved for planning-only execution."
  implementation_gate:
    status: passed
    verified_at: "2026-02-06T15:52:42Z"
    reviewer: "Cris Weber"
    artifacts_verified: 9
    readiness_blockers: 0
    dev_story_ready: true
blocks: []
branches:
  base: "chat-chat-spark-backend-alignment-50cf37"
  small: "chat-chat-spark-backend-alignment-50cf37-small"
  large: "chat-chat-spark-backend-alignment-50cf37-large"
  p1: "chat-chat-spark-backend-alignment-50cf37-small-p1"
  p2: "chat-chat-spark-backend-alignment-50cf37-medium-p2"
  p3: "chat-chat-spark-backend-alignment-50cf37-large-p3"
  active: "chat-chat-spark-backend-alignment-50cf37-large-p3"
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique initiative identifier (`{sanitized_name}-{random_6char}`) |
| `name` | string | Human-readable initiative name |
| `layer` | enum | `domain`, `service`, `microservice`, `feature` |
| `size` | string | Size assignment: `small` or `large` (NOT `lead`) |
| `domain` | string | Domain context (e.g., `BMAD/CHAT`) |
| `domain_prefix` | string | Normalized prefix for branch naming (e.g., `chat`) |
| `service` | string | Service context |
| `created_at` | string (ISO-8601) | Creation timestamp |
| `created_by` | string | Creator identity |
| `target_repos` | array[string] | Target repository names |
| `repo_branches` | map[string, string] | Per-repo branch mapping |
| `current_phase` | string | Current phase (e.g., `p3`) |
| `current_phase_name` | string | Human-readable phase name |
| `phases` | map | Phase status tracking |
| `phases.{key}.status` | enum | `pending`, `in_progress`, `completed` |
| `phases.{key}.phase_name` | string | Phase display name |
| `phases.{key}.completed_at` | string (ISO-8601) | Completion timestamp |
| `gates` | map | Gate status tracking |
| `gates.{key}.status` | enum | `open`, `passed`, `passed_with_warnings`, `failed` |
| `gates.{key}.verified_at` | string (ISO-8601) | Verification timestamp |
| `blocks` | array | Active blockers |
| `branches` | map | Branch topology mapping |

---

## Branch Naming Pattern

All branches use flat, hyphen-separated naming (no `/` separators):

```
Domain:  {domain_prefix}
Service: {domain_prefix}-{service_prefix}
Feature: {featureBranchRoot}  (e.g., {domain}-{service}-{feature_id})
Group:   {featureBranchRoot}-small | -medium | -large
Phase:   {featureBranchRoot}-{audience}-p{N}
Workflow:{featureBranchRoot}-{audience}-p{N}-{workflow}
```

Domain-layer initiatives create a single organizational branch using just the domain prefix. No base, size, phase, or workflow branches. Service/feature initiatives within the domain create their own full branch topology.

### Structure (Service/Feature)

| Segment | Description | Example |
|---------|-------------|---------|
| `{domain}` | Domain prefix from initiative config | `chat` |
| `{initiative_id}` | Unique initiative ID | `chat-spark-backend-alignment-50cf37` |
| `{size}` | Size branch: `small` or `large` (old naming `lane` / `lead` is obsolete) | `small` |
| `{phase_number}` | Phase number (1-based integer) | `1`, `2`, `3` |

### Branch Hierarchy

**Domain-layer (single branch):**
```
main
  └── {domain_prefix}                          (domain organizational branch)
```

**Service/Feature (full topology):**
```
main
  └── {featureBranchRoot}                              (initiative root)
        ├── {featureBranchRoot}-small                   (audience: small)
        │     ├── {featureBranchRoot}-small-p1           (phase 1 = Analysis)
        │     ├── {featureBranchRoot}-small-p2           (phase 2 = Planning)
        │     ├── {featureBranchRoot}-small-p3           (phase 3 = Solutioning)
        │     └── {featureBranchRoot}-small-p4           (phase 4 = Implementation)
        ├── {featureBranchRoot}-medium                  (audience: medium)
        └── {featureBranchRoot}-large                   (audience: large)
```

### Examples

| Branch | Purpose |
|--------|---------|
| `chat-spark-backend-alignment-50cf37` | Initiative root branch |
| `chat-spark-backend-alignment-50cf37-small` | Small audience branch |
| `chat-spark-backend-alignment-50cf37-large` | Large audience review branch |
| `chat-spark-backend-alignment-50cf37-small-p1` | Phase 1 (Analysis) |
| `chat-spark-backend-alignment-50cf37-small-p2` | Phase 2 (Planning) |
| `chat-spark-backend-alignment-50cf37-small-p3` | Phase 3 (Solutioning) |

> **Migration note:** The old pattern `lens/{slug}/{lane}/...` is obsolete. All `lead` references are now `large`. All `lane`/`size` references are now `audience`. Branch names use flat hyphen-separated format.

---

## Constitution Storage

Constitutions are stored in a layered hierarchy:

```
_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md
```

### Layer Hierarchy

```
domain/
  {domain-name}/
    constitution.md
service/
  {service-name}/
    constitution.md
microservice/
  {microservice-name}/
    constitution.md
feature/
  {feature-name}/
    constitution.md
```

Constitutions inherit from parent layers. A service constitution inherits articles from its parent domain constitution. The resolve-constitution workflow walks this chain to produce a resolved set of articles.

---

## `event-log.jsonl` (Event Format)

Each line is a JSON object. The file is append-only.

### Standard Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | string (ISO-8601) | yes | Event timestamp |
| `event` | string | yes | Event type identifier |
| `id` / `initiative` | string | yes | Initiative ID |
| `details` | object | no | Free-form metadata |

### Example

```json
{"ts":"2026-02-06T00:20:00Z","event":"init-initiative","id":"chat-spark-backend-alignment-50cf37","layer":"feature","target_repos":["bmadServer","bmad-chat"],"domain":"BMAD/CHAT"}
```

---

## Event Types

### Core Lifecycle Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `init-initiative` | New initiative created | `id`, `layer`, `target_repos`, `domain`, `service` |
| `start-workflow` | Workflow execution began | `initiative`, `phase`, `workflow` |
| `finish-workflow` | Workflow execution completed | `initiative`, `phase`, `workflow` |
| `start-phase` | Phase transition started | `initiative`, `phase`, `phase_name` |
| `finish-phase` | Phase completed and gated | `initiative`, `phase`, `phase_name` |

### Review Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `open-large-review` | Large review PR opened | `initiative`, `pr_url` |
| `open-final-pbr` | Final PBR review opened | `initiative`, `pr_url` |

### Utility Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `override` | Manual override applied | `initiative`, `override_reason` |
| `sync` | State synchronized | `initiative`, `strategy` |
| `fix-state` | State reconstructed from event log or git | `initiative`, `strategy` |
| `recreate-branches` | Missing branches recreated | `initiative`, `recreated_count`, `branches_recreated` |
| `archive` | Initiative archived | `initiative` |
| `rollback` | Snapshot rollback executed | `initiative`, `snapshot` |

### Governance Events

These 4 event types are defined in `data/governance-events.yaml` and are authoritative for the governance subsystem.

#### `constitution-created`

Logged when a new constitution is ratified.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO-8601) | yes | Event timestamp |
| `layer` | enum | yes | `domain`, `service`, `microservice`, `feature` |
| `name` | string | yes | Entity name (e.g., `bmad`, `lens`) |
| `articles_count` | integer | yes | Number of articles in the constitution |
| `ratified_by` | string | yes | User who ratified |
| `git_commit_sha` | string | yes | Commit SHA for audit trail |
| `initiative_id` | string | no | Active initiative ID if applicable |

#### `constitution-amended`

Logged when an existing constitution is amended.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO-8601) | yes | Event timestamp |
| `layer` | enum | yes | `domain`, `service`, `microservice`, `feature` |
| `name` | string | yes | Entity name |
| `amendment_summary` | string | yes | Brief description of the amendment |
| `articles_added` | integer | yes | Number of new articles added |
| `articles_modified` | integer | yes | Number of existing articles modified |
| `git_commit_sha` | string | yes | Commit SHA for audit trail |
| `initiative_id` | string | no | Active initiative ID if applicable |

#### `compliance-evaluated`

Logged when an artifact is checked against resolved constitutional rules.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO-8601) | yes | Event timestamp |
| `artifact_path` | string | yes | Path to the evaluated artifact |
| `artifact_type` | string | yes | Artifact type (e.g., `prd`, `architecture-doc`, `story`, `code`) |
| `constitution_resolved` | string | yes | Constitutions checked (e.g., `domain/bmad + service/lens`) |
| `pass_count` | integer | yes | Articles that passed |
| `warn_count` | integer | yes | Articles with warnings |
| `fail_count` | integer | yes | Articles that failed |
| `initiative_id` | string | yes | Active initiative ID (REQUIRED for compliance) |

#### `constitution-resolved`

Logged when the inheritance chain is walked and articles resolved.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO-8601) | yes | Event timestamp |
| `target_layer` | enum | yes | The layer context being resolved |
| `layers_walked` | integer | yes | Number of layers in the resolved hierarchy |
| `total_articles` | integer | yes | Total articles in the resolved constitution |
| `initiative_id` | string | no | Active initiative ID if applicable |

---

## Validation and Blocking Contract

When a gate or merge validation fails:

1. Set initiative gate status to `failed`
2. Add entry to `blocks` array with reason
3. Write state immediately
4. Append a `blocked` event to event log

**Override procedure:**

1. Record `override_reason` in event
2. Clear the block from `blocks` array
3. Update gate status as appropriate
4. Append an `override` event with reason

---

## Terminology Migration

The following terminology changes apply throughout lens-work:

| Old Term | New Term | Context |
|----------|----------|---------|
| `size` | `audience` | Branch topology (small/medium/large) |
| `lead` | `large` | The review/integration branch |
| `Navigator` | `Compass` / `Scout` | Agent roles |
| `{domain}/{id}/base` | `{featureBranchRoot}` | Branch root (flat, hyphen-separated) |
| `{domain}/{id}/{size}-{N}-{wf}` | `{featureBranchRoot}-{audience}-p{N}-{workflow}` | Workflow branch |
| `.lens/` | `_bmad-output/lens-work/` | Storage location |
| `_bmad/lens/` | `_bmad-output/lens-work/` | Output folder |
| `state_folder` | `_bmad-output/lens-work/` | Configuration |
| `lead_review` | `large_review` | Gate names |

---

## Agent Responsibilities

| Agent | Responsibility |
|-------|---------------|
| **Compass** | Route commands, gather input, delegate to specialists |
| **Casey** | All git operations (branch create, commit, push, checkout) |
| **Scout** | Discovery, analysis, domain mapping, impact analysis |
| **Tracey** | State management, event logging, recovery operations |
| **Scribe** | Document generation and constitution management |
