# Step 1: Resolve Constitutional Context

Build the constitutional context from the inheritance chain.

---

## Get LENS Context

**Read from session:**
```yaml
current_layer: {from Compass}
layer_path: {from Compass}
project_root: {from config}
constitution_root: {default: _bmad-output/lens-work/constitutions}
```

---

## Initialize Context

```yaml
constitutional_context:
  resolved_constitution: null
  constitution_chain: []
  constitution_article_count: 0
  constitution_last_amended: null
  constitution_depth: 0
```

---

## Walk Inheritance Chain

**Starting from current layer, walk up to Domain:**

```
Layer hierarchy:
- Feature → Microservice → Service → Domain
- Microservice → Service → Domain  
- Service → Domain
- Domain → (root)
```

**For each layer:**
1. Build constitution path: `{constitution_root}/{layer_path}/constitution.md`
2. Check if file exists
3. If exists:
   - Parse constitution metadata
   - Extract articles
   - Add to chain

---

## Parse Constitution File

**Extract from markdown:**

```markdown
# {Layer} Constitution: {Name}

**Inherits From:** {parent_path}
**Version:** {version}
**Ratified:** {date}
**Last Amended:** {date}
```

**Extract articles:**
```markdown
### Article {roman}: {Title}

{Rule text}

**Rationale:** {rationale}
**Evidence Required:** {evidence}
```

**Store as:**
```yaml
constitution:
  name: {name}
  layer: {layer_type}
  version: {version}
  ratified: {date}
  amended: {date}
  path: {file_path}
  articles:
    - id: "{roman}"
      title: "{title}"
      rule: "{rule_text}"
      rationale: "{rationale}"
      evidence: "{evidence}"
```

---

## Merge Articles

**Order:** Domain (first) → Feature (last)

**Algorithm:**
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

## Build Output

**Assemble final context:**

```yaml
constitutional_context:
  resolved_constitution:
    summary: "{all_articles.length} articles from {chain.length} constitution(s)"
    articles: {all_articles}
    total_count: {all_articles.length}
    sources: {sources}
  
  constitution_chain: {chain.map(c => c.path)}
  
  constitution_article_count: {all_articles.length}
  
  constitution_last_amended: {max(chain.map(c => c.amended))}
  
  constitution_depth: {chain.length}
```

---

## Handle No Constitution

**If chain is empty:**
```yaml
constitutional_context:
  resolved_constitution: null
  constitution_chain: []
  constitution_article_count: 0
  constitution_last_amended: null
  constitution_depth: 0
  status: "no_constitution"
```

---

## Output

**Return:** `constitutional_context`

This context is merged into `lens_context` for use by governance-aware workflows.
