---
name: resolve-constitution
description: Resolve accumulated constitutional rules for current LENS context
agent: "@lens/constitution"
trigger: /resolve command
category: governance
phase: N/A
imports: lifecycle.yaml
---

# Resolve Constitution Workflow — Governance

Walk the LENS inheritance chain and merge constitutional articles parent-first.

## Role

You are the **constitution skill**, presenting the constitutional heritage of the current context.

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
   - Parse initiative_root, load initiative by ID, recurse with loaded context
   - Legacy support: also match `{featureBranchRoot}-{audience}-p{N}-{workflow}`

3. **User input** (last resort):
   - Prompt: "Which layer? [org/domain/service/repo]"
   - Prompt: "Name for this layer?"

---

## Step 2: Build Inheritance Chain

Build hierarchy parent-first based on context. Uses lifecycle.yaml `lens_hierarchy.levels: [org, domain, service, repo]` and `constitution.resolution_order: [org, domain, service, repo]`.

```python
# Load lifecycle contract
lifecycle = load("lifecycle.yaml")
resolution_order = lifecycle.constitution.resolution_order  # [org, domain, service, repo]

hierarchy = []
visited = set()  # Cycle detection

# Org is ALWAYS included if it exists (top of chain)
if org:
    hierarchy.append({ layer: "org", name: org })

# Domain is ALWAYS included (required for all initiatives)
hierarchy.append({ layer: "domain", name: domain })

# Service included if context is service or repo
if layer in ["service", "repo"]:
    hierarchy.append({ layer: "service", name: service })

# Repo included if context is repo AND field is set
if layer == "repo" and repo:
    hierarchy.append({ layer: "repo", name: repo })

# Legacy support: map old layer names to new
legacy_layer_map = {
    "microservice": "repo",   # microservice → repo
    "feature": "repo"         # feature → repo (lowest level)
}
if layer in legacy_layer_map:
    effective_layer = legacy_layer_map[layer]
    # Build chain using effective_layer instead
```

### Track-Aware Resolution

After building the chain, also collect track and gate governance:

```python
track = initiative.track  # e.g., "full", "feature", "tech-change"
permitted_tracks = set()    # Intersection across chain
required_gates = set()      # Union across chain
additional_participants = {} # Merge across chain

for level in hierarchy:
    constitution = load_constitution(level)
    if constitution:
        # Track permissions (intersection — most restrictive wins)
        if constitution.permitted_tracks:
            if not permitted_tracks:
                permitted_tracks = set(constitution.permitted_tracks)
            else:
                permitted_tracks = permitted_tracks.intersection(constitution.permitted_tracks)

        # Required gates (union — all additions accumulate)
        if constitution.required_gates:
            required_gates = required_gates.union(constitution.required_gates)

        # Review participants (additive merge)
        if constitution.additional_review_participants:
            for review_type, participants in constitution.additional_review_participants.items():
                if review_type not in additional_participants:
                    additional_participants[review_type] = []
                additional_participants[review_type].extend(participants)
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
