# Step: Traverse Hierarchy

**Goal:** Identify all child constitutions affected by parent amendment.

---

## Scan Filesystem

```
🔍 **Hierarchy Traversal**

Scanning for child constitutions...

Starting layer: {parent_layer}
Looking in: _bmad-output/lens-work/constitutions/
```

**Algorithm:**
1. Based on {parent_layer}, determine child layers:
   - Domain → Service, Microservice, Feature
   - Service → Microservice, Feature
   - Microservice → Feature
   - Feature → (none, leaf layer)

2. For each child layer, scan `constitutions/{child_layer}/*/` directories

3. For each found constitution, verify parent relationship:
   ```
   constitution_path = constitutions/{child_layer}/{child_name}/constitution.md
   
   # Check YAML frontmatter for parent field OR
   # Invoke resolve-constitution and check inheritance chain
   
   IF {parent_constitution_name} IN inheritance_chain:
     Add to affected_children list
   ```

**Output:**
- `{affected_children}` — List of child constitutions with paths
- `{affected_children_count}` — Total count

**Display:**
```
Found {affected_children_count} child constitution(s):
{for each child:}
- {child_layer}/{child_name} ({article_count} articles)
{endfor}
```

**If no children:**
```
No child constitutions found.
Amendment affects only {parent_layer}/{parent_name}.
```