# Step 1: Resolve Constitution

Resolve and display accumulated constitutional rules.

---

## Load LENS Context

**Get from @lens:**
- Current layer type: `{layer_type}`
- Current layer path: `{layer_path}`
- Constitution root: `{constitution_root}`

---

## Build Inheritance Chain

**Walk from current layer to Domain:**

```
Resolving constitutional heritage...

1. Checking Domain constitution...
2. Checking Service constitution...
3. Checking Microservice constitution...
4. Checking Feature constitution...
```

**For each layer:**
- Check if `{constitution_root}/{layer_path}/constitution.md` exists
- If exists: Load and parse articles
- Track: name, version, article count, ratification date

---

## Collect Articles

**Merge order (parent → child):**

1. Domain articles (highest authority)
2. Service articles (adds to Domain)
3. Microservice articles (adds to Service)
4. Feature articles (narrowest scope)

**Store:**
```yaml
resolved:
  chain:
    - layer: Domain
      name: {domain_name}
      articles: {count}
      path: {path}
    - layer: Service
      name: {service_name}
      articles: {count}
      path: {path}
  total_articles: {sum}
  articles:
    - id: "I"
      title: {title}
      source: Domain
      rule: {rule}
    - id: "II"
      title: {title}
      source: Service
      rule: {rule}
```

---

## Display Resolution

```
📜 **Resolved Constitution: {current_layer_name}**

**Context:** {layer_type} at {layer_path}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Inheritance Chain:**

{for each constitution in chain:}
{n}. {layer_type}: {name} ({article_count} articles)
   └─ Ratified: {ratified_date} | Last amended: {amended_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Total Governance:** {total_articles} articles from {chain_count} constitution(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Domain Articles (inherited)

{for each domain article:}
**Article {id}: {title}**
{rule_summary}

---

## Service Articles (inherited)

{for each service article:}
**Article {id}: {title}**
{rule_summary}

---

## Local Articles

{for each local article:}
**Article {id}: {title}**
{rule_summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These {total_articles} articles govern all work in this context.
```

---

## Handle No Constitution

**IF no constitutions found in chain:**
```
📜 **No Constitution Found**

There are no constitutions governing this context.

Would you like to create one?

- Create constitution -> /constitution
- Return to menu -> H
```

---

## Format Options

**If user requested specific format:**

- **summary** (default): Rule titles and one-line summaries
- **full**: Complete rule text with rationale and evidence
- **minimal**: Just article titles and counts

```
View format options:
1. [S] Summary — titles + brief descriptions (current)
2. [F] Full — complete article text with rationale
3. [M] Minimal — just article list

[Enter selection or press Enter to keep current]
```

---

## Audit Trail

Log `constitution-resolved` via state-management skill with:
- timestamp
- target_layer
- layers_walked
- total_articles

---

## Completion

```
Resolution complete.

What's next?
- Check compliance -> /compliance
- View ancestry -> /ancestry
- Return to menu -> H
```
