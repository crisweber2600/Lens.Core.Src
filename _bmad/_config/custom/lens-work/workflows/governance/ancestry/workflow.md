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
   - Extract: `domain`, `service`, `layer`, `name`, `microservice` (optional)

2. **Branch pattern** (fallback):
   - If current branch matches `{featureBranchRoot}-{audience}-p{N}-{workflow}` (flat, hyphen-separated):
   - Parse featureBranchRoot, load initiative by ID, recurse with loaded context

3. **User input** (last resort):
   - Prompt: "Which layer? [domain/service/microservice/feature]"
   - Prompt: "Name for this layer?"

---

## Step 2: Trace Lineage

Walk the inheritance chain from Domain to the current layer.

**For each layer (Domain → Feature):**

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
  chain:
    - layer: Domain
      name: {name}
      version: {version}
      ratified: {date}
      amended: {date}
      local_articles: {count}
      inherited_articles: 0
      total_articles: {count}
    - layer: Service
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

{domain_name} Domain Constitution (ratified {domain_ratified})
├─ {domain_articles} articles
├─ Version: {domain_version}
├─ Last amended: {domain_amended}
│
{if service exists:}
└─ {service_name} Service Constitution (ratified {service_ratified})
   ├─ {service_local} articles (+{service_inherited} inherited = {service_total} total)
   ├─ Version: {service_version}
   ├─ Last amended: {service_amended}
   │
{endif}
{if microservice exists:}
   └─ {ms_name} Constitution (ratified {ms_ratified})
      ├─ {ms_local} articles (+{ms_inherited} inherited = {ms_total} total)
      ├─ Version: {ms_version}
      ├─ Last amended: {ms_amended}
      │
{endif}
{if feature exists:}
      └─ {feature_name} Constitution (ratified {feature_ratified})
         ├─ {feature_local} articles (+{feature_inherited} inherited = {feature_total} total)
         ├─ Version: {feature_version}
         ├─ Last amended: {feature_amended}
         │
{endif}
         └─ [YOU ARE HERE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Governance Summary:

Total inherited articles: {total_articles}
Constitution depth: {depth} layer(s)
Oldest ratification: {oldest_date}
Most recent amendment: {newest_amendment}

"Your governance heritage spans {depth} generations of constitutional wisdom."
```

---

## Step 4: Handle Sparse Chain

**If gaps exist in the chain** (e.g., Service but no Microservice):

```
Note: There are gaps in your constitutional lineage:

- Domain Constitution: ✅ Present / ❌ Not found
- Service Constitution: ✅ Present / ❌ Not found
- Microservice Constitution: ✅ Present / ❌ Not found
- Feature Constitution: ✅ Present / ❌ Not found

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
