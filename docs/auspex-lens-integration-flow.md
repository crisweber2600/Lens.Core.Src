# Auspex Lens Integration Flow

## Purpose

This guide explains how to integrate Auspex into the Lens workflow and how to use the new Auspex-first flow once it is installed.

Auspex does not replace Lens governance. Lens still owns feature context, lifecycle phase state, constitution gates, write-scope enforcement, and target-repo boundaries. Auspex becomes the preferred workflow layer for cumulative project knowledge: Two-Tree topology, derived maps, living ledgers, Salmon impact review, audits, and stakeholder reporting.

Existing `lens-new-domain`, `lens-new-service`, and `lens-new-feature` commands remain available. Use them when you need direct governance scaffolding. Use Auspex when the work is about how knowledge grows, moves, consolidates, and becomes reportable across features.

## Mental Model

The new flow separates three concerns:

| Concern | Owner | Source Or Output |
| --- | --- | --- |
| Feature lifecycle and safety gates | Lens | governance `feature.yaml`, active context, constitution |
| Current project knowledge | Auspex landscape | service, domain, and program ledgers under `docs/` |
| Generated visibility | Auspex reports | `_bmad-output/auspex` snapshots, audits, impact reports |

The practical rule is:

```text
Lens controls whether work is allowed.
Auspex controls how cumulative knowledge is organized and reported.
```

## Installed Surfaces

An Auspex-integrated Lens repo has these surfaces:

```text
.agents/
  skills/
    ausx-setup/
    ausx-map-audit/
    ausx-ledger-promotion/
    ausx-salmon-impact/
    ausx-topology-design/
    ausx-reporting-snapshot/

_bmad/
  config.yaml
  module-help.csv
  lens-work/
    prompts/lens-auspex-*.prompt.md
    skills/lens-auspex-*/SKILL.md

.github/
  prompts/lens-auspex-*.prompt.md

docs/
  auspex-user-guide.md
  auspex-architecture.md
  auspex-reporting-ui-contract.md
  auspex-lens-integration-flow.md
```

The `ausx-*` skills are the BMad module implementation. The `lens-auspex-*` skills are Lens wrappers and are the preferred public entrypoint inside Lens workspaces.

## Wrapper Contract

Every `lens-auspex-*` wrapper follows the same contract:

1. Run Lens preflight from the workspace root.
2. Resolve feature context from explicit input, session context, then governance `feature.yaml`.
3. Require domain, service, feature ID, track, phase, docs path, and target repo mapping when writes are possible.
4. Resolve constitution gates for the active domain and service.
5. Display applicable hard gates before delegation.
6. Enforce write scope.
7. Delegate to the matching `ausx-*` skill or reporting contract workflow.
8. Stop after delegation; do not chain into unrelated Lens commands.

Use this contract when adding or maintaining any new Auspex wrapper.

## Command Mapping

| Lens wrapper | Delegates to | Use this for |
| --- | --- | --- |
| `lens-auspex-setup` | `ausx-setup` | Configure or repair Auspex module config and help rows. |
| `lens-auspex-map-audit` | `ausx-map-audit` | Audit stable IDs, parent refs, ledgers, or derived map readiness. |
| `lens-auspex-ledger-promotion` | `ausx-ledger-promotion` | Promote durable feature knowledge into living ledgers. |
| `lens-auspex-salmon-impact` | `ausx-salmon-impact` | Review upstream-impact signals and recursive consistency risk. |
| `lens-auspex-topology-design` | `ausx-topology-design` | Design service, domain, or program topology. |
| `lens-auspex-reporting-snapshot` | `ausx-reporting-snapshot` | Generate read-only stakeholder snapshot Markdown and JSON. |
| `lens-auspex-reporting-ui` | contract docs and snapshots | Maintain the MVP1 reporting UI contract without creating a deployable app. |

## Operator Flow

Use this flow for new organic work.

### 1. Create Or Switch To A Lens Feature

Use normal Lens lifecycle setup:

```text
lens-new-feature
lens-switch <feature-id>
```

For the Auspex integration feature itself, the expected context is:

```text
domain: lens-dev
service: new-codebase
feature_id: lens-dev-new-codebase-auspex
track: express
```

### 2. Configure Auspex

Run:

```text
lens-auspex-setup
```

This ensures `_bmad/config.yaml`, `_bmad/module-help.csv`, and `_bmad-output/auspex` conventions are present. Personal config belongs in ignored files such as `_bmad/config.user.yaml` or `_bmad/config.user.toml`.

### 3. Design Or Confirm Topology

Run:

```text
lens-auspex-topology-design
```

Use this when a feature needs to become a service, a service needs a domain, or a domain needs a program. The output should identify stable IDs, parent refs, ledger paths, and assumptions.

Do not move feature archives when the landscape changes.

### 4. Archive Feature Evidence

New durable feature evidence should live under:

```text
docs/features/<feature-id>/
```

Feature metadata should include stable identity and attachment:

```yaml
featureId: lens-dev-new-codebase-auspex
kind: feature
status: active
belongs_to:
  service: new-codebase
  domain: lens-dev
  program: null
docs_path: docs/features/lens-dev-new-codebase-auspex
promotion_status: pending
```

Feature archives are historical records. Do not reorganize them to match later service or domain changes.

### 5. Keep Living Ledgers In The Landscape

Living service, domain, and program knowledge belongs under `docs/`, usually in a top-down path:

```text
docs/<program>/<domain>/<service>/ledger/
docs/<domain>/<service>/ledger/
docs/<service>/ledger/
```

Entity metadata should include stable IDs and parent refs:

```yaml
id: new-codebase
kind: service
belongs_to:
  domain: lens-dev
  program: null
features:
  - lens-dev-new-codebase-auspex
ledger_path: docs/lens-dev/new-codebase/ledger
```

Landscape paths may change as topology matures. IDs should not.

### 6. Audit Before Trusting The Map

Run:

```text
lens-auspex-map-audit
```

Use the audit before promotion, topology reorganization, projection rebuilds, or stakeholder snapshots. Blocking findings should stop publication or promotion until resolved or explicitly accepted.

### 7. Promote Durable Knowledge

Run:

```text
lens-auspex-ledger-promotion
```

Promotion reads completed feature evidence and proposes ledger updates. It should preserve provenance with `source_feature` or an equivalent reference.

Use apply behavior only when the ledger write is intentional:

```text
lens-auspex-ledger-promotion --apply
```

### 8. Review Upstream Impact With Salmon

Run:

```text
lens-auspex-salmon-impact
```

Use Salmon when a feature discovers something that may invalidate service, domain, program, sibling feature, or ledger assumptions. Salmon signals are advisory by default; blockers come from discovered inconsistency.

### 9. Produce Stakeholder Snapshots

Run:

```text
lens-auspex-reporting-snapshot
```

Snapshots are generated read-only views under `_bmad-output/auspex`. They should include health, blockers, advisory findings, feature status, ledger health, Salmon impact status, and freshness.

Use:

```text
lens-auspex-reporting-ui
```

when maintaining the MVP1 reporting UI data contract. This repo only owns the contract and snapshot foundation; a deployable UI belongs in a future app target repo.

## Integrating Auspex Into A New Lens Install

Use this checklist when bringing Auspex into another Lens workspace.

1. Copy or install the root Auspex BMad module skills under `.agents/skills/ausx-*`.
2. Add root `_bmad/config.yaml` with the `ausx` section.
3. Add root `_bmad/module-help.csv` rows for `ausx-*` module workflows.
4. Add Lens wrapper skills under `_bmad/lens-work/skills/lens-auspex-*/SKILL.md`.
5. Add Lens release prompts under `_bmad/lens-work/prompts/lens-auspex-*.prompt.md`.
6. Add public prompt stubs under `.github/prompts/lens-auspex-*.prompt.md`.
7. Register the wrappers in `_bmad/lens-work/module.yaml`.
8. Add wrapper rows to `_bmad/lens-work/module-help.csv`.
9. Add wrapper rows to `_bmad/lens-work/lens-work-setup/assets/module-help.csv`.
10. Add preflight caller classifications for all `lens-auspex-*` callers.
11. Update `agents/lens.agent.md` and README docs to describe Auspex as preferred.
12. Ignore personal config and generated output:

```gitignore
_bmad/config.user.yaml
_bmad/config.user.toml
_bmad-output/
```

Do not copy personal config from another workspace.

## Maintaining Or Adding A New Auspex Wrapper

When adding another Auspex workflow, add all of these pieces together:

| File or location | Required change |
| --- | --- |
| `.agents/skills/ausx-new-workflow/SKILL.md` | BMad module implementation or imported module skill. |
| `_bmad/lens-work/skills/lens-auspex-new-workflow/SKILL.md` | Thin Lens wrapper with preflight, context, constitution, scope, and delegation. |
| `_bmad/lens-work/prompts/lens-auspex-new-workflow.prompt.md` | Release prompt that loads the wrapper. |
| `.github/prompts/lens-auspex-new-workflow.prompt.md` | Public prompt stub using installed `lens.core/` paths. |
| `_bmad/lens-work/module.yaml` | Prompt and skill registration. |
| `_bmad/lens-work/module-help.csv` | Help row for discovery. |
| `_bmad/lens-work/lens-work-setup/assets/module-help.csv` | Setup asset help row. |
| `lens-preflight/scripts/preflight.py` | Explicit caller classification. |
| tests | Registry and contract coverage. |

The wrapper should stay orchestration-only. It should not duplicate the BMad module skill's analysis or authoring logic.

## Choosing Between Legacy And Auspex Commands

| Need | Preferred command |
| --- | --- |
| Register a new governance domain | `lens-new-domain` |
| Register a new governance service | `lens-new-service` |
| Initialize a Lens feature | `lens-new-feature` |
| Decide whether service/domain/program topology should change | `lens-auspex-topology-design` |
| Check whether features and ledgers are consistent | `lens-auspex-map-audit` |
| Move completed feature knowledge into current ledgers | `lens-auspex-ledger-promotion` |
| Review downstream discoveries that affect upstream truth | `lens-auspex-salmon-impact` |
| Generate stakeholder reporting artifacts | `lens-auspex-reporting-snapshot` |
| Maintain future UI data shape | `lens-auspex-reporting-ui` |

Use legacy commands for governance scaffolding. Use Auspex for cumulative knowledge and reporting.

## Boundaries

Auspex integration must respect these boundaries:

- Do not write to release clone surfaces such as `NextLensV3.Release`.
- Do not hand-edit governance feature folders or governance docs mirrors.
- Do not treat generated reports as source truth.
- Do not move feature archives when topology changes.
- Do not write ledger updates without explicit apply intent.
- Do not introduce a deployable reporting UI inside `lens.core.src`.

## Validation

Focused validation should cover:

```text
uv run --with pytest --with pyyaml pytest _bmad/lens-work/scripts/tests/test-auspex-surface.py -q
uv run --with pytest --with pyyaml pytest .agents/skills/ausx-setup/scripts/tests -q
uv run --with pytest --with pyyaml pytest _bmad/lens-work/scripts/tests/test-module-prompt-registry.py _bmad/lens-work/scripts/tests/test-module-surface-uniqueness.py -q
```

Full target validation is still useful, but failures outside the Auspex surface should be triaged separately from integration regressions.

