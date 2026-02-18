---
name: bootstrap
description: Initialize BMAD structure in target repository
agent: lens
trigger: /bootstrap command
category: discovery
---

# /bootstrap — BMAD Bootstrap

**Purpose:** Create the BMAD directory structure in a selected target repository.

---

## Execution Sequence

### 1. Select Repository

```yaml
inventory = load_if_exists("_bmad-output/lens/repo-inventory.yaml")

if inventory == null or inventory.repos.length == 0:
  output: |
    📦 No repos discovered. Run /discover first.
  exit: 0

# Filter to non-BMAD repos
eligible = inventory.repos.filter(r => !r.has_bmad)

if eligible.length == 0:
  output: |
    ✅ All discovered repos already have BMAD structure.
  exit: 0

output: |
  🔭 /bootstrap — Initialize BMAD
  
  Repos without BMAD structure:
  ${eligible.map((r, i) => `  [${i+1}] ${r.name} — ${r.path}`).join("\n")}
  
  Select repo to bootstrap: [number]

selected = eligible[user_selection]
```

### 2. Validate

```yaml
if directory_exists("${selected.path}/_bmad"):
  output: |
    ⚠️ ${selected.name} already has _bmad/ directory.
    └── Skipping to avoid overwriting existing config.
  exit: 0

output: |
  Bootstrapping BMAD in: ${selected.name}
  Path: ${selected.path}
  
  This will create:
  ├── _bmad/                  (BMAD configuration)
  ├── _bmad-output/           (BMAD output artifacts)
  └── .github/copilot-instructions.md (if GitHub)
  
  Proceed? [Y/n]

if not user_confirms:
  exit: 0
```

### 3. Create Structure

```yaml
# Core BMAD directories
create_directory("${selected.path}/_bmad")
create_directory("${selected.path}/_bmad-output")
create_directory("${selected.path}/_bmad-output/planning-artifacts")
create_directory("${selected.path}/_bmad-output/implementation-artifacts")

# Create minimal config
write_file("${selected.path}/_bmad/config.yaml", {
  project: selected.name,
  bootstrapped_at: ISO_TIMESTAMP,
  bootstrapped_by: "lens"
})

# Create .gitkeep files
write_file("${selected.path}/_bmad-output/.gitkeep", "")

# If GitHub repo, create copilot instructions
if selected.remote.includes("github.com"):
  create_directory("${selected.path}/.github")
  write_file("${selected.path}/.github/copilot-instructions.md", 
    "# Copilot Instructions\n\nThis project uses BMAD methodology.\n")
```

### 4. Configure

```yaml
output: |
  Configure target repo settings:

ask: default_branch    # default: "main"
ask: docs_path         # default: "docs/"

# Update config
config = load("${selected.path}/_bmad/config.yaml")
config.default_branch = default_branch
config.docs_path = docs_path
write_file("${selected.path}/_bmad/config.yaml", config)
```

### 5. Report

```yaml
# Update inventory
inventory.repos.find(r => r.name == selected.name).has_bmad = true
write_file("_bmad-output/lens/repo-inventory.yaml", inventory)

# Generate bootstrap report
report = {
  repo: selected.name,
  path: selected.path,
  bootstrapped_at: ISO_TIMESTAMP,
  structure_created: ["_bmad/", "_bmad-output/", "_bmad-output/planning-artifacts/", "_bmad-output/implementation-artifacts/"]
}

# Append to bootstrap report
append_file("_bmad-output/lens/bootstrap-report.md", format_bootstrap_entry(report))

skill: state-management.log-event("bootstrap_complete", {
  repo: selected.name,
  path: selected.path
})

skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /bootstrap: ${selected.name} initialized"

output: |
  ✅ Bootstrap Complete
  ═══════════════════════════════════════════════════
  
  Repo: ${selected.name}
  Created:
  ├── _bmad/config.yaml
  ├── _bmad-output/planning-artifacts/
  ├── _bmad-output/implementation-artifacts/
  ${selected.remote.includes("github.com") ? "├── .github/copilot-instructions.md" : ""}
  └── Ready for BMAD workflows
  
  Next steps:
  ├── cd ${selected.path} && git add -A && git commit -m "chore: bootstrap BMAD"
  ├── /new to create an initiative targeting this repo
  └── /discover to rescan and verify
  ═══════════════════════════════════════════════════
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| No repos discovered | Run /discover first |
| All repos have BMAD | Nothing to do |
| Permission denied | Check filesystem permissions |
| Write failed | Show which files failed |
