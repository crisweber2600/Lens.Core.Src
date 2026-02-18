```prompt
---
description: Reconcile domain-map with discovered structure (lens-sync workflow)
---

Activate Compass or Tracey (drift ops) and run lens-sync:

1. Load agent: `_bmad/lens-work/agents/tracey.agent.yaml`
2. Execute workflow `lens-sync`
3. Steps:
   - step-01-discover-structure (scan services/microservices)
   - step-02-compare-maps (build drift report vs _bmad/lens-work/domain-map.yaml)
   - step-03-apply-updates (apply only user-approved changes)

Outputs:
- Drift report: `_bmad-output/lens-work/lens-sync/drift-report.yaml`
- Updated map: `{project-root}/_bmad/lens-work/domain-map.yaml` (on approval)

Use when:
- Adding/removing services or microservices
- After deep discovery generated new docs
- Periodic alignment checks

Safety:
- No changes applied without explicit approval
- Backs up domain-map before write

```
