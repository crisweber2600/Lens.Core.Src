---
name: resolve-constitution
description: Resolve accumulated constitutional rules for current LENS context
agent: scribe
trigger: /resolve command
category: governance
phase: N/A
---

# Resolve Constitution Workflow — Governance

Walk the LENS inheritance chain and merge constitutional articles parent-first.

## Role

You are **Scribe (Cornelius)**, presenting the constitutional heritage of the current context.

---

## Step 0: Git Discipline — Verify Clean State

Invoke Casey to verify clean git state.

```
casey.verify-clean-state
```

---

## Step 1: Load Context

Determine the current LENS context using this priority:

1. **Active initiative** (primary — handles 95%+ of cases):
   - Load `_bmad-output/lens-work/initiatives/{active_id}.yaml`
   - Extract: `domain`, `service`, `layer`, `name`, `microservice` (optional)

2. **Branch pattern** (fallback):
   - If current branch matches `{featureBranchRoot}-{audience}-p{N}-{workflow}` (flat, hyphen-separated):
   - Parse featureBranchRoot, load initiative by ID, recurse with loaded context

3. **User input** (last resort):
   - Prompt: "Which layer? [domain/service/microservice/feature]"
   - Prompt: "Name for this layer?"

---

## Step 2: Build Inheritance Chain

Build hierarchy parent-first based on context:

```python
hierarchy = []
visited = set()  # Cycle detection

# Domain is ALWAYS included (top of chain)
hierarchy.append({ layer: "domain", name: domain })

# Service included if context is service, microservice, or feature
if layer in ["service", "microservice", "feature"]:
    hierarchy.append({ layer: "service", name: service })

# Microservice included if context is microservice or feature AND field is set
if layer in ["microservice", "feature"] and microservice:
    hierarchy.append({ layer: "microservice", name: microservice })

# Feature included if context is feature
if layer == "feature":
    hierarchy.append({ layer: "feature", name: name })
```

---

## Step 3: Walk Chain and Collect Articles

For each level in the hierarchy:

1. Build path: `_bmad-output/lens-work/constitutions/{level.layer}/{level.name}/constitution.md`
2. Guard against circular references:
   - If `{layer}/{name}` already visited → log warning, skip
3. If file exists:
   - Parse YAML frontmatter and markdown content
   - Extract articles with titles, rules, rationales
   - Check for contradictions with already-collected articles
4. If file does not exist:
   - Skip silently (missing layers are not an error)

**Contradiction Detection:**
For each new article, compare against all parent articles:
- Direct contradiction (opposite rules)
- Scope narrowing that violates parent intent

**Contradiction Resolution (parent wins):**
- Parent article is KEPT in the resolved set
- Child article is EXCLUDED from resolved set
- Both shown in contradictions report with CONFLICT markers
- Compliance checks evaluate against parent article only

---

## Step 4: Display Resolution

```
📜 Resolved Constitution: {context_name}

Context: {layer} — {name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inheritance Chain:
{for each constitution found:}
  {n}. {layer}: {name} ({article_count} articles)
     Ratified: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Governance: {total_articles} articles from {chain_count} constitution(s)

{for each layer with articles:}

## {Layer} Articles ({source}: {name})

{for each article:}
### {id}: {title}
{rule}
Rationale: {rationale}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{if contradictions:}
## Contradictions Detected

{for each contradiction:}
CONFLICT: {child_article} (from {child_layer}) contradicts {parent_article} (from {parent_layer})
Resolution: Parent article prevails. Child article excluded from resolved set.

{endif}

These {total_articles} articles govern all work in this context.
```

**If no constitutions found at any layer:**
```
📜 No constitutional rules defined for this context.

This is expected if governance has not been configured for this scope.
```

---

## Step 5: Event Logging

Log resolution through Tracey:

```yaml
type: constitution-resolved
timestamp: {now}
target_layer: {layer}
layers_walked: {count_of_layers_checked}
total_articles: {total_resolved_articles}
initiative_id: {active_initiative_id or null}
```

---

## Completion

```
Resolution complete.

What's next?
- Check compliance → /compliance
- View ancestry → /ancestry
- Create constitution → /constitution
- Return to Compass → exit
```
