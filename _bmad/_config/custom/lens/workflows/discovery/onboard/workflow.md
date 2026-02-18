---
name: onboard
description: First-time user and repository setup
agent: lens
trigger: /onboard command
category: discovery
---

# /onboard — Onboarding

**Purpose:** First-time setup — detect git user, create profile, scan workspace, prepare environment.

---

## Execution Sequence

### 1. Detect User

```yaml
output: |
  🔭 /onboard — Welcome to Lens!
  └── Detecting your environment...

# Read git config
git_name = exec("git config user.name")
git_email = exec("git config user.email")

if git_name == "" or git_email == "":
  warning: "⚠️ Git user not configured. Set with: git config user.name 'Your Name'"
```

### 2. Create Profile

```yaml
profile_path = "_bmad-output/lens/profiles/${sanitize(git_name)}.yaml"

if file_exists(profile_path):
  output: |
    📋 Profile already exists for ${git_name}
    └── Updating last seen timestamp
  
  profile = load(profile_path)
  profile.last_seen = ISO_TIMESTAMP
  write_file(profile_path, profile)

else:
  profile = {
    name: git_name,
    email: git_email,
    created_at: ISO_TIMESTAMP,
    last_seen: ISO_TIMESTAMP,
    git_credentials: [],
    preferences: {
      discovery_depth: config.discovery_depth || "shallow",
      default_audiences: config.default_audiences || "small,medium,large"
    }
  }

  write_file(profile_path, profile)
  output: |
    ✅ Profile created for ${git_name}
```

### 3. Credential Setup (Optional)

```yaml
output: |
  Git host credentials (for PR creation):
  
  Lens can create PRs on GitHub, GitLab, Azure DevOps, and Bitbucket.
  This requires a Personal Access Token (PAT) for your git host.
  
  Set up credentials now? [Y/n/later]

if user_confirms:
  ask: git_host        # github | gitlab | azure-devops | bitbucket
  ask: pat             # personal access token (masked input)
  
  profile.git_credentials.push({
    host: git_host,
    pat: pat,           # stored locally only
    added_at: ISO_TIMESTAMP
  })
  
  write_file(profile_path, profile)
  output: "✅ Credentials saved for ${git_host}"
```

### 4. Scan Workspace

```yaml
target_path = config.target_projects_path || "../TargetProjects"

output: |
  🔍 Scanning workspace: ${target_path}

if directory_exists(target_path):
  repos = skill: discovery.scan-repos(target_path, config.discovery_depth)
  
  # Write repo inventory
  write_file("_bmad-output/lens/repo-inventory.yaml", repos)
  
  output: |
    📦 Repos found: ${repos.length}
    ${repos.map(r => `  ├── ${r.name} (${r.branch_count} branches)`).join("\n")}
else:
  output: |
    📂 Target path not found: ${target_path}
    └── Create it or update config to point to your repos
  
  repos = []
```

### 5. Initialize State (if first run)

```yaml
state_path = "_bmad-output/lens/state.yaml"

if not file_exists(state_path):
  # Create initial state from template
  include: templates/state-template.yaml
  state = load("templates/state-template.yaml")
  state.lens_contract_version = "2.0"
  write_file(state_path, state)
  output: "✅ State initialized"

if not file_exists("_bmad-output/lens/event-log.jsonl"):
  write_file("_bmad-output/lens/event-log.jsonl", "")
  output: "✅ Event log initialized"
```

### 6. Welcome & Next Steps

```yaml
skill: state-management.log-event("onboard_complete", {
  user: git_name,
  repos_found: repos.length
})

skill: git-orchestration.commit-and-push
params:
  paths: ["_bmad-output/lens/"]
  message: "[lens] /onboard: ${git_name} onboarded"

output: |
  🔭 Onboarding Complete!
  ═══════════════════════════════════════════════════
  
  User: ${git_name} <${git_email}>
  Profile: ${profile_path}
  Repos: ${repos.length} discovered
  Credentials: ${profile.git_credentials.length > 0 ? "configured" : "not set (run /onboard to add)"}
  
  Quick Start:
  ├── /new          Create your first initiative
  ├── /discover     Deep scan a specific repo
  ├── /bootstrap    Set up BMAD in a target repo
  ├── /status       Check current state
  └── H             Show all commands
  ═══════════════════════════════════════════════════
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Git not configured | Show git config commands |
| Target path missing | Create directory or update config |
| Profile write failed | Show manual creation instructions |
