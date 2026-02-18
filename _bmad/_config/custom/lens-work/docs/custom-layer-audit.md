# Custom Layer Audit — Context Enhancement

## Purpose
Documents custom layer files that may need updating after context enhancement changes.

## Audit Date
2026-02-08

## Audit Results

### Custom Layer Structure
The custom layer at `_bmad/_config/custom/lens-work/` mirrors the source module structure:

```
_bmad/_config/custom/lens-work/
├── workflows/
│   ├── router/
│   │   ├── pre-plan/workflow.md    ← Contains hardcoded paths
│   │   ├── spec/workflow.md        ← Contains hardcoded paths
│   │   ├── plan/workflow.md        ← Contains hardcoded paths
│   │   ├── review/workflow.md      ← Contains hardcoded paths
│   │   ├── dev/workflow.md         ← Contains hardcoded paths
│   │   └── init-initiative/
│   ├── utility/
│   │   └── batch-process/workflow.md ← Contains hardcoded paths
│   ├── includes/
│   │   ├── artifact-validator.md   ← Contains hardcoded paths
│   │   ├── docs-path.md            ← Contains hardcoded paths
│   │   ├── gate-event-template.md
│   │   ├── jira-integration.md
│   │   ├── lane-topology.md
│   │   ├── pr-links.md
│   │   └── size-topology.md
│   ├── core/
│   ├── discovery/
│   └── governance/
```

### Files with Hardcoded `_bmad-output/planning-artifacts/` References

| File | Match Count | Severity |
|------|-------------|----------|
| `workflows/router/spec/workflow.md` | 10+ | HIGH — Input/output paths for PRD, UX Design, Architecture |
| `workflows/router/plan/workflow.md` | 18+ | HIGH — Input/output paths for epics, stories, architecture |
| `workflows/router/review/workflow.md` | 12+ | HIGH — Artifact loading and validation paths |
| `workflows/router/pre-plan/workflow.md` | 4+ | HIGH — Output path for product brief, brainstorm notes |
| `workflows/router/dev/workflow.md` | 4+ | MEDIUM — Read-only context paths for stories, epics |
| `workflows/utility/batch-process/workflow.md` | 9+ | HIGH — Phase-aware output routing |
| `workflows/includes/artifact-validator.md` | Many | HIGH — Validation schemas use hardcoded paths |
| `workflows/includes/docs-path.md` | Many | MEDIUM — Directory structure documentation |

### Files WITHOUT Hardcoded References (No Changes Needed)

| File | Notes |
|------|-------|
| `workflows/includes/gate-event-template.md` | Uses event format, no artifact paths |
| `workflows/includes/jira-integration.md` | Uses initiative metadata, not artifact paths |
| `workflows/includes/lane-topology.md` | Branch naming, no artifact paths |
| `workflows/includes/pr-links.md` | PR URLs, no artifact paths |
| `workflows/includes/size-topology.md` | Size categories, no artifact paths |

## Guidance for Custom Layer Users
If you have custom workflow overrides in `_bmad/_config/custom/lens-work/workflows/`,
you should update any hardcoded `_bmad-output/planning-artifacts/` references to use
the path resolver pattern from the base workflows.

### Before (Legacy)
```yaml
output_path: "_bmad-output/planning-artifacts/"
```

### After (Context Enhanced)
```yaml
# Use initiative docs path (resolved by path resolver)
output_path: "${docs_path}/"
```

### Migration Steps for Custom Layer
1. Compare your custom workflow against the updated base workflow
2. Add the path resolver block (Step 0.5) if missing
3. Replace all hardcoded `_bmad-output/planning-artifacts/` with `${docs_path}/`
4. Keep `_bmad-output/implementation-artifacts/` unchanged (P4 artifacts don't move)
5. Test with both new and legacy initiatives

## Fallback Handler Pattern for Custom Layers
Custom layer workflow overrides MUST include the fallback handler to maintain
backward compatibility:

```pseudocode
# In custom workflow override — Path Resolver (add as Step 0.5)
if initiative.docs and initiative.docs.path:
  docs_path = initiative.docs.path
  repo_docs_path = dirname(docs_path)  # e.g., "docs/BMAD/LENS/BMAD.Lens"
else:
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration. Run /compass migrate <id>"
```

Without this fallback, custom workflows will break for initiatives created
before the context enhancement feature.

### Example: Custom Spec Workflow Override

```markdown
## Step 0.5 — Path Resolver (REQUIRED)
<!-- Include path resolver from base workflow -->

RESOLVE docs_path:
  IF initiative config contains `docs.path`:
    SET docs_path = initiative.docs.path
  ELSE:
    SET docs_path = "_bmad-output/planning-artifacts/"
    EMIT WARNING: "⚠️ DEPRECATED: Run /compass migrate to enable docs-path routing"

## Step 1 — Load Context
  product_brief: "${docs_path}/product-brief.md"   # ← Uses resolved path
  output_path: "${docs_path}/"                      # ← Uses resolved path
```

## Files to Check
- Any custom workflow override for: pre-plan, spec, plan, review, dev, batch-process
- Any custom include overrides for: docs-path.md, artifact-validator.md
