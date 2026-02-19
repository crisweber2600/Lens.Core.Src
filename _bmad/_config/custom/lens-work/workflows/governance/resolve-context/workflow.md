---
name: resolve-context
description: Resolve constitutional context for current LENS layer
agent: scribe
trigger: internal (not user-facing)
category: governance
phase: N/A
---

# Resolve Constitutional Context — Governance

Internal workflow to resolve constitutional governance for the current LENS context. Extends the base LENS context with `constitutional_context` variables.

## Role

You are **Scribe (Cornelius)**, resolving constitutional context for mandatory workflow injection.

---

## Purpose

This workflow is invoked as a **required injection step** by lifecycle routers before running phase logic and by governance workflows that need resolved rules.

**Invoked by:**
- Compass routers: `/pre-plan`, `/spec`, `/plan`, `/review`, `/dev`
- Scribe agent (direct governance operations)
- Compliance-check workflow (to get applicable rules)
- Ancestry workflow (to trace lineage)
- Any workflow that needs constitutional context

---

## Step 1: Get LENS Context

**Read from session:**
```yaml
current_layer: {from active initiative or branch pattern}
layer_path: {path to current layer}
project_root: {project root}
constitution_root: "_bmad-output/lens-work/constitutions"
```

---

## Step 2: Initialize Context

```yaml
constitutional_context:
  resolved_constitution: null
  constitution_chain: []
  constitution_article_count: 0
  constitution_last_amended: null
  constitution_depth: 0
```

---

## Step 3: Build Inheritance Chain

Walk the layer hierarchy from Domain to the current layer:

```
Layer hierarchy:
- Domain → (root)
- Service → Domain
- Microservice → Service → Domain
- Feature → Microservice → Service → Domain
```

**For each layer in the hierarchy:**

1. Build constitution path: `{constitution_root}/{layer}/{name}/constitution.md`
2. Check if file exists
3. If exists:
   - Parse constitution metadata (name, version, ratified date, amended date)
   - Extract articles (id, title, rule, rationale, evidence)
   - Add to chain

---

## Step 4: Merge Articles

**Order:** Domain articles first, then Service, then Microservice, then Feature.

```
all_articles = []
sources = []

FOR constitution IN chain (Domain-first):
  sources.push({
    name: constitution.name,
    layer: constitution.layer,
    articles: constitution.articles.length,
    path: constitution.path
  })

  FOR article IN constitution.articles:
    all_articles.push({
      ...article,
      source: constitution.name,
      source_layer: constitution.layer
    })
```

---

## Step 5: Build Constitutional Context

**Assemble final context:**

```yaml
constitutional_context:
  resolved_constitution:
    summary: "{all_articles.length} articles from {chain.length} constitution(s)"
    articles: {all_articles}
    total_count: {all_articles.length}
    sources:
      - name: {constitution_name}
        layer: {layer_type}
        articles: {count}
        path: {file_path}

  constitution_chain:
    - {domain_constitution_path}
    - {service_constitution_path}
    - {microservice_constitution_path}
    - {feature_constitution_path}

  constitution_article_count: {all_articles.length}

  constitution_last_amended: {most_recent_date from all constitutions}

  constitution_depth: {chain.length}
```

---

## Error Handling

### No Constitution Found

If chain is empty:

```yaml
constitutional_context:
  resolved_constitution: null
  constitution_chain: []
  constitution_article_count: 0
  constitution_last_amended: null
  constitution_depth: 0
  status: "no_constitution"
```

This is NOT an error — return empty context silently.

### Partial Chain (Gaps)

If some layers have constitutions but others don't:
- Include only layers WITH constitutions
- Note gaps in `constitution_chain_gaps`

```yaml
constitutional_context:
  # ... normal fields ...
  constitution_chain_gaps:
    - layer: Service
      expected_path: {path}
      status: "missing"
```

### Parse Error

If a constitution file is malformed:

```yaml
constitutional_context:
  status: "parse_error"
  error_details:
    file: {path}
    error: {message}
```

---

## Output

**Return:** `constitutional_context`

This context is merged into the LENS context for use by requesting workflows.

---

_Internal workflow for lens-work constitutional context resolution_
