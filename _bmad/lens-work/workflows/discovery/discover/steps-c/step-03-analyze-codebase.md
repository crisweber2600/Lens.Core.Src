---
name: 'step-03-analyze-codebase'
description: 'Analyze codebase for architecture and APIs'
nextStepFile: './step-04-generate-docs.md'
---

# Step 3: Analyze Codebase

## Goal
Perform deep static analysis to identify architecture patterns, API surfaces, data models, dependencies, and integration points. This is the core discovery engine.

## Instructions

### 1. Detect Technology Stack
Scan for technology indicators:

```yaml
stack_detection:
  manifests:
    - file: "package.json"
      type: node
      signals: ["dependencies", "devDependencies", "scripts"]
    - file: "requirements.txt"|"pyproject.toml"|"setup.py"
      type: python
      signals: ["dependencies", "python_version"]
    - file: "pom.xml"|"build.gradle"
      type: java
      signals: ["dependencies", "java_version", "plugins"]
    - file: "go.mod"
      type: go
      signals: ["module", "dependencies"]
    - file: "Cargo.toml"
      type: rust
      signals: ["dependencies", "edition"]
    - file: "*.csproj"
      type: dotnet
      signals: ["TargetFramework", "PackageReference"]
```

**Parse detected manifests:**
```yaml
tech_stack:
  primary_language: typescript|python|java|go|rust|csharp
  runtime: node|python|jvm|go|rust|dotnet
  
  frameworks:
    - name: "express"|"fastapi"|"spring"|"gin"|"actix"|"aspnet"
      version: string
      role: "web_framework"
      
  key_dependencies:
    - name: string
      version: string
      purpose: "orm"|"http_client"|"queue"|"cache"|"auth"|...
      
  dev_dependencies:
    - name: string
      purpose: "testing"|"linting"|"build"|...
```

### 2. Map Project Structure
Build file/folder tree with semantic classification:

```yaml
project_structure:
  root: string
  
  directories:
    - path: "src/"
      classification: source_code
      contents:
        - path: "src/controllers/"
          classification: api_handlers
        - path: "src/models/"
          classification: data_models
        - path: "src/services/"
          classification: business_logic
        - path: "src/utils/"
          classification: utilities
          
    - path: "tests/"
      classification: test_code
      
    - path: "config/"
      classification: configuration
```

**Classification heuristics:**
- `controllers/`, `handlers/`, `routes/` → API handlers
- `models/`, `entities/`, `schemas/` → Data models
- `services/`, `core/`, `domain/` → Business logic
- `utils/`, `helpers/`, `lib/` → Utilities
- `middleware/` → Middleware
- `migrations/` → Database migrations

### 3. Extract API Surface
Based on framework, extract API endpoints:

**For Express/Node:**
```javascript
// Detect route patterns
app.get('/api/users/:id', handler)
app.post('/api/auth/login', handler)
router.use('/v1', subRouter)
```

**For FastAPI/Python:**
```python
@app.get("/api/users/{user_id}")
@app.post("/api/auth/login")
```

**For Spring/Java:**
```java
@GetMapping("/api/users/{id}")
@PostMapping("/api/auth/login")
```

Build API map:
```yaml
api_surface:
  base_path: "/api"
  version: "v1"|null
  
  endpoints:
    - method: GET
      path: "/users/{id}"
      handler: "UserController.getUser"
      file: "src/controllers/user.ts"
      line: 45
      parameters:
        - name: "id"
          type: "path"
          data_type: "string"
      response_type: "User"
      auth_required: true
      
    - method: POST
      path: "/auth/login"
      handler: "AuthController.login"
      file: "src/controllers/auth.ts"
      line: 23
      body_type: "LoginRequest"
      response_type: "AuthResponse"
      auth_required: false
      
  groupings:
    - prefix: "/users"
      endpoints: 5
      purpose: "User management"
    - prefix: "/auth"
      endpoints: 3
      purpose: "Authentication"
```

### 4. Extract Data Models
Find and parse data model definitions:

**TypeScript/JavaScript:**
```typescript
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

type UserRole = 'admin' | 'user' | 'guest';
```

**Python (Pydantic/dataclass):**
```python
class User(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
```

**Java (JPA/POJO):**
```java
@Entity
public class User {
    @Id private String id;
    private String email;
    private LocalDateTime createdAt;
}
```

Build model map:
```yaml
data_models:
  - name: "User"
    type: entity|dto|enum
    file: "src/models/user.ts"
    line: 10
    fields:
      - name: "id"
        type: "string"
        constraints: ["required", "uuid"]
      - name: "email"
        type: "string"
        constraints: ["required", "email"]
      - name: "createdAt"
        type: "datetime"
        constraints: ["auto_generated"]
    relationships:
      - type: "has_many"
        target: "Order"
        field: "orders"
        
  - name: "UserRole"
    type: enum
    values: ["admin", "user", "guest"]
```

### 5. Identify Data Storage
Detect database and storage integrations:

```yaml
data_storage:
  databases:
    - type: postgresql|mysql|mongodb|redis|...
      detected_from: "dependency"|"connection_string"|"orm_config"
      evidence:
        - file: "src/config/database.ts"
          line: 12
          
  orm:
    name: "prisma"|"typeorm"|"sqlalchemy"|"gorm"|...
    models_managed: N
    migrations_present: boolean
    
  cache:
    type: redis|memcached|in_memory
    usage: ["session", "rate_limiting", ...]
    
  file_storage:
    type: s3|gcs|azure_blob|local
    usage: ["uploads", "exports", ...]
```

### 6. Map External Integrations
Find integration points:

```yaml
integrations:
  http_clients:
    - target_service: "payment-gateway"
      base_url: "https://api.stripe.com"
      detected_from: "src/services/payment.ts"
      endpoints_called:
        - "POST /charges"
        - "GET /customers/{id}"
        
  message_queues:
    - type: rabbitmq|kafka|sqs
      role: producer|consumer|both
      topics:
        - name: "user.created"
          role: producer
        - name: "order.completed"
          role: consumer
          
  grpc_services:
    - proto_file: "protos/auth.proto"
      services:
        - name: "AuthService"
          methods: ["ValidateToken", "RefreshToken"]
          
  internal_services:
    - name: "user-service"
      protocol: http|grpc
      endpoints_called: [...]
```

### 7. Detect Architecture Patterns
Identify design patterns in use:

```yaml
architecture_patterns:
  - pattern: "MVC"|"Layered"|"Hexagonal"|"Event-Driven"|...
    confidence: high|medium|low
    evidence: ["folder structure", "dependency flow"]
    
  - pattern: "Repository Pattern"
    confidence: high
    evidence: ["src/repositories/", "interface definitions"]
    
  - pattern: "Dependency Injection"
    confidence: medium
    evidence: ["inversify config", "constructor injection"]
    
  - pattern: "Circuit Breaker"
    confidence: high
    evidence: ["opossum dependency", "resilience4j usage"]
```

### 8. Security Analysis
Identify security-relevant patterns:

```yaml
security_analysis:
  authentication:
    methods: ["jwt", "oauth2", "api_key"]
    implementation: "src/middleware/auth.ts"
    
  authorization:
    type: "rbac"|"abac"|"none"
    implementation: "src/middleware/authorize.ts"
    
  input_validation:
    present: true
    library: "joi"|"yup"|"pydantic"|...
    
  secrets_handling:
    method: "env_vars"|"vault"|"config_file"
    concerns:
      - "Hardcoded secret found in src/config.ts:45"
      
  vulnerabilities:
    - type: "sql_injection_risk"
      file: "src/queries/user.ts"
      line: 67
      severity: medium
```

### 9. Build Analysis Results
Aggregate all findings:

```yaml
analysis_results:
  target: string
  analyzed_at: ISO8601
  analysis_duration_seconds: N
  
  tech_stack: {...}
  project_structure: {...}
  api_surface: {...}
  data_models: {...}
  data_storage: {...}
  integrations: {...}
  architecture_patterns: {...}
  security_analysis: {...}
  
  metrics:
    total_files_analyzed: N
    total_lines_of_code: N
    test_coverage_estimate: N%|unknown
    api_endpoint_count: N
    model_count: N
    integration_count: N
    
  confidence_scores:
    api_surface: 0.0-1.0
    data_models: 0.0-1.0
    integrations: 0.0-1.0
    
  warnings:
    - "Some endpoints may be behind feature flags"
    - "Dynamic routes not fully detected"
```

### 10. Store Analysis in Scout Sidecar
**File:** `_memory/scout-sidecar/analysis/{target_name}.yaml`
```yaml
target: string
analyzed_at: ISO8601
analysis_results: {...}
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Unknown framework | Attempt generic analysis, lower confidence |
| Minified/bundled code | Skip, warn "Unable to analyze bundled code" |
| Generated code (protobuf, etc.) | Detect and mark as generated |
| Very large codebase (>100k LOC) | Sample + focus on entry points |
| Multiple languages in repo | Analyze primary, note secondary |
| No clear entry point | Scan all source files |
| Encrypted/obfuscated code | Skip, note in warnings |

## Output
```yaml
analysis_results:
  target: string
  analyzed_at: ISO8601
  
  summary:
    language: string
    framework: string
    api_endpoints: N
    data_models: N
    integrations: N
    
  tech_stack: {...}
  api_surface: {...}
  data_models: {...}
  data_storage: {...}
  integrations: {...}
  architecture_patterns: [...]
  security_analysis: {...}
  
  metrics: {...}
  confidence_scores: {...}
  warnings: [list]
```
