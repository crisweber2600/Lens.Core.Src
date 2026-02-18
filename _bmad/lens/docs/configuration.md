# Lens Configuration

Lens uses three layers of configuration: global settings (set at install time), per-initiative settings (set when you create an initiative), and runtime state files. This guide covers all three.

## Global Configuration

### Install-Time Settings

These values are set during BMAD module installation and stored in the global config file. You can edit the config file directly to change them later.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `target_projects_path` | string | `../TargetProjects` | Root directory where target repositories are cloned. Used by `/discover` and `/bootstrap`. |
| `docs_output_path` | string | `Docs` | Path for canonical documentation output. Per-initiative docs go under this directory in a `{domain}/{service}/{id}/` structure. |
| `enable_telemetry` | boolean | `false` | Enable lifecycle telemetry dashboards. When true, background workflows write dashboard data to `_bmad-output/lens/dashboards/`. |
| `discovery_depth` | `shallow` or `deep` | `shallow` | Default depth for `/discover` scans. Shallow reads repo names, branches, and structure. Deep performs full codebase analysis and dependency mapping. |
| `enable_jira_integration` | boolean | `false` | Enable JIRA issue linking during discovery and bootstrap workflows. |
| `default_audiences` | string | `small,medium,large` | Comma-separated list of default audience names for new feature initiatives. Minimum one audience. |
| `default_git_remote` | string | `origin` | Git remote used for push/fetch operations. |

### Config File

The global config lives at:

```text
_bmad/lens/config.yaml
```

Here is a complete example with all settings:

```yaml
# Lens Global Configuration
target_projects_path: "../TargetProjects"
docs_output_path: "Docs"
enable_telemetry: false
discovery_depth: shallow
enable_jira_integration: false
default_audiences: "small,medium,large"
default_git_remote: "origin"
```

To change a setting, edit this file directly. Changes take effect on the next Lens command.

## Per-Initiative Configuration

Each initiative has its own config file at:

```text
_bmad-output/lens/initiatives/{id}.yaml
```

This file is created by `/new` and updated by Lens during phase progression. Here is a complete example for a feature initiative:

```yaml
id: auth-flow
type: feature
name: "User Authentication Flow"
description: "JWT-based auth with OAuth2 provider support"

# Hierarchy
domain_prefix: platform
service_prefix: user-mgmt

# Branch topology
feature_branch_root: platform-user-mgmt-auth-flow
audiences:
  - small
  - medium
  - large

# Phase-to-audience mapping
review_audience_map:
  p1: small
  p2: medium
  p3: large
  p4: large
  p5: large
  p6: large

# Docs path
docs_path: "Docs/platform/user-mgmt/auth-flow/"

# Phase tracking (updated by Lens)
current_phase: p2
gate_status:
  pre-plan: passed
  plan: in-progress
  tech-plan: not-started
  story-gen: not-started
  review: not-started
  dev: not-started

# Git
remote: origin

# Governance
constitution_mode: advisory

# Timestamps
created_at: "2026-02-17T10:30:00Z"
created_by: "jane@example.com"
```

### Key Fields

**`review_audience_map`** — Maps each phase number to an audience branch. The default mapping sends P1 to `small`, P2 to `medium`, and P3-P6 to `large`. Override this to change how artifacts cascade:

```yaml
# Custom: only two audiences
review_audience_map:
  p1: internal
  p2: internal
  p3: stakeholders
  p4: stakeholders
  p5: stakeholders
  p6: stakeholders
```

**`constitution_mode`** — Controls governance behavior:

| Mode | Behavior |
|------|----------|
| `advisory` | Constitution checks run and log warnings, but never block progress. This is the default. |
| `enforced` | Constitution checks block progress on critical violations. You must fix the violation before the workflow can continue. |

Change the mode at any time by editing the initiative config file. See [Constitution Guide](constitution-guide.md) for detailed governance documentation.

**`audiences`** — The list of audience branches created for this initiative. Minimum one audience. You set this during `/new` and it cannot be changed after creation (branches already exist on the remote).

**`gate_status`** — Tracks which phase gates have passed. Managed by Lens — do not edit manually unless using `/override`.

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Global config | `_bmad/lens/config.yaml` | Install-time settings, applies to all initiatives |
| Initiative config | `_bmad-output/lens/initiatives/{id}.yaml` | Per-initiative settings, hierarchy, audiences, gates |
| State | `_bmad-output/lens/state.yaml` | Current active initiative state (mutable) |
| Event log | `_bmad-output/lens/event-log.jsonl` | Immutable audit trail of all operations |
| Repo inventory | `_bmad-output/lens/repo-inventory.yaml` | Output of `/discover` workspace scan |
| User profiles | `_bmad-output/lens/profiles/{name}.yaml` | Output of `/onboard` user detection |
| Dashboards | `_bmad-output/lens/dashboards/` | Telemetry data (when enabled) |
| Snapshots | `_bmad-output/lens/snapshots/` | State snapshots for recovery |
| Archive | `_bmad-output/lens/archive/` | Archived initiative data |

## Customizing Audiences

The default audience set (`small`, `medium`, `large`) works for most teams. You can customize this globally or per-initiative.

### Global Default

Edit `_bmad/lens/config.yaml`:

```yaml
default_audiences: "internal,team-lead,stakeholders"
```

New initiatives created with `/new` use this default. The user can still override during creation.

### Per-Initiative Override

During `/new`, when Lens asks about audiences, select "custom" and provide your own list:

```text
Audience configuration determines PR review groups per phase.
Default: small,medium,large

Accept defaults? [Y/n/custom]

> custom
Enter audiences (comma-separated): core-team,engineering,all-hands
```

The minimum is one audience. With a single audience, all phases target the same branch and there is no cascade merge.

## Related Documentation

- [Getting Started](getting-started.md) — First-time walkthrough
- [Architecture](architecture.md) — How skills, state, and modules connect
- [Branch Topology](branch-topology.md) — How audiences map to branches
- [API Reference](api-reference.md) — Full schema documentation
