# Auspex MVP1 Reporting UI Contract

## Summary

Auspex MVP1 reporting is a Lens-side, read-only data contract and snapshot foundation for a future stakeholder UI. This repo does not ship a deployable Kubernetes UI app. It defines the data shape, generation workflow, and source contracts that a later app target can consume.

## Product Intent

Auspex reporting gives Product Owners, Scrum Masters, leaders, and developers a self-service view of delivery status without requiring direct repository access.

MVP1 goals:

- show project, topology, and feature health
- render links to source artifacts with traceability
- surface freshness and source failures
- preserve read-only access semantics
- provide a stable JSON contract for future UI ingestion

## Non-Goals

- artifact authoring
- write-back to governance or feature archives
- replacing Lens lifecycle orchestration
- deploying an application from `lens.core.src`
- cross-pod enterprise federation

## Source Inputs

The reporting workflow reads:

- feature archives under `docs/features/`
- landscape metadata and ledgers under `docs/`
- recent map audit reports
- recent ledger promotion reports
- recent Salmon impact reports
- recent topology decision reports
- Lens feature metadata when available through approved governance context

Snapshots are generated views. They are not source truth.

## Output Location

Default output:

```text
_bmad-output/auspex/
  snapshot-{date}.md
  snapshot-{date}.json
```

The output path is configured by `ausx.reporting_output_path` in `_bmad/config.yaml`.

## Snapshot JSON Contract

The JSON artifact must include at least these fields:

```json
{
  "module": "ausx",
  "report_type": "reporting_snapshot",
  "created_at": "2026-05-20T00:00:00Z",
  "scope": "lens-dev/new-codebase",
  "overall_status": "YELLOW",
  "blocking": [],
  "advisory": [],
  "features": [],
  "ledgers": [],
  "salmon_impacts": [],
  "freshness": {}
}
```

Recommended expanded fields:

```json
{
  "features": [
    {
      "feature_id": "lens-dev-new-codebase-auspex",
      "title": "auspex",
      "status": "active",
      "phase": "expressplan",
      "owner": "CrisWeber",
      "belongs_to": {
        "service": "new-codebase",
        "domain": "lens-dev",
        "program": null
      },
      "docs_path": "docs/features/auspex",
      "promotion_status": "pending"
    }
  ],
  "ledgers": [
    {
      "id": "new-codebase",
      "kind": "service",
      "ledger_path": "docs/lens-dev/new-codebase/ledger",
      "health": "YELLOW",
      "last_updated": null
    }
  ],
  "freshness": {
    "created_at": "2026-05-20T00:00:00Z",
    "threshold_hours": 24,
    "is_stale": false,
    "source_failures": []
  }
}
```

## UI Read Model

A future UI target should treat the snapshot as a read model with these surfaces:

| View | Required Data |
| --- | --- |
| Project rollup | active features, phase distribution, blockers, advisory count, freshness |
| Feature lifecycle | feature ID, phase, status, owner, timestamps, source links |
| Artifact reader | title, path, artifact type, source repository, renderable Markdown content or link |
| Search and filter | domain, service, feature, phase, owner, status, risk classification |
| Source health | failures, stale inputs, missing artifacts, blocked projection status |

## Freshness

MVP1 freshness threshold is 24 hours by default. If the latest audit, impact review, or snapshot is older than the threshold, the snapshot should remain usable but mark freshness as advisory unless a source failure or blocking inconsistency exists.

## Security And Access

MVP1 assumes viewer-only access. The future UI may authenticate users, but the snapshot contract itself does not grant write permissions and does not require consumers to have direct repository access.

Snapshot generation should preserve source traceability without embedding secrets or uncontrolled repository credentials.

## Lens Workflow

Use these wrappers:

- `lens-auspex-reporting-snapshot` to generate Markdown and JSON snapshots
- `lens-auspex-reporting-ui` to maintain this UI contract and validate that no deployable UI surface is being introduced in `lens.core.src`

Any future deployable UI should be implemented in a dedicated app target repo and should consume this contract rather than writing back to source artifacts.

