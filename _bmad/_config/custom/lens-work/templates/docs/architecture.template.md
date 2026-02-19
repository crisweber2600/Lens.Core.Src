# Architecture Document Template

> **Minimum: 200 lines. Target: 300+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header with service name.

### 2. Executive Summary
2-4 sentences describing what the system does and its primary architecture pattern.

### 3. System Architecture — High-Level Diagram

**CRITICAL:** Create an ASCII art box-and-arrow architecture diagram showing all tiers.

**Use this format (adapt to the actual system):**
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
├─────────────────────────────────────────────────────────────────┤
│  {Frontend App} ({Framework} {Version})                          │
│  ├── {Components/Controllers} ({count})                          │
│  └── {Key Libraries}                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API TIER                                │
├─────────────────────────────────────────────────────────────────┤
│  {API Project} ({Framework})                                     │
│  ├── {N} Controllers/Endpoints                                   │
│  └── {Auth method}                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Do NOT skip this diagram.** Read the actual project structure and create an accurate multi-tier diagram.

### 4. Project Structure — Solution Composition Table

| Project | Type | Purpose | Lines of Code |
|---------|------|---------|---------------|
| ... | ... | ... | ... |

Count real files and estimate lines. Read `.sln`, `.csproj`, `package.json` to identify project components.

### 5. Technology Stack — Detailed Tables

**Backend Technologies:**

| Technology | Version | Purpose |
|------------|---------|---------|
| ... | ... | ... |

Read actual dependency files (package.json, *.csproj, requirements.txt, go.mod) and list real dependencies with real versions.

**Frontend Technologies (if applicable):**

Same format with actual package versions.

**Infrastructure:**

| Technology | Purpose |
|------------|---------|
| ... | ... |

### 6. Authentication Architecture

Include an ASCII flow diagram:
```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client     │────▶│   Auth Provider  │────▶│   User Store    │
└──────────────┘     └──────────────────┘     └─────────────────┘
```

Include actual code from the auth configuration (read the startup/config file and extract the relevant code block).

### 7. Data Architecture

Summary of database context, entity counts by domain, migration history.
Include actual entity count from reading the DbContext or schema files.

### 8. API Architecture

Controller inventory table with domain groupings, counts, key operations.
Include actual API config code from the project.

### 9. Frontend Architecture (if applicable)

Module structure showing actual file tree and key files with sizes.
Include actual Angular/React/Vue config or entry point.

### 10. Technical Debt Assessment

**Critical Issues table:**

| Issue | Severity | Impact | Migration Complexity |
|-------|----------|--------|---------------------|
| ... | 🔴/🟡/🟢 | ... | ... |

**Code Quality Concerns table:**

| Concern | Files Affected | Notes |
|---------|----------------|-------|
| ... | ... | ... |

### 11. Security Considerations

Current security model and security risks.

### 12. Deployment Architecture

ASCII diagram of deployment topology.

### 13. Integration Points

External dependencies table and internal service communication patterns.

### 14. Recommendations for Modernization

Phased checklist with actionable items.

### 15. Related Documentation + Footer

Standard cross-references and LENS footer.

---

## Content Depth Rules

1. **Every technology claim must be backed by a file read** — cite the actual file where you found the version
2. **Every count must be verified** — count controllers, entities, endpoints from actual files
3. **Include at least 2 ASCII art diagrams** — system architecture + deployment/auth flow
4. **Include at least 3 real code blocks** — from the actual codebase (config, auth, API setup)
5. **Use severity emoji indicators** — 🔴 Critical, 🟡 Medium, 🟢 Low
