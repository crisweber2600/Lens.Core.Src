# Step: Detect Conflicts

**Goal:** Identify conflicts between parent amendment and child constitution rules.

---

## For Each Child Constitution

```yaml
for child in affected_children:
  conflicts = []
  
  # Conflict Type 1: Removal
  IF amendment.type == "Remove" OR amendment.type == "Deprecate with removal":
    FOR article IN child.articles:
      IF article references parent.{removed_article_id}:
        conflicts.append({
          type: "REMOVAL",
          parent_article: {removed_article_id},
          child_article: article.id,
          description: "Child references removed parent article"
        })
  
  # Conflict Type 2: Redefinition
  IF amendment.type == "Modify" AND amendment.affects_non_negotiable:
    FOR article IN child.articles:
      IF article.customizes(parent.{modified_article_id}):
        conflicts.append({
          type: "REDEF

INITION",
          parent_article: {modified_article_id},
          child_article: article.id,
          description: "Child customizes NON-NEGOTIABLE rule now redefined"
        })
  
  # Conflict Type 3: Contradiction
  IF amendment.type == "Add":
    FOR article IN child.articles:
      IF article.contradicts(parent.{new_article}):
        conflicts.append({
          type: "CONTRADICTION",
          parent_article: {new_article_id},
          child_article: article.id,
          description: "Child rule contradicts new parent rule"
        })
  
  child.conflicts = conflicts
```

**Display:**
```
📊 **Conflict Analysis**

{for each child:}
{child_layer}/{child_name}:
  {if conflicts.length > 0:}
  ⚠️ {conflicts.length} conflict(s) detected:
  {for conflict:}
  - {conflict.type}: {conflict.description}
    Parent Article: {conflict.parent_article}
    Child Article: {conflict.child_article}
  {endfor}
  {else:}
  ✓ ALIGNED — No conflicts detected
  {endif}
{endfor}
```