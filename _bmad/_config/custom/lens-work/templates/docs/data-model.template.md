# Data Model Document Template

> **Minimum: 200 lines. Target: 400+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header.

### 2. Data Architecture Overview
ORM used, database type, primary context class, entity count. Brief paragraph.

### 3. Database Statistics

| Metric | Value |
|--------|-------|
| **Total Entities** | {actual count} |
| **Migrations** | {actual count} |
| **Database Engine** | {actual} |
| **ORM Version** | {actual} |
| **Context Class** | {actual} |

### 4. Entity Domain Model — ASCII Art Categorization Diagram

**CRITICAL:** Create an ASCII art box diagram showing entity categories:
```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT NAME (N ENTITIES)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  DOMAIN 1           │  │  DOMAIN 2           │              │
│  │  • Entity1          │  │  • Entity3          │              │
│  │  • Entity2          │  │  • Entity4          │              │
│  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

Read the actual DbContext or entity files to populate this diagram.

### 5. Core Entity Details — Full Class Definitions

**CRITICAL: Include ACTUAL source code for key entities.**

For each major domain (4-6 domains minimum), include:

#### Entity Name
```csharp
// Actual class definition from the source file
public class EntityName
{
    public int Id { get; set; }
    public string Name { get; set; }
    // ... all actual properties
    
    // Navigation properties
    public virtual ICollection<Related> Related { get; set; }
}
```

**You MUST read the actual entity source files** and include the real property definitions.
Do NOT invent properties. If a source file can't be read, note it as "source not accessible".

Include at least 6-8 entity class definitions (all properties, navigation properties, data annotations).

### 6. Entity Relationships — ASCII ER Diagram

```
Entity1 (1) ──────────< Entity2 (*)
    │                      │
    │                      └──────< Entity3 (*)
    └──────< Entity4 (*)
```

Also include a Mermaid ER diagram if helpful.

### 7. Data Access Layer

Describe the data access pattern (Repository, Service, etc.) with actual code example:
```csharp
// Real service class from the codebase
public class DataServiceName
{
    // ... actual methods
}
```

Include a Key Data Services table:

| Service | Entity | Lines |
|---------|--------|-------|
| ... | ... | ... |

### 8. Migration History

| Period | Count | Major Changes |
|--------|-------|---------------|
| ... | ... | ... |

### 9. Data Validation

Show actual validation code (data annotations, fluent API).

### 10. Performance Considerations

Issues table with recommendations:

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| ... | ... | ... |

Include "current vs recommended" code comparison.

### 11. Migration to Modern System

Entity mapping table and data type modernization table.

### 12. Related Documentation + Footer

---

## Content Depth Rules

1. **Include REAL entity class definitions** — read the actual model/entity files
2. **Show ALL properties** per entity, not just Id and Name
3. **Include navigation properties** — these show relationships
4. **Include data annotations** — [Required], [MaxLength], etc.
5. **Include at least one data service example** — actual code from the data access layer
6. **Include both ASCII and Mermaid ER diagrams**
7. **Count actual migrations** — list_dir the migrations folder
8. **Minimum 6 full entity class definitions** for data-rich projects
