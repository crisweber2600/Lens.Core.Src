# Auspex Architecture

## Executive Summary

Auspex formalizes the preferred Lens workflow for organic, multi-feature, team-scale knowledge work. It keeps existing domain, service, and feature lifecycle commands available, but recommends Auspex when a project needs cumulative knowledge, topology evolution, ledgers, derived maps, Salmon impact review, audits, or stakeholder reporting.

The architecture is the Two-Tree Model with Derived Map:

- `docs/features/` is the permanent feature archive.
- `docs/<landscape>/` holds reorganizable service, domain, and program ledgers.
- The governance map is a derived projection rebuilt from frontmatter.
- Salmon handles upstream-impact discoveries through recursive consistency review.

Features are immutable facts. The landscape is a living interpretation. The map is a cache.

## Problem Statement

The older domain/service/feature hierarchy works for one-shot delivery, but breaks down when work evolves organically:

- features depend on sibling or predecessor feature decisions
- service truth becomes scattered across feature folders
- branch-isolated planning artifacts create pocket universes
- humans must reconstruct current truth from historical work
- teams outgrow memory-based navigation

Auspex separates feature-time evidence from durable current-state knowledge so both humans and tooling have a stable place to look.

## Architecture Principles

| Principle | Meaning |
| --- | --- |
| Human-first consolidation | Current truth must have a stable readable home. |
| Machine-derived projection | Indexes and graphs are projections, not source truth. |
| Stable identity over mutable location | IDs are canonical; landscape paths may change. |
| Promotable topology | Projects can grow from feature to service, domain, or program without moving feature archives. |
| Features contribute | Feature artifacts record work, but durable truth is promoted upward. |
| Upstream impact is first-class | Downstream discoveries can challenge service, domain, or program assumptions. |
| Present operating model first | Metadata state replaces branch isolation for planning artifacts. |

## Two-Tree Model

### Feature Archive

Feature archives live permanently under `docs/features/`.

```text
docs/
  features/
    auspex/
    widget-1.0/
    widget-1.1/
    widget-ui/
```

Feature archive characteristics:

- flat or shallow by feature ID
- never reorganized after creation
- contains WIP notes, decisions, generated artifacts, and closeout evidence
- frontmatter is source truth for feature identity and attachment

### Landscape

The landscape holds current service, domain, and program ledgers.

```text
docs/
  widget-api/
    service.yaml
    ledger/

  widget-platform/
    domain.yaml
    ledger/
    widget-api/
      service.yaml
      ledger/

  enterprise-suite/
    program.yaml
    ledger/
    widget-platform/
      domain.yaml
      ledger/
      widget-api/
        service.yaml
        ledger/
```

Landscape characteristics:

- reorganizable over time
- contains ledgers and entity metadata, not feature content
- supports optional depth: service only, domain/service, or program/domain/service
- is the first place humans read for current truth

## Entity Model

Auspex recognizes four entity kinds:

| Kind | Role | Durability |
| --- | --- | --- |
| Feature | Unit of work and local artifact production | Permanent archive |
| Service | Accumulated technical truth across related features | Living ledger |
| Domain | Cross-service capability and user journey layer | Living ledger |
| Program | Cross-domain assembly into a product or portfolio | Living ledger |

These layers are additive. A small feature can later gain a service, domain, or program parent without relocating the feature archive.

## Metadata Examples

Feature metadata:

```yaml
featureId: widget-1.1
kind: feature
status: active
belongs_to:
  service: widget-api
  domain: null
  program: null
docs_path: docs/features/widget-1.1
promotion_status: pending
```

Service metadata:

```yaml
id: widget-api
kind: service
belongs_to:
  domain: widget-platform
  program: enterprise-suite
features:
  - widget-1.0
  - widget-1.1
ledger_path: docs/enterprise-suite/widget-platform/widget-api/ledger
```

The stable ID remains unchanged when the landscape path changes.

## Derived Map

The governance map is not hand-authored truth. It is rebuilt from feature and landscape metadata.

Projection rebuild behavior:

1. Scan feature and landscape frontmatter.
2. Reconstruct the ID-to-path index.
3. Reconstruct parent-child ownership graph.
4. Cross-validate declarations in both directions.
5. Report orphans, broken links, and inconsistencies.
6. Rebuild the projection target.

If the projection store drifts or is lost, Lens should rebuild it from source files.

## Doctor And Audit Behavior

`lens-auspex-map-audit` is the lightweight doctor path for Auspex topology. It should detect:

- orphaned features
- broken `belongs_to` references
- service/domain/program parent-child mismatches
- missing or empty ledgers
- completed features not promoted into the living landscape
- stale reports beyond the freshness threshold
- derived map rebuild blockers

Findings should be classified as blocking or advisory.

## Salmon Workflow

Salmon handles upstream-impact discoveries.

Behavior:

- a feature raises an upstream-impact signal
- the signal is advisory by default
- recursive review traverses upward to service, domain, and program assumptions
- recursive review traverses downward to affected siblings and ledgers
- blocking status comes from discovered inconsistency, not from the act of signaling

`lens-auspex-salmon-impact` owns this review workflow.

## Lens Wrapper Surface

Lens exposes Auspex through these preferred wrappers:

| Wrapper | Delegates to | Purpose |
| --- | --- | --- |
| `lens-auspex-setup` | `ausx-setup` | Configure module config, help, and output paths. |
| `lens-auspex-map-audit` | `ausx-map-audit` | Audit stable IDs, parent refs, ledgers, and projection readiness. |
| `lens-auspex-ledger-promotion` | `ausx-ledger-promotion` | Promote completed feature knowledge into living ledgers. |
| `lens-auspex-salmon-impact` | `ausx-salmon-impact` | Review upstream-impact signals. |
| `lens-auspex-topology-design` | `ausx-topology-design` | Design or update Two-Tree topology. |
| `lens-auspex-reporting-snapshot` | `ausx-reporting-snapshot` | Generate stakeholder snapshot JSON and Markdown. |
| `lens-auspex-reporting-ui` | snapshot plus contract docs | Maintain MVP1 read-only UI contract. |

Every wrapper must run Lens preflight, resolve feature context, load constitution gates, enforce write scope, and then delegate.

## Rollout Strategy

Minimum viable rollout:

1. Add stable IDs and `belongs_to` metadata.
2. Add projection rebuild and audit workflows.
3. Use `docs/features/` for new feature archives.
4. Pilot one living ledger.
5. Add lightweight doctor behavior.
6. Introduce Salmon recursive review.
7. Expand to domain and program ledgers only when warranted.

