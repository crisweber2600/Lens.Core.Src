---
name: shared.resolve-docs-path
description: "Resolve docs_path, repo_docs_path, and output_path from initiative config"
include_as: invoke
---

# SHARED: Docs-Path Resolver

**Include with:** `invoke: shared.resolve-docs-path`

**Pre-conditions:** `initiative` must be populated (run `invoke: shared.preflight` first).

**Post-conditions:** `docs_path`, `repo_docs_path`, and `output_path` are set. Output directory is created. Deprecation warning emitted if initiative is missing `docs.path`.

**Optional parameter:** Pass `readonly: true` if the calling phase only reads from `docs_path` and does not write output artifacts (e.g., `/dev` phase).

---

```yaml
# Resolve primary docs path from initiative config
docs_path      = initiative.docs.path
repo_docs_path = "docs/${initiative.docs.domain}/${initiative.docs.service}/${initiative.docs.repo}"

if docs_path == null or docs_path == "":
  # Legacy fallback for initiatives created before docs.path was required
  docs_path      = "_bmad-output/planning-artifacts/"
  repo_docs_path = null
  warning: "⚠️ DEPRECATED: Initiative '${initiative.id}' is missing docs.path configuration."
  warning: "  → Run: /lens migrate ${initiative.id}  to add docs.path"
  warning: "  → This fallback will be removed in a future release."

# Canonical output path for this phase's artifacts
output_path = docs_path

# Create output directory unless called in read-only mode
if readonly != true:
  ensure_directory(output_path)
```

---

**Note:** This fragment replaces the docs-path resolution block that previously appeared verbatim in every phase router workflow (`=== Path Resolver (S01-S06: Context Enhancement) ===`). Phase-specific artifact loading (e.g., `product_brief`, `prd`, `architecture`) continues immediately after this invoke using the resolved `docs_path` and `repo_docs_path`.
