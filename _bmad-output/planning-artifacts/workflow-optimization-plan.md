# Workflow Optimization Plan
**Status:** Approved for Implementation  
**Created:** 2025  
**Scope:** All lens-work workflows except auto-advance

---

## Problem Summary

After deep audit of all phase routers, utility workflows, and the init-initiative router, **three major duplication patterns** and **one sequential bottleneck** were identified. These cause unnecessary instruction volume for the LLM, inflate the number of tool calls per command, and make maintenance brittle (changes must be replicated across 7+ files).

---

## Pattern Inventory

### Pattern A — Identical Pre-Flight Block (7 files)

Found verbatim in every phase router:

```yaml
invoke: git-orchestration.verify-clean-state
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
lifecycle = load("lifecycle.yaml")
size = initiative.size
domain_prefix = initiative.domain_prefix
```

**Affected files:**
1. `_bmad/_config/custom/lens-work/workflows/router/pre-plan/workflow.md`
2. `_bmad/_config/custom/lens-work/workflows/router/spec/workflow.md` (businessplan)
3. `_bmad/_config/custom/lens-work/workflows/router/tech-plan/workflow.md`
4. `_bmad/_config/custom/lens-work/workflows/router/plan/workflow.md` (devproposal)
5. `_bmad/_config/custom/lens-work/workflows/router/sprintplan/workflow.md`
6. `_bmad/_config/custom/lens-work/workflows/router/dev/workflow.md`
7. `_bmad/_config/custom/lens-work/workflows/router/story-gen/workflow.md`

**Cost:** ~12–18 lines per file × 7 files = **~112 redundant instruction lines per invocation set**.

---

### Pattern B — Identical Docs-Path Resolver (6 files)

Found in businessplan, techplan, devproposal, sprintplan, dev, preplan:

```yaml
docs_path = initiative.docs.path
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"
if docs_path == null or docs_path == "":
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
  warning: "  → Run: /lens migrate <initiative-id> to add docs.path"
  warning: "  → This fallback will be removed in a future version."
output_path = docs_path
ensure_directory(output_path)
```

**Cost:** ~10 lines × 6 files = **~60 redundant instruction lines**.

---

### Pattern C — Two-File State Load with Legacy Fallback (3 files)

Found identically in `switch`, `status`, and `next` utility workflows:

```yaml
state = load("_bmad-output/lens-work/state.yaml")
if state == null: [no active context exit]
if state.active_initiative != null:
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  if initiative == null: error + hint
else if state.initiative != null:
  initiative = state.initiative  # legacy
  legacy_warning: true
else: [no initiative in state exit]
```

**Cost:** ~15 lines × 3 files = **~45 redundant instruction lines**.

---

### Pattern D — Sequential Context Loading in init-initiative (1 file)

In `init-initiative/workflow.md`, Steps 0a, 0b, and 0c run **sequentially** even though:
- **0a** scans domain YAMLs (filesystem probe)
- **0b** scans service/domain YAMLs (filesystem probe)
- **0c** loads `profile.yaml` (filesystem probe — independent of 0a/0b)

These can be **parallelized** into a single step.

---

## Implementation Plan

### Phase 1 — Shared Fragments (Highest Impact, No Behavior Change)

Create reusable include fragments. All phase routers reference the fragment instead of repeating the block.

#### 1.1 Create `shared/preflight.fragment.md`

**File:** `_bmad/lens-work/workflows/shared/preflight.fragment.md`

```yaml
# SHARED: Standard Phase Pre-Flight
# Include with: invoke: shared.preflight
# Post-conditions: state, initiative, lifecycle, size, domain_prefix, initiative_root all populated

invoke: git-orchestration.verify-clean-state

state = load("_bmad-output/lens-work/state.yaml")
if state == null or state.active_initiative == null:
  error: "No active initiative. Run /new-domain, /new-service, or /new-feature first."
  exit: 1

initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
if initiative == null:
  error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
  hint: "Run @lens migrate or check initiatives/ directory."
  exit: 1

lifecycle = load("_bmad/lens-work/lifecycle.yaml")

# Common initiative fields (always available after this block)
size = initiative.size
domain_prefix = initiative.domain_prefix
initiative_root = initiative.initiative_root
```

**Replace in:** pre-plan, spec (businessplan), tech-plan, plan (devproposal), sprintplan, dev, story-gen

---

#### 1.2 Create `shared/resolve-docs-path.fragment.md`

**File:** `_bmad/lens-work/workflows/shared/resolve-docs-path.fragment.md`

```yaml
# SHARED: Standard Docs-Path Resolver
# Include with: invoke: shared.resolve-docs-path
# Pre-conditions: initiative populated (run shared.preflight first)
# Post-conditions: docs_path, repo_docs_path, output_path set; output directory created

docs_path = initiative.docs.path
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  docs_path = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative missing docs.path configuration."
  warning: "  → Run: /lens migrate <initiative-id> to add docs.path"

output_path = docs_path
ensure_directory(output_path)
```

**Replace in:** pre-plan, spec, tech-plan, plan, dev (read-only note), sprintplan

---

#### 1.3 Create `shared/load-state.fragment.md`

**File:** `_bmad/lens-work/workflows/shared/load-state.fragment.md`

```yaml
# SHARED: Two-File State Load with Legacy Fallback
# Include with: invoke: shared.load-state
# Post-conditions: state, initiative populated; legacy_warning set if applicable

state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  output: |
    📍 No active context found. Run /new-domain, /new-service, or /new-feature to start.
  exit: 0

if state.active_initiative != null:
  # Current two-file format
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  if initiative == null:
    error: "Initiative config not found: initiatives/${state.active_initiative}.yaml"
    hint: "Run @lens migrate or check initiatives/ directory."
    exit: 1
  legacy_warning: false
else if state.initiative != null:
  # Legacy single-file format
  initiative = state.initiative
  legacy_warning: true
else:
  output: |
    📍 No active initiative in state. Run /new-domain, /new-service, or /new-feature.
  exit: 0
```

**Replace in:** switch/workflow.md, status/workflow.md, next/workflow.md

---

### Phase 2 — Parallel Loading in init-initiative

**File:** `_bmad/_config/custom/lens-work/workflows/router/init-initiative/workflow.md`

**Change:** Collapse Steps 0a, 0b, and 0c into a single `### 0a–c. Parallel Context Load` step.

**Before (sequential, 3 separate steps):**
- Step 0a: Load domain config
- Step 0b: Load feature parent config  
- Step 0c: Load user profile preferences

**After (parallel, 1 combined step):**

```yaml
### 0a–c. Parallel Context Load

# Concurrently execute all three probes before merging results:
parallel:
  - load_profile:
      path: "_bmad-output/lens-work/personal/profile.yaml"
      store: profile_raw

  - scan_domains:
      glob: "_bmad-output/lens-work/initiatives/*/Domain.yaml"
      store: domain_yaml_files

  - scan_services:   # only used for feature-layer
      glob: "_bmad-output/lens-work/initiatives/*/*/Service.yaml"
      store: service_yaml_files

# Merge results — same resolution logic as before but inputs already loaded
```

**Expected savings:** Reduces 3 sequential filesystem probes to 1 parallel batch. For `/new-feature` with multiple parent candidates, this is most visible.

---

### Phase 3 — Fast-Path Convention for Utility Commands

Add a **fast-path header** to `status`, `next`, and `switch` to skip legacy branch and overhead checks when the two-file format is confirmed.

**Convention to add to each:**

```yaml
# FAST PATH: If state.active_initiative is non-null, skip legacy checks entirely.
# The two-file architecture is confirmed; legacy branch is unreachable.
if state.format_version >= 2 or state.active_initiative != null:
  # Jump directly to initiative load — skip legacy detection
  initiative = load("_bmad-output/lens-work/initiatives/${state.active_initiative}.yaml")
  # Continue to main workflow body
  goto: main_execution
```

---

### Phase 4 — Lifecycle Caching Convention

Add to `bmadconfig.yaml`:

```yaml
session_cache:
  - _bmad/lens-work/lifecycle.yaml       # Load once per session; valid for full session
  - _bmad-output/lens-work/state.yaml    # Load once; reload only on explicit state-write
  - _bmad/lens-work/module.yaml          # Immutable per session
```

This tells the agent: if `lifecycle.yaml` is already loaded this session, skip the `load()` call and use the cached value. Applies to all workflows automatically.

---

## File-by-File Implementation Checklist

### Shared Fragments (create new files)

- [ ] `_bmad/lens-work/workflows/shared/preflight.fragment.md` — create
- [ ] `_bmad/lens-work/workflows/shared/resolve-docs-path.fragment.md` — create
- [ ] `_bmad/lens-work/workflows/shared/load-state.fragment.md` — create

### Phase Routers (replace pre-flight + docs-path blocks)

- [ ] `_bmad/_config/custom/lens-work/workflows/router/pre-plan/workflow.md`
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Replace docs-path block → `invoke: shared.resolve-docs-path`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/spec/workflow.md` (businessplan)
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Replace docs-path block → `invoke: shared.resolve-docs-path`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/tech-plan/workflow.md`
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Replace docs-path block (inline at pre-flight) → `invoke: shared.resolve-docs-path`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/plan/workflow.md` (devproposal)
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Replace docs-path block → `invoke: shared.resolve-docs-path`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/sprintplan/workflow.md`
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Replace docs-path block → `invoke: shared.resolve-docs-path`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/dev/workflow.md`
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Keep docs-path note (read-only) → `invoke: shared.resolve-docs-path` with `readonly: true`

- [ ] `_bmad/_config/custom/lens-work/workflows/router/story-gen/workflow.md`
  - Replace Step 0 preflight → `invoke: shared.preflight`
  - Inline docs-path already minimal — add `invoke: shared.resolve-docs-path`

### Utility Workflows (replace state load pattern)

- [ ] `_bmad/lens-work/workflows/utility/status/workflow.md`
  - Replace Step 1 state load → `invoke: shared.load-state`

- [ ] `_bmad/lens-work/workflows/utility/next/workflow.md`
  - Replace Step 1 state load → `invoke: shared.load-state`

- [ ] `_bmad/lens-work/workflows/utility/switch/workflow.md`
  - Replace Step 1 state load → `invoke: shared.load-state`

### init-initiative (parallel loading)

- [ ] `_bmad/_config/custom/lens-work/workflows/router/init-initiative/workflow.md`
  - Collapse Steps 0a + 0b + 0c → single `### 0a–c. Parallel Context Load` step
  - Add `parallel:` directive; preserve all resolution logic

### bmadconfig.yaml (session cache)

- [ ] `_bmad/lens-work/bmadconfig.yaml`
  - Add `session_cache:` block listing lifecycle.yaml, state.yaml, module.yaml

---

## Expected Outcomes

| Metric | Before | After |
|---|---|---|
| Repeated pre-flight instruction lines | ~112 | ~7 (1 invoke each) |
| Repeated docs-path instruction lines | ~60 | ~6 (1 invoke each) |
| Repeated state-load instruction lines | ~45 | ~3 (1 invoke each) |
| init-initiative sequential probes | 3 steps | 1 parallel step |
| Total redundant instructions eliminated | **~220 lines** | **0** |

---

## Non-Goals / Preserved Behaviors

- **Auto-advance** — untouched (user requirement, kept as-is)
- **Error messages** — identical wording preserved in fragments
- **Legacy fallback paths** — preserved in `shared/load-state.fragment.md`
- **Phase-specific logic** — only the _shared boilerplate_ is extracted; all phase-unique steps remain in their respective workflow files
- **Anti-hallucination gates** in init-initiative — untouched

---

## Implementation Order

1. Create 3 shared fragments (no risk — new files)
2. Update utility workflows (status, next, switch) — low traffic, easy rollback
3. Update phase routers one at a time, starting with `pre-plan` (first phase) 
4. Update `init-initiative` parallel loading
5. Update `bmadconfig.yaml` session cache
6. Smoke-test with `/new-feature`, `/switch`, `/status`, `/next`, `/preplan`
