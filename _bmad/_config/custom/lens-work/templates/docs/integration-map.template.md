# Integration Map Document Template

> **Minimum: 150 lines. Target: 300+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header.

### 2. Integration Overview
Brief paragraph on integration landscape.

### 3. Integration Architecture — ASCII Art Landscape Diagram

**CRITICAL:** Create an ASCII art diagram showing all integration points:
```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LANDSCAPE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐     ┌──────────────┐     ┌────────────────┐ │
│  │  EXTERNAL SVC  │◀────│   SERVICE    │────▶│  DATABASE     │  │
│  └────────────────┘     └──────────────┘     └────────────────┘ │
│                                │                                  │
│         ┌──────────────────────┼──────────────────────┐         │
│         ▼                      ▼                      ▼          │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐   │
│  │   AUTH      │     │    MESSAGE Q    │     │   STORAGE   │    │
│  └─────────────┘     └─────────────────┘     └─────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

Read actual config files, connection strings, and service references to populate.

### 4. Internal Integrations

For EACH internal integration, include a dedicated subsection:

#### 1. {Integration Name}

| Aspect | Details |
|--------|---------|
| **Connection** | {actual connection type} |
| **Protocol** | {actual protocol} |
| **Authentication** | {actual auth method} |
| **Configuration** | {config location} |

**Configuration code (actual):**
```xml
<!-- or csharp, json, yaml — from actual config file -->
```

**Migration Consideration:**
Specific actionable recommendation.

### 5. External Integrations

Same format as internal but for external services (third-party APIs, cloud services, SaaS).

### 6. API Integration Points

REST API surface summary table:

| Endpoint | Purpose | Integration Type |
|----------|---------|------------------|
| ... | ... | ... |

### 7. Data Flow Diagrams

**CRITICAL:** Include at least 2 data flow diagrams (ASCII art):

1. Primary data flow (e.g., assessment data flow, order processing flow)
2. File/media flow (e.g., upload pipeline)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Source     │────▶│   Service    │────▶│   Target     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 8. Configuration Dependencies

Actual AppSettings/environment variables from config files:
```xml
<appSettings>
    <!-- Real config keys and descriptions -->
</appSettings>
```

### 9. Connection Strings

Actual connection string names (redacted values):
```xml
<connectionStrings>
    <add name="ActualName" connectionString="..." />
</connectionStrings>
```

### 10. Integration Migration Checklist

Prioritized checklist:

**High Priority:**
- [ ] item 1
- [ ] item 2

**Medium Priority:**
- [ ] ...

**Low Priority:**
- [ ] ...

### 11. Security Considerations

| Integration | Current Security | Recommendation |
|-------------|------------------|----------------|
| ... | ... | ... |

Secrets management current vs target.

### 12. Related Documentation + Footer

---

## Content Depth Rules

1. **Read actual config files** — web.config, appsettings.json, .env, etc.
2. **Extract real connection strings** (names only, not values)
3. **Include real AppSettings/env vars** from actual config
4. **Show at least 2 ASCII data flow diagrams**
5. **Show at least 1 ASCII integration landscape diagram**
6. **Include configuration code blocks** from actual source
7. **Every integration must have a migration recommendation**
