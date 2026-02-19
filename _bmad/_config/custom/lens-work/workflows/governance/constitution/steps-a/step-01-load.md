# Step 1: Load Existing Constitution

Load the constitution to be amended.

---

## Detect Current Constitution

**Check LENS context:**
- Current layer: `{current_layer}`
- Constitution path: `{constitution_root}/{layer_path}/constitution.md`

---

## Load or Select

**IF constitution exists at current layer:**
```
📜 Found constitution at current layer:

**{layer_type} Constitution: {constitution_name}**
- Version: {version}
- Articles: {count}
- Last Amended: {last_amended}

Amend this constitution? [Y/N]
```

**IF Y:** Load constitution content

**IF N or no constitution found:**
```
Which constitution do you want to amend?

Available constitutions in inheritance chain:
1. Domain: {domain_name} ({domain_articles} articles)
2. Service: {service_name} ({service_articles} articles)
3. Microservice: {ms_name} ({ms_articles} articles)

[Enter number or path]
```

---

## Display Current State

**Show loaded constitution:**
```
📜 **{layer_type} Constitution: {constitution_name}**

Version: {version}
Ratified: {ratified_date}
Last Amended: {last_amended}

---

## Current Articles

{for each article:}
**Article {roman_numeral}: {title}**
{summary}

---

Total: {count} articles
Inherits: {parent_article_count} articles from {parent_count} parent(s)
```

---

## Amendment Menu

```
📝 **Amendment Options**

1. **Add** — Add a new article
2. **Modify** — Change an existing article
3. **Clarify** — Add detail without changing substance
4. **Deprecate** — Mark article as deprecated (not removed)

[Select 1-4]
```

**Route based on selection:**
- Add → Continue to gather new article
- Modify → Select article, capture changes
- Clarify → Select article, add clarification
- Deprecate → Select article, add deprecation notice

---

## Proceed to Modify

**LOAD:** `{installed_path}/steps-a/step-02-modify.md`
