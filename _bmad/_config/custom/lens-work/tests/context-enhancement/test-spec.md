# Context Enhancement Test Specification

## Test Matrix

### T01: Path Resolver — New Initiative
- **Input**: Initiative with `docs.path: "docs/BMAD/LENS/BMAD.Lens/test-123"`
- **Expected**: `docs_path = "docs/BMAD/LENS/BMAD.Lens/test-123"`, `repo_docs_path = "docs/BMAD/LENS/BMAD.Lens"`
- **Workflows**: All 6

### T02: Path Resolver — Legacy Initiative (No docs block)
- **Input**: Initiative WITHOUT `docs` block
- **Expected**: `docs_path = "_bmad-output/planning-artifacts/"`, `repo_docs_path = null`
- **Expected Warning**: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
- **Workflows**: All 6

### T03: Context Loader — Spec Workflow
- **Input**: Initiative with docs.path, product-brief.md exists at docs_path
- **Expected**: product_brief loaded from `${docs_path}/product-brief.md`
- **Failure Case**: product_brief missing → FAIL with path in error message

### T04: Context Loader — Plan Workflow
- **Input**: Initiative with docs.path, all 3 required artifacts exist
- **Expected**: product_brief, prd, architecture loaded from `${docs_path}/`
- **Failure Case**: Any artifact missing → FAIL with specific file path

### T05: Context Loader — Dev Workflow (Read-Only)
- **Input**: Initiative with docs.path
- **Expected**: architecture.md and stories.md loaded as read-only context
- **Expected**: No output written to docs_path from dev workflow

### T06: Cross-References — Plan Workflow
- **Input**: Fully populated docs_path
- **Expected**: All BMM invocations receive correct `${docs_path}/` output_path
- **Expected**: Commit includes all files under `${docs_path}/`

### T07: Review Workflow — Reviews Subdirectory
- **Input**: Initiative with docs.path
- **Expected**: Review outputs go to `${docs_path}/reviews/`
- **Expected**: `${docs_path}/reviews/` directory created automatically

### T08: Batch Process — Phase-Aware Paths
- **Input**: Initiative at various phases
- **Expected Phase 1-3**: output_root = `${docs_path}/`
- **Expected Phase 4**: output_root = `_bmad-output/implementation-artifacts/`

### T09: Migration Script — Full Migration
- **Input**: Legacy initiative with artifacts in `_bmad-output/planning-artifacts/`
- **Expected**: All artifacts copied to new docs_path location
- **Expected**: Initiative config updated with docs block
- **Expected**: Legacy copies preserved (no delete)

### T10: Migration Script — Dry Run
- **Input**: Same as T09, with -DryRun flag
- **Expected**: No files moved, no config changed
- **Expected**: Migration plan displayed

### T11: Migration Script — Already Migrated
- **Input**: Initiative with existing docs.path
- **Expected**: Warning that docs.path already configured
- **Expected**: No changes made

### T12: Artifact Validator — Path-Aware
- **Input**: Artifact at docs_path
- **Expected**: Status "OK", path is docs_path location
- **Input**: Artifact only at legacy path
- **Expected**: Status "LEGACY", deprecation warning emitted
- **Input**: Artifact missing everywhere
- **Expected**: Status "MISSING"

## Regression Tests

### R01: State File Paths Unchanged
- **Verify**: `_bmad-output/lens-work/state.yaml` path never changed
- **Verify**: `_bmad-output/lens-work/event-log.jsonl` path never changed

### R02: Implementation Artifacts Unchanged
- **Verify**: Dev workflow still writes to `_bmad-output/implementation-artifacts/`
- **Verify**: Dev stories still read from `_bmad-output/implementation-artifacts/`

### R03: Existing Initiatives Unaffected
- **Verify**: Initiatives without docs block still work via fallback
- **Verify**: No regression in existing workflow behavior
