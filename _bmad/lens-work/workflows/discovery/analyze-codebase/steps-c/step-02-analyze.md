---
name: 'step-02-analyze'
description: 'Analyze stack, APIs, and data layers'
nextStepFile: './step-03-summary.md'
---

# Step 2: Analyze

## Goal
Perform comprehensive static analysis of the codebase. Identify technology stack, API surfaces, data models, dependencies, and integration points. This is the core analysis engine shared with the discover workflow.

## Instructions

### CRITICAL: Deep Analysis Requirement
**Do not perform superficial file listings.** 

1. **Direct Tool Usage First**: You MUST use `read_file`, `grep_search`, and `list_dir` to inspect the codebase yourself first. Do not immediately delegate unleess necessary.
   - Read `csproj`, `package.json`, and key entry points to build a mental map.
   - Use `grep_search` to find "Controller", "Entity", "Repository" patterns.

2. **Conditional Delegation**: ONLY call `runSubagent` if the codebase is too large (> 50 files) or too complex for a single context window.
   - If delegating, instruct the subagent to **WRITE findings to a file** (e.g., `_analysis_partial.md`) and NOT just summarize in chat.

3. **Verify Findings**: Inspect the code. Cite specific file paths and line numbers for every major architectural claim.

### 1. Initialize Analysis Context
```yaml
analysis_context:
  target: string
  started_at: ISO8601
  scope: full|light
  tech_stack_hint: [from selection]|null
```

### 2. Technology Stack Detection
Scan for technology indicators:

**Manifest files to check:**
```yaml
manifest_detection:
  node:
    files: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]
    parse: "dependencies, devDependencies, scripts, engines"
    
  python:
    files: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]
    parse: "dependencies, python_requires"
    
  java:
    files: ["pom.xml", "build.gradle", "build.gradle.kts"]
    parse: "dependencies, java.version, plugins"
    
  go:
    files: ["go.mod", "go.sum"]
    parse: "module, require"
    
  rust:
    files: ["Cargo.toml", "Cargo.lock"]
    parse: "dependencies, edition"
    
  dotnet:
    files: ["*.csproj", "*.fsproj", "*.sln"]
    parse: "TargetFramework, PackageReference"
```

**Build tech stack profile:**
```yaml
tech_stack:
  primary_language: string
  secondary_languages: [list]
  runtime: string
  runtime_version: string
  
  framework:
    name: string
    version: string
    category: web|cli|library|worker
    
  build_system: npm|yarn|pip|maven|gradle|cargo|dotnet
  
  dependencies:
    production:
      - name: string
        version: string
        purpose: inferred|explicit
    development:
      - name: string
        version: string
        purpose: string
```

### 3. Project Structure Analysis
Map the directory tree with semantic classification:

```yaml
structure_analysis:
  entry_points:
    - file: "src/index.ts"
      type: main
    - file: "src/server.ts"
      type: server
      
  directories:
    - path: "src/"
      type: source
      children:
        - path: "src/api/"
          type: api_layer
          pattern: "route handlers"
        - path: "src/services/"
          type: business_layer
          pattern: "business logic"
        - path: "src/models/"
          type: data_layer
          pattern: "data models"
        - path: "src/utils/"
          type: utility
          
    - path: "tests/"
      type: test
      coverage_hint: "unit + integration"
      
    - path: "config/"
      type: configuration
```

### 4. API Surface Extraction
Based on detected framework, extract endpoints:

**Framework-specific extractors:**

**Express.js:**
```javascript
// Pattern: app.METHOD(path, handler)
// Pattern: router.METHOD(path, handler)
// Pattern: router.use(path, subRouter)
```

**FastAPI:**
```python
# Pattern: @app.get/post/put/delete(path)
# Pattern: @router.api_route(path, methods=[...])
```

**Spring Boot:**
```java
// Pattern: @RequestMapping, @GetMapping, @PostMapping
// Pattern: @RestController class paths
```

**Build API inventory:**
```yaml
api_surface:
  detected_framework: string
  extraction_confidence: high|medium|low
  
  summary:
    total_endpoints: N
    by_method:
      GET: N
      POST: N
      PUT: N
      DELETE: N
      PATCH: N
    authenticated: N
    public: N
    
  endpoints:
    - method: string
      path: string
      full_path: string  # with base path
      handler:
        name: string
        file: string
        line: N
      parameters:
        path: [list]
        query: [list]
        body: string|null
      response_type: string|null
      auth_required: boolean|unknown
      decorators: [list]
      
  route_groups:
    - prefix: "/api/users"
      endpoints: N
      description: inferred
```

### 5. Data Model Extraction
Find and parse data structures:

**Detection patterns by language:**

**TypeScript/JavaScript:**
```typescript
// interface Name { ... }
// type Name = { ... }
// class Name { ... }
// zod.object({ ... })
```

**Python:**
```python
# class Name(BaseModel): ...
# @dataclass class Name: ...
# class Name(TypedDict): ...
```

**Java:**
```java
// @Entity class Name { ... }
// public class NameDTO { ... }
// public record Name(...) { }
```

**Build model inventory:**
```yaml
data_models:
  total: N
  
  entities:
    - name: string
      file: string
      line: N
      source: orm|pojo|interface
      fields:
        - name: string
          type: string
          nullable: boolean
          constraints: [list]
      relationships:
        - type: one_to_one|one_to_many|many_to_many
          target: string
          field: string
          
  dtos:
    - name: string
      file: string
      used_in: [endpoint paths]
      
  enums:
    - name: string
      values: [list]
      file: string
```

### 6. Data Storage Detection
Identify database and storage integrations:

```yaml
data_storage:
  primary_database:
    type: postgresql|mysql|mongodb|sqlite|...
    detected_from: "dependency"|"config"|"connection_string"
    confidence: high|medium|low
    
  orm:
    name: prisma|typeorm|sqlalchemy|gorm|...
    config_file: string
    models_managed: N
    
  migrations:
    present: boolean
    folder: string
    count: N
    latest: string
    
  caching:
    type: redis|memcached|in_memory|none
    usage: [patterns found]
    
  file_storage:
    type: s3|gcs|local|none
    bucket_references: [list]
```

### 7. Integration Point Detection
Map external dependencies:

```yaml
integrations:
  http_clients:
    - library: axios|fetch|requests|http.client|...
      usages:
        - file: string
          line: N
          target_url: string|pattern
          method: string
          
  message_queues:
    - type: rabbitmq|kafka|sqs|redis_pubsub|...
      library: string
      role: producer|consumer|both
      channels:
        - name: string
          role: string
          
  grpc:
    - proto_files: [list]
      services: [list]
      role: client|server|both
      
  internal_apis:
    - target: string
      detected_from: "url pattern"|"env var"|"config"
      endpoints: [list]
```

### 8. Architecture Pattern Detection
Identify design patterns:

```yaml
architecture:
  primary_pattern: MVC|Layered|Hexagonal|Clean|DDD|...
  confidence: high|medium|low
  
  patterns_detected:
    - pattern: "Repository Pattern"
      evidence: ["repository folder", "interface definitions"]
      
    - pattern: "Dependency Injection"
      evidence: ["DI container config", "constructor injection"]
      
    - pattern: "Factory Pattern"
      evidence: ["factory classes"]
      
  concerns_separation:
    api_layer: present|absent
    business_layer: present|absent
    data_layer: present|absent
    clear_boundaries: boolean
```

### 9. Code Quality Signals
Detect quality indicators:

```yaml
quality_signals:
  testing:
    framework: jest|pytest|junit|...
    test_files: N
    coverage_config: present|absent
    
  linting:
    tools: [eslint, prettier, pylint, ...]
    config_files: [list]
    
  documentation:
    readme: present|absent
    api_docs: present|absent
    inline_comments: low|medium|high
    
  ci_cd:
    detected: boolean
    platforms: [github_actions, gitlab_ci, jenkins, ...]
    
  security:
    dependency_scanning: present|absent
    secrets_in_code: [detected patterns]
```

### 10. Build Analysis Results
Aggregate findings:

```yaml
analysis_results:
  target: string
  analyzed_at: ISO8601
  duration_seconds: N
  
  tech_stack: {...}
  structure: {...}
  api_surface: {...}
  data_models: {...}
  data_storage: {...}
  integrations: {...}
  architecture: {...}
  quality_signals: {...}
  
  metrics:
    files_analyzed: N
    lines_of_code: N
    endpoints: N
    models: N
    integrations: N
    
  confidence:
    overall: 0.0-1.0
    api_extraction: 0.0-1.0
    model_extraction: 0.0-1.0
    
  warnings: [list]
  limitations: [list]
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| Unknown framework | Use generic extraction, lower confidence |
| Minified code | Skip, warn "Cannot analyze minified code" |
| Very large file (>10k lines) | Sample, warn "Partial analysis" |
| Binary files | Skip silently |
| Encrypted/obfuscated | Skip, note in limitations |
| Mixed languages | Analyze primary, note secondary |
| Generated code | Detect and mark as generated |
| Dynamic routes | Note as limitation |

## Output
```yaml
analysis_results:
  target: string
  analyzed_at: ISO8601
  duration_seconds: N
  
  summary:
    language: string
    framework: string
    endpoints: N
    models: N
    integrations: N
    
  tech_stack: {...}
  api_surface: {...}
  data_models: {...}
  data_storage: {...}
  integrations: {...}
  architecture: {...}
  quality_signals: {...}
  
  confidence: 0.0-1.0
  warnings: [list]
```
