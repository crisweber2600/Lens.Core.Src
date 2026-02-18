---
name: discover
description: Scan and inventory repositories
agent: lens
trigger: /discover command
category: discovery
idempotent: true
---

# /discover — Repository Discovery

**Purpose:** Scan the configured TargetProjects directory, inventory all repos, their branches, and BMAD status.

---

## Execution Sequence

### 1. Read Config

```yaml
target_path = config.target_projects_path || "../TargetProjects"
depth = config.discovery_depth || "shallow"

output: |
  🔍 /discover — Repository Discovery
  ├── Target: ${target_path}
  └── Depth: ${depth}

if not directory_exists(target_path):
  error: "Target path not found: ${target_path}. Update config or create the directory."
```

### 2. Scan Repositories

```yaml
output: "🔍 Scanning..."

repos = []
for dir in walk_directories(target_path):
  if is_git_repo(dir):
    repo = {
      name: dir.name,
      path: dir.path,
      remote: exec("git -C ${dir.path} remote get-url origin 2>/dev/null") || "local",
      default_branch: exec("git -C ${dir.path} symbolic-ref refs/remotes/origin/HEAD 2>/dev/null") || "unknown",
      branch_count: exec("git -C ${dir.path} branch -a | wc -l").trim(),
      has_bmad: directory_exists("${dir.path}/_bmad"),
      last_commit: exec("git -C ${dir.path} log -1 --format='%ai %s' 2>/dev/null") || "unknown"
    }
    
    if depth == "deep":
      repo.languages = detect_languages(dir.path)
      repo.size_kb = exec("du -sk ${dir.path} | cut -f1")
      repo.contributors = exec("git -C ${dir.path} shortlog -sn --no-merges | head -5")
      repo.dependencies = detect_dependencies(dir.path)
      repo.architecture = infer_architecture(dir.path)
    
    repos.push(repo)
```

### 3. Write Inventory

```yaml
inventory = {
  scanned_at: ISO_TIMESTAMP,
  target_path: target_path,
  depth: depth,
  total_repos: repos.length,
  bmad_enabled: repos.filter(r => r.has_bmad).length,
  repos: repos
}

write_file("_bmad-output/lens/repo-inventory.yaml", inventory)
```

### 4. Report

```yaml
skill: state-management.log-event("discover_complete", {
  repos_found: repos.length,
  depth: depth
})

skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/repo-inventory.yaml", "_bmad-output/lens/event-log.jsonl"]
  message: "[lens] /discover: ${repos.length} repos scanned (${depth})"

output: |
  🔍 Discovery Report
  ═══════════════════════════════════════════════════
  
  Repos found: ${repos.length}
  BMAD-enabled: ${inventory.bmad_enabled}
  
  ${repos.map(r => `  ${r.has_bmad ? "✅" : "⬜"} ${r.name} — ${r.branch_count} branches ${r.remote != "local" ? "(remote)" : "(local only)"}`).join("\n")}
  
  ${repos.filter(r => !r.has_bmad).length > 0 ? 
    "\n  💡 Run /bootstrap to initialize BMAD in repos without it." : ""}
  
  Inventory saved: _bmad-output/lens/repo-inventory.yaml
  ═══════════════════════════════════════════════════
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Target path missing | Show config update instructions |
| Permission denied | Report which repos couldn't be scanned |
| Large repo (deep) | Show progress, allow skip |
