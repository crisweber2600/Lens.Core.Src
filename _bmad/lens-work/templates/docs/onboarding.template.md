# Onboarding Guide Document Template

> **Minimum: 200 lines. Target: 400+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header.

### 2. Welcome
1-2 sentence welcome and purpose statement.

### 3. Quick Start — Prerequisites Table

| Tool | Version | Purpose |
|------|---------|---------|
| ... | ... | ... |

Extract actual tool requirements from the project (runtime version from config, package manager from lock files, database from connection strings).

### 4. Quick Start — Initial Setup

**CRITICAL:** Include actual setup commands from the project.

Read `README.md`, `package.json` scripts, `.csproj` files, `Makefile`, `docker-compose.yml` to extract real commands.

```powershell
# 1. Clone the repository
git clone <repository-url>

# 2. Install dependencies
{actual install command from package.json/csproj}

# 3. Configure environment
{actual config steps}

# 4. Run migrations (if applicable)
{actual migration command}

# 5. Start the application
{actual start command}
```

### 5. Solution Structure — Full Directory Tree

```
ProjectName/
├── src/
│   ├── controllers/     # N controller files
│   ├── models/          # N model files
│   └── services/        # N service files
├── tests/               # Test suite
└── config/              # Configuration
```

Read the actual directory structure with `list_dir` and create an accurate tree.
Include file counts and purpose annotations.

### 6. Architecture Overview — Request Flow

ASCII art request flow diagram:
```
Browser ──▶ Frontend ──▶ API ──▶ Service ──▶ Database
```

### 7. Layer Responsibilities Table

| Layer | Project | Responsibility |
|-------|---------|----------------|
| ... | ... | ... |

### 8. Key Concepts

For each major concept (3-5 concepts), include:

#### Concept Name

Explanation with actual code example from the codebase:
```csharp
// Real code from the project demonstrating this concept
```

### 9. Frontend Development (if applicable)

Module structure, creating a new component example (based on actual patterns in the codebase).

Include actual code examples showing the project's patterns:
```javascript
// Real example from the project
```

### 10. Backend Development (if applicable)

Creating a new controller/endpoint example (based on actual patterns).

Include actual code examples:
```csharp
// Real controller pattern from the project
```

### 11. Database Development (if applicable)

Adding a new entity, migration commands.

### 12. Common Development Tasks

Step-by-step instructions for common tasks:
1. Adding a new report/feature
2. Debugging tips (backend and frontend)
3. Common issues and solutions

### Common Issues Table:

| Issue | Solution |
|-------|----------|
| ... | ... |

### 13. Testing

Manual testing checklist and API testing instructions.

### 14. Deployment

Build process commands and deployment checklist.

### 15. Migration Context (if legacy)

References to migration documentation and key differences from modern target.

### 16. Support Resources

Links to related docs and external resources.

### 17. Related Documentation + Footer

---

## Content Depth Rules

1. **All commands must be real** — extracted from package.json scripts, README, Makefile
2. **Directory tree must be accurate** — use list_dir to verify
3. **Code examples must be from the actual project** — not generic patterns
4. **Include both frontend AND backend development examples** if full-stack
5. **Include at least 3 "how to add X" tutorials** based on actual project patterns
6. **Common issues must be realistic** — based on actual tech stack quirks
7. **Prerequisites must list actual required versions** from project config
