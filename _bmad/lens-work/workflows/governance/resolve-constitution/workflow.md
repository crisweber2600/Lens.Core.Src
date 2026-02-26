---
name: resolve-constitution
description: Resolve accumulated constitutional rules for current LENS context
agent: "@lens/constitution"
trigger: /resolve command
category: governance
phase: N/A
imports: lifecycle.yaml
skill: constitution
---

# Resolve Constitution Workflow — Governance

Walk the LENS inheritance chain and merge constitutional articles parent-first.

> **Implementation note:** All path resolution, file parsing, hierarchy loading,
> and governance merging is performed by the **constitution skill**
> (`_bmad/lens-work/skills/constitution.md`). Do NOT call
> `lib/constitution.js` or any Node.js lib files.

## Role

You are the **constitutional guardian**, presenting the constitutional heritage of
the current context using the constitution skill.

---

## Step 0: Git Discipline — Verify Clean State

Invoke git-orchestration skill to verify clean git state.

```
git-orchestration.verify-clean-state
```

---

## Step 1: Load Context

Determine the current LENS context using this priority:

1. **Active initiative** (primary — handles 95%+ of cases):
   - Load `_bmad-output/lens-work/initiatives/{active_id}.yaml`
   - Extract: `org` (optional), `domain`, `service`, `layer`, `name`, `repo` (optional)
   - Also extract: `track` (for track-aware resolution)

2. **Branch pattern** (fallback):
   - If current branch matches `{initiative_root}-{audience}-{phase_name}-{workflow}` (named phases):
     parse initiative_root, load initiative by ID, recurse with loaded context
   - Legacy support: also match `{featureBranchRoot}-{audience}-p{N}-{workflow}`

3. **User input** (last resort):
   - Prompt: "Which layer? [org/domain/service/repo]"
   - Prompt: "Name for this layer?"

---

## Step 2: Build Inheritance Chain

**Use constitution skill — Part 3 (Hierarchy Loading):**

Walk layers in order `[org, domain, service, repo]` per lifecycle.yaml
`lens_hierarchy.levels` and `constitution.resolution_order`.

For each layer, apply skill Part 1 (Path Resolution) to build the path, then:
- Skip if required context variables are absent
- Skip silently if file does not exist at that path
- Parse per skill Part 2 if file exists
- Detect cycles: skip any path already visited in this chain

**Legacy layer name mapping:**

| Legacy name | Maps to |
|-------------|---------|
| `microservice` | `repo` |
| `feature` | `repo` |

If the context's `layer` field uses a legacy name, map it before building the chain.

### Track-Aware Resolution

After building the chain, collect governance using constitution skill **Part 4 (Merging)**:

- `permitted_tracks` — INTERSECTION across all layers (most restrictive wins)
- `required_gates` — UNION across all layers (all gates accumulate)
- `additional_review_participants` — UNION per phase (additive)

Start `resolved` with:
```
permitted_tracks: null    (null = unrestricted)
required_gates: []
additional_review_participants: {}
layers_loaded: []
```

For each found constitution in the chain, apply the merge rules from skill Part 4.

If no constitutions found at any layer → return empty chain; all gates pass by default.

### Note on Constitution Validation:

> ⚠️ `permitted_tracks: []` (empty array) = NO tracks permitted.
> `permitted_tracks: null` or absent = no restriction (all tracks permitted).
> Treat these cases differently per skill Part 4 merge rules.

---

## Step 3: Walk Chain and Collect Articles

**Use constitution skill — Part 1 (Path Resolution) + Part 2 (Parsing):**

For each level in the hierarchy chain from Step 2:

1. Build path using skill Part 1 rules based on `{level.layer}` and context variables
2. Guard against circular references (Part 3b — Cycle Detection):
   - If this path already visited → log warning, skip
3. If file exists:
   - Parse per skill Part 2: extract frontmatter, YAML blocks, governance config
   - Extract articles with titles, rules, rationales from markdown body
   - Check for contradictions with already-collected articles
4. If file does not exist:
   - Skip silently (missing layers are not an error — see skill Part 9 Edge Cases)

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

### Track & Gate Summary

After article display, show accumulated track/gate governance:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Track & Gate Governance (accumulated)

Permitted Tracks: {permitted_tracks or "all (no restrictions)"}
Required Gates: {required_gates or "none (track defaults apply)"}
Additional Review Participants:
{for each review_type in additional_participants:}
  {review_type}: {participants}
{or "none"}

Track Validation: {initiative.track} → {"✅ permitted" or "❌ NOT PERMITTED by {restricting_layer}"}
```

**If no constitutions found at any layer:**
```
📜 No constitutional rules defined for this context.

This is expected if governance has not been configured for this scope.
```

---

## Step 5: Event Logging

Log resolution event:

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
- Return to @lens → exit
```
