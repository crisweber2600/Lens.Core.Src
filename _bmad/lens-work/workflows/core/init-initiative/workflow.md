---
name: init-initiative
description: "DEPRECATED — Use router/init-initiative instead. Legacy branch topology creation."
agent: casey
trigger: "#new-domain, #new-service, #new-feature via Compass"
category: core
auto_triggered: true
deprecated: true
superseded_by: "router/init-initiative"
---

# Init Initiative Workflow (DEPRECATED)

> **WARNING:** This workflow is deprecated. Use the router version at `workflows/router/init-initiative/workflow.md` instead.
> The router version supports:
> - Two-file state architecture (personal state + shared initiative config)
> - New branch naming: `{Domain}/{InitiativeId}/{size}-{phaseNumber}-{workflow}`
> - Size stored in shared initiative config
> - `large` size (replaces legacy `lead`)
> - All branches pushed to remote immediately

**Purpose:** _Legacy_ — Create the full branch topology for a new initiative in the BMAD control repo.

---

## Input Parameters

```yaml
initiative_name: string    # User-provided name (e.g., "Rate Limiting Feature")
layer: enum                # domain | service | microservice | feature
target_repo: string        # Resolved from service map (e.g., "api-gateway")
```

---

## Execution Sequence

### 1. Generate Initiative ID

```bash
# Format: {sanitized_name}-{random_6char}
# Example: rate-limit-x7k2m9
initiative_id=$(echo "${initiative_name}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-20)-$(openssl rand -hex 3)
```

### 2. Create Base Branch

```bash
# From current HEAD in BMAD control repo
git checkout -b "bmad/${initiative_id}/base"
git push -u origin "bmad/${initiative_id}/base"
```

### 3. Create Size Branches

```bash
# Small team size (planning happens here)
git checkout -b "bmad/${initiative_id}/small"
git push -u origin "bmad/${initiative_id}/small"

# Large review size (created but empty until p2 complete)
git checkout "bmad/${initiative_id}/base"
git checkout -b "bmad/${initiative_id}/large"
git push -u origin "bmad/${initiative_id}/large"
```

### 4. Create Phase 1 Branch

```bash
# Phase 1 (Analysis) from small size
git checkout "bmad/${initiative_id}/small"
git checkout -b "bmad/${initiative_id}/small/p1"
git push -u origin "bmad/${initiative_id}/small/p1"
```

### 5. Initialize State

Write to `_bmad-output/lens-work/state.yaml`:

```yaml
version: 1
initiative:
  id: ${initiative_id}
  name: "${initiative_name}"
  layer: ${layer}
  target_repo: ${target_repo}
  created_at: "${ISO_TIMESTAMP}"

current:
  phase: p1
  phase_name: "Analysis"
  workflow: null
  workflow_status: pending
  size: small

branches:
  base: "bmad/${initiative_id}/base"
  active: "bmad/${initiative_id}/small/p1"

gates: []
blocks: []
```

### 6. Log Event

Append to `_bmad-output/lens-work/event-log.jsonl`:

```json
{"ts":"${ISO_TIMESTAMP}","event":"init-initiative","id":"${initiative_id}","layer":"${layer}","target":"${target_repo}"}
```

### 7. Return Control

Output to Compass:

```
✅ Initiative created: ${initiative_id}
├── Base: bmad/${initiative_id}/base
├── Small: bmad/${initiative_id}/small
├── Large: bmad/${initiative_id}/large
├── Phase: bmad/${initiative_id}/small/p1
└── Ready for /pre-plan
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Branch already exists | Prompt: "Initiative ID collision. Regenerate?" |
| Push failed | Check remote connectivity, retry with backoff |
| State file locked | Wait + retry (max 3 attempts) |

---

## Post-Conditions

- [ ] All 4 branches created and pushed
- [ ] state.yaml initialized
- [ ] event-log.jsonl entry appended
- [ ] Control returned to Compass for /pre-plan routing
