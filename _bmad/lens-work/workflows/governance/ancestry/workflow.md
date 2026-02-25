---
name: ancestry
description: Display constitution inheritance chain with heritage details
agent: scribe
trigger: /ancestry command
category: governance
phase: N/A
---

# Ancestry Workflow — Governance

Display the constitutional heritage of the current LENS context.

## Role

You are **Scribe (Cornelius)**, presenting the heritage with appropriate gravitas.

---

## Step 0: Git Discipline — Verify Clean State

Invoke Casey to verify clean git state.

```
casey.verify-clean-state
```

---

## Step 1: Load Context

Determine the current LENS context using this priority:

1. **Active initiative** (primary):
   - Load `_bmad-output/lens-work/initiatives/{active_id}.yaml`
   - Extract: `org` (optional), `domain`, `service`, `layer`, `name`, `repo` (optional)
   - Also extract: `track` (for track governance display)

2. **Branch pattern** (fallback):
   - If current branch matches `{initiative_root}-{audience}-{phase_name}-{workflow}` (named phases):
   - Parse initiative_root, load initiative by ID, recurse with loaded context
   - Legacy support: also match `{featureBranchRoot}-{audience}-p{N}-{workflow}`

3. **User input** (last resort):
   - Prompt: "Which layer? [org/domain/service/repo]"
   - Prompt: "Name for this layer?"

---

## Step 2: Trace Lineage

Walk the inheritance chain from Org to the current layer (per lifecycle.yaml `constitution.resolution_order: [org, domain, service, repo]`).

**For each layer (Org → Repo):**

1. Build path: `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md`
2. If file exists:
   - Parse metadata: name, version, ratification date, last amended date
   - Count articles
   - Calculate inherited totals (own + parent articles)
3. If file does not exist:
   - Skip silently (missing layers are not an error)

**Build ancestry data:**
```yaml
ancestry:
  depth: {layer_count}
  current: {current_layer_name}
  track: {initiative_track}
  chain:
    - layer: Org
      name: {name}
      version: {version}
      ratified: {date}
      amended: {date}
      local_articles: {count}
      inherited_articles: 0
      total_articles: {count}
      permitted_tracks: {list or null}
      required_gates: {list or null}
    - layer: Domain
      name: {name}
      version: {version}
      ratified: {date}
      amended: {date}
      local_articles: {count}
      inherited_articles: {parent_total}
      total_articles: {sum}
      permitted_tracks: {list or null}
      required_gates: {list or null}
    - layer: Service
      name: {name}
      version: {version}
      ratified: {date}
      amended: {date}
      local_articles: {count}
      inherited_articles: {parent_total}
      total_articles: {sum}
      required_gates: {list or null}
    - layer: Repo
      name: {name}
      version: {version}
      ratified: {date}
      amended: {date}
      local_articles: {count}
      inherited_articles: {parent_total}
      total_articles: {sum}
```

---

## Step 3: Display Heritage

```
📜 Constitution Ancestry: {current_layer_name}

Your Position: {layer_type} at {name}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{if org exists:}
{org_name} Org Constitution (ratified {org_ratified})
├─ {org_articles} articles
├─ Version: {org_version}
├─ Last amended: {org_amended}
├─ Permitted tracks: {org_permitted_tracks or "all"}
├─ Required gates: {org_required_gates or "none"}
│
{endif}
{if domain exists:}
└─ {domain_name} Domain Constitution (ratified {domain_ratified})
   ├─ {domain_local} articles (+{domain_inherited} inherited = {domain_total} total)
   ├─ Version: {domain_version}
   ├─ Last amended: {domain_amended}
   ├─ Permitted tracks: {domain_permitted_tracks or "inherits parent"}
   ├─ Required gates: {domain_required_gates or "none"}
   │
{endif}
{if service exists:}
   └─ {service_name} Service Constitution (ratified {service_ratified})
      ├─ {service_local} articles (+{service_inherited} inherited = {service_total} total)
      ├─ Version: {service_version}
      ├─ Last amended: {service_amended}
      ├─ Required gates: {service_required_gates or "none"}
      │
{endif}
{if repo exists:}
      └─ {repo_name} Repo Constitution (ratified {repo_ratified})
         ├─ {repo_local} articles (+{repo_inherited} inherited = {repo_total} total)
         ├─ Version: {repo_version}
         ├─ Last amended: {repo_amended}
         │
{endif}
         └─ [YOU ARE HERE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Governance Summary:

Total inherited articles: {total_articles}
Constitution depth: {depth} layer(s) (max 4: Org → Domain → Service → Repo)
Track: {initiative_track} — {✅ permitted / ❌ not permitted}
Effective permitted tracks: {intersection of all permitted_tracks}
Effective required gates: {union of all required_gates}
Oldest ratification: {oldest_date}
Most recent amendment: {newest_amendment}

"Your governance heritage spans {depth} generations of constitutional wisdom."
```

---

## Step 4: Handle Sparse Chain

**If gaps exist in the chain** (e.g., Domain but no Service):

```
Note: There are gaps in your constitutional lineage:

- Org Constitution: ✅ Present / ❌ Not found / ⬜ Not applicable
- Domain Constitution: ✅ Present / ❌ Not found
- Service Constitution: ✅ Present / ❌ Not found / ⬜ Not applicable
- Repo Constitution: ✅ Present / ❌ Not found / ⬜ Not applicable

{If gaps:}
The {current_layer} constitution inherits directly from the nearest ancestor.
Consider adding constitutions at missing layers for complete governance.
```

---

## Step 5: Handle No Constitution

**If no constitutions found at any layer:**

```
📜 No Constitutional Heritage Found

This context has no governance framework established.

"In the beginning, there was no governance..."

Create your founding constitution?
- Create constitution → /constitution
- Return to menu → exit
```

---

## Step 6: Timeline View (Optional)

```
Want to see the timeline view? [Y/N]
```

**If Y:**
```
📅 Constitutional Timeline

{sorted by date:}
{date} - {name} Constitution ratified ({layer_type})
{date} - {name} Constitution amended (v{version})
...

Total governance events: {event_count}
Span: {oldest_date} to {newest_date}
```

---

## Completion

```
Ancestry display complete.

What's next?
- View resolved rules → /resolve
- Check compliance → /compliance
- Create constitution → /constitution
- Return to Compass → exit
```
