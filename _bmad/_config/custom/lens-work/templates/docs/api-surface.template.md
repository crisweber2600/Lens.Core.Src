# API Surface Document Template

> **Minimum: 150 lines. Target: 250+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header.

### 2. API Overview
Brief description of the API framework, authentication method, base route pattern.

Include actual configuration code from the project:
```csharp
// Extracted from WebApiConfig.cs or Program.cs
// Show actual route template, auth config, CORS config
```

### 3. Authentication Headers
Show actual required headers and auth flow.

### 4. Controller/Endpoint Inventory — Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Controllers** | {actual count} |
| **API Endpoints (Est.)** | {actual count} |
| **Domain Areas** | {actual count} |

### 5. Controller Details by Domain

**CRITICAL: List EVERY controller found in the codebase.**

Group controllers by domain area. For each domain:

#### Domain N: {Domain Name}

| Controller | Endpoints | Description |
|------------|-----------|-------------|
| `{ActualControllerName}` | CRUD/Read | {description} |

**Key Endpoints:**
```
GET    /api/{resource}
GET    /api/{resource}/{id}
POST   /api/{resource}
PUT    /api/{resource}/{id}
DELETE /api/{resource}/{id}
```

**You MUST read actual controller files** to extract:
- Real controller class names
- Real route paths (from attributes or conventions)
- Real HTTP methods
- Real parameter types

Do NOT make up endpoint paths. If you can't read a controller file, note it as "unverified".

### 6. API Patterns & Conventions

Standard CRUD pattern used in the project, including code examples:
```csharp
// Actual pattern from the codebase
```

### 7. Query Parameters

| Parameter | Type | Usage |
|-----------|------|-------|
| ... | ... | ... |

Extract from actual controller method signatures.

### 8. Response Formats

Show actual success and error response formats with JSON examples.

### 9. Error Handling

Global exception handler code (extracted from actual source).

HTTP status codes table:

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | ... |
| ... | ... | ... |

### 10. API Security

Authentication flow diagram (ASCII art).
Token provider configuration (actual code).

### 11. CORS Configuration

Actual CORS setup code from the project.

### 12. API Versioning

Current state and recommendations.

### 13. Migration Considerations

Endpoint mapping table: legacy → modern equivalents.
Breaking changes to plan.

### 14. Related Documentation + Footer

---

## Content Depth Rules

1. **List EVERY controller** — use grep_search to find all controller classes
2. **Group by business domain** — infer domains from controller names and locations
3. **Include actual route paths** — read controller files to extract real routes
4. **Show real code examples** — auth config, CORS config, error handling
5. **Include at least one ASCII flow diagram** — authentication flow
6. **Minimum 8 domain groups** for large APIs, or all domains if fewer
