---
name: repo-document
description: Run document-project + quick-spec per in-scope repo
agent: "@lens/discovery"
trigger: "@lens document"
category: discovery
mutates: true
---

# Repo Document Workflow

**Purpose:** Generate canonical documentation for in-scope repos using document-project and quick-spec.

---

## Execution Sequence

### 1. Load Inventory

```yaml
inventory = load("_bmad-output/lens-work/repo-inventory.yaml")

if inventory == null:
  output: "No inventory found. Run '@lens discover' first."
  exit: 1
```

### 2. Apply In-Scope Filter

```yaml
in_scope_repos = filter_by_layer(inventory.repos.matched, state.initiative.layer)
```

### 3. For Each Repo: Decision Logic

```yaml
for repo in in_scope_repos:
  decision = evaluate_documentation_need(repo)
  
  # Decision factors:
  # - repo_status: healthy/unhealthy
  # - churn_threshold: 50 commits (configurable)
  # - last_documented_commit vs current HEAD
  
  decisions:
    skip: "No changes since last documentation"
    incremental: "Minor changes—update quick-spec only"
    full: "Major changes—regenerate both docs"
```

### 4. Execute Documentation

#### For each repo with decision != skip:

```yaml
output: "📄 Documenting ${repo.name}..."

# Create canonical docs directory
docs_path = "Docs/${domain}/${service}/${repo.name}/"
ensure_directory(docs_path)

if decision == "full":
  # Run document-project
  invoke: bmm.document-project
  params:
    repo_path: "${repo.path}"
    output_path: "${docs_path}/project-context.md"
    frontmatter:
      repo: ${repo.name}
      remote: ${repo.remote}
      default_branch: ${repo.default_branch}
      source_commit: ${repo.head_commit}
      generated_at: ${ISO_TIMESTAMP}
      layer: ${state.initiative.layer}
      domain: ${domain}
      service: ${service}
      generator: document-project

# Run quick-spec (both incremental and full)
invoke: bmm.quick-spec
params:
  repo_path: "${repo.path}"
  output_path: "${docs_path}/current-state.tech-spec.md"
  frontmatter:
    repo: ${repo.name}
    remote: ${repo.remote}
    default_branch: ${repo.default_branch}
    source_commit: ${repo.head_commit}
    generated_at: ${ISO_TIMESTAMP}
    layer: ${state.initiative.layer}
    domain: ${domain}
    service: ${service}
    generator: quick-spec
```

### 5. Log Decisions

Append to `_bmad-output/lens-work/repo-document-log.md`:

```markdown
## ${ISO_TIMESTAMP} — Documentation Run

### Repo: ${repo.name}

**Decision:** ${decision}
**Reason:** ${decision_reason}
**Actions:**
- ${action_list}

**Commit range:** ${last_commit}..${current_commit}
**Files generated:**
- ${generated_files}

---
```

### 6. Output Summary

```
📄 Repo Documentation Complete

Processed: ${in_scope_repos.length} repos

Results:
├── Full: ${full_count} repos
├── Incremental: ${incremental_count} repos
└── Skipped: ${skip_count} repos

Generated docs:
${for repo in documented_repos}
  ✅ Docs/${domain}/${service}/${repo.name}/
     ├── project-context.md
     └── current-state.tech-spec.md
${endfor}

Decision log: _bmad-output/lens-work/repo-document-log.md
```

---

## Canonical Docs Layout

```
Docs/{domain}/{service}/{repo}/
├── project-context.md           # document-project output
├── current-state.tech-spec.md   # quick-spec snapshot
└── {initiative artifacts}/       # Created during phases
```

---

## Frontmatter Template

All generated docs include standardized frontmatter:

```yaml
---
repo: payment-gateway
remote: git@github.com:org/payment-gateway.git
default_branch: main
source_commit: a3f2b9c
generated_at: 2026-02-03T14:32:00Z
layer: microservice
domain: payment-domain
service: payment-service
generator: document-project | quick-spec
---
```
