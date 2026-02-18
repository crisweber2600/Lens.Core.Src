# Migration Map Document Template

> **Minimum: 150 lines. Target: 350+ lines.**
> **Load quality standards from:** `templates/docs/doc-quality-standards.md`

---

## Required Sections (in order)

### 1. BMAD Header
Standard header.

### 2. Migration Overview
Brief paragraph on source → target migration strategy.

### 3. Technology Migration Matrix

| Component | Legacy | Modern | Migration Path |
|-----------|--------|--------|----------------|
| **Runtime** | ... | ... | ... |
| **Web Framework** | ... | ... | ... |
| **ORM** | ... | ... | ... |
| **Frontend** | ... | ... | ... |
| **Auth** | ... | ... | ... |
| **State Mgmt** | ... | ... | ... |
| **Build** | ... | ... | ... |
| **Hosting** | ... | ... | ... |

Read actual technology versions from project files.
If no migration target is known, recommend modern equivalents.

### 4. Architecture Transformation — ASCII Art

**CRITICAL:** Show legacy vs modern architecture side by side:

```
┌─────────────────────────────────────────────────────────────────┐
│                     LEGACY ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend ──▶ API ──▶ Data Access ──▶ Database                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ MIGRATION
┌─────────────────────────────────────────────────────────────────┐
│                     MODERN ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PRESENTATION: React SPA ◀──▶ State Management         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API: Minimal APIs ◀──▶ Validation ◀──▶ Handlers       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  INFRASTRUCTURE: EF Core ◀──▶ Repositories              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Component Migration Mapping

**Backend Layer Mapping:**

| Legacy Component | Target Component | Strategy |
|------------------|------------------|----------|
| ... | ... | Rewrite/Migrate/Replace |

**Frontend Layer Mapping:**

| Legacy Component | Target Component | Strategy |
|------------------|------------------|----------|
| ... | ... | ... |

### 6. API Endpoint Migration

**Route Transformation Table:**

| Legacy Route | Modern Route | Change Type |
|--------------|--------------|-------------|
| ... | ... | Pluralize/Nest/Rename |

**Response Format Standardization:**

Show legacy vs modern JSON format.

### 7. Data Model Migration

**Entity Transformations:**

| Legacy Entity | Modern Entity | Changes |
|---------------|---------------|---------|
| ... | ... | Add/Rename/Split |

**Data Type Modernization:**

| Legacy Type | Modern Type | Rationale |
|-------------|-------------|-----------|
| `int` IDs | `Guid` IDs | Distributed generation |
| `DateTime` | `DateTimeOffset` | Timezone awareness |
| ... | ... | ... |

**Migration Script Template:**

```sql
-- Example SQL migration
ALTER TABLE ...
```

### 8. Frontend Component Migration

**Controller → Component Mapping:**

| Legacy Controller | Modern Component | Location |
|-------------------|-----------------|----------|
| ... | ... | feature/ |

**Service → Hook Mapping:**

| Legacy Service | Modern Hook | Purpose |
|----------------|------------|---------|
| ... | ... | ... |

**State Management Migration:**

Show code comparison: legacy vs modern.

### 9. Authentication Migration

ASCII art diagram: legacy auth flow → modern auth flow.

### 10. Migration Phases

**Phase 1: Foundation (Weeks 1-4):**

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| ... | P0/P1 | N weeks | ... |

**Phase 2: Core Features (Weeks 5-12):**
Same format.

**Phase 3: Advanced Features (Weeks 13-20):**
Same format.

**Phase 4: Migration & Cutover (Weeks 21-24):**
Same format.

### 11. Risk Assessment

**Technical Risks:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ... | Low/Med/High | ... | ... |

**Business Risks:**
Same format.

### 12. Strangler Fig Strategy

Visual progress diagram:
```
Week 1-4:     [====== Legacy 100% ======]
Week 5-8:     [==== Legacy 80% ====][New 20%]
...
Week 21+:     [============= New 100% =============]
```

Feature toggle code example.

### 13. Success Metrics

| Metric | Legacy Baseline | Target | Measurement |
|--------|-----------------|--------|-------------|
| Page Load Time | ... | ... | Lighthouse |
| ... | ... | ... | ... |

### 14. Related Documentation + Footer

---

## Content Depth Rules

1. **Technology versions must be real** — read actual project files
2. **Migration recommendations must be specific** — not generic advice
3. **Include at least 2 ASCII art diagrams** — legacy vs modern architecture
4. **Include at least 1 code comparison** — legacy vs modern patterns
5. **Include phased migration plan** with effort estimates
6. **Include risk assessment** with mitigations
7. **If no migration target exists**, recommend modern equivalents based on current stack
8. **For greenfield projects**, focus on architecture decisions and growth path instead
