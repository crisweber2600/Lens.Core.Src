# Step 1: Display Ancestry

Show constitutional heritage with visual hierarchy.

---

## Load LENS Context

**Get from @lens:**
- Current layer: `{layer_path}`
- Layer type: `{layer_type}`
- Constitution root: `{constitution_root}`

---

## Trace Lineage

**Walk inheritance chain (root → leaf):**

```
Tracing constitutional lineage...
```

**For each layer (Domain → Feature):**
1. Check for constitution at `{constitution_root}/{layer_path}/constitution.md`
2. If exists: Parse metadata
   - Name
   - Version
   - Ratified date
   - Last amended date
   - Article count
3. Calculate inherited totals

---

## Build Ancestry Data

**Store lineage:**
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

## Display Heritage

```
📜 **Constitution Ancestry: {current_layer_name}**

**Your Position:** {layer_type} at {layer_path}

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

**Governance Summary:**

Total inherited articles: {total_articles}
Constitution depth: {depth} layer(s)
Oldest ratification: {oldest_date}
Most recent amendment: {newest_amendment}

"Your governance heritage spans {depth} generations of constitutional wisdom."
```

---

## Handle Sparse Chain

**IF gaps in chain (e.g., Service but no Microservice):**
```
Note: There are gaps in your constitutional lineage:

- Domain Constitution: ✅ Present
- Service Constitution: ✅ Present
- Microservice Constitution: ❌ Not found
- Feature Constitution: ✅ Present (current)

The Feature constitution inherits directly from Service.
Consider adding a Microservice constitution for complete governance.
```

---

## Handle No Constitution

**IF no constitutions found:**
```
📜 **No Constitutional Heritage Found**

This context has no governance framework established.

"In the beginning, there was no governance..."

Create your founding constitution?
- Create constitution -> /constitution
- Return to menu -> H
```

---

## Timeline View (Optional)

```
Want to see the timeline view? [Y/N]
```

**IF Y:**
```
📅 **Constitutional Timeline**

{sorted by date:}
{date} - {name} Constitution ratified ({layer_type})
{date} - {name} Constitution amended (v{version})
{date} - {name} Constitution ratified ({layer_type})
...

Total governance events: {event_count}
Span: {oldest_date} to {newest_date}
```

---

## Completion

```
Ancestry display complete.

What's next?
- View resolved rules -> /resolve
- Check compliance -> /compliance
- Return to menu -> H
```
