# Step 2: Modify Constitution

Capture the amendment details.

---

## Add New Article

**IF user selected "Add":**

```
📋 **New Article**

Article number will be: {next_roman_numeral}

1. What is the article title?
2. What rule should this article establish?
3. What's the rationale?
4. What evidence is required?

[Enter article details]
```

**Capture:**
- `{new_article_title}`
- `{new_article_rule}`
- `{new_article_rationale}`
- `{new_article_evidence}`

**Check inheritance:**
- Same validation as create mode
- Cannot contradict parent articles

---

## Modify Existing Article

**IF user selected "Modify":**

```
Which article do you want to modify?

{for each article:}
{n}. Article {roman_numeral}: {title}

[Enter number]
```

**After selection, show current:**
```
📜 **Current Article {roman_numeral}: {title}**

{current_rule}

**Rationale:** {current_rationale}
**Evidence:** {current_evidence}

---

What changes do you want to make?

1. Update the rule text
2. Update the rationale
3. Update evidence requirements
4. All of the above

[Enter selection]
```

**Capture changes:**
- Mark as amendment, not replacement
- Preserve original version in amendment history

---

## Clarify Article

**IF user selected "Clarify":**

```
Which article needs clarification?

{article list}

[Enter number]
```

**After selection:**
```
📜 **Article {roman_numeral}: {title}**

{current_rule}

---

Add clarification (this won't change the rule, just add detail):
```

**Append clarification as sub-section:**
```markdown
**Clarification ({date}):** {clarification_text}
```

---

## Deprecate Article

**IF user selected "Deprecate":**

```
⚠️ **Deprecation Notice**

Which article should be deprecated?

{article list}

[Enter number]
```

**After selection:**
```
Why is this article being deprecated?

1. Superseded by new article
2. No longer applicable
3. Merged with another article
4. Other (explain)

[Enter reason]
```

**Add deprecation notice:**
```markdown
> ⚠️ **DEPRECATED** ({date}): {reason}
> This article remains for reference but is no longer enforced.
```

---

## Confirm Changes

```
📝 **Amendment Summary**

Type: {Add | Modify | Clarify | Deprecate}
Article: {article_title}
Change: {description}

Proceed with inheritance validation? [Y/N]
```

---

## Validate and Proceed

**LOAD:** `{installed_path}/steps-a/step-03-ratify.md`
