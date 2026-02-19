---
name: onboarding
description: Create profile + run bootstrap
agent: scout
trigger: '@scout onboard or @lens-work onboard'
category: utility
first_run: true
---

# Onboarding Workflow

**Purpose:** Create user profile and bootstrap TargetProjects for new team members.

---

## Execution Sequence

### 1. Welcome

```
🔭 Welcome to LENS Workbench!

I'm Scout, your setup guide. I'll help you:
1. Create your profile
2. Set up your TargetProjects
3. Generate initial documentation

This takes about 3-5 minutes. Let's get started!
```

### 2. Create Profile

```yaml
output: |
  📝 Creating your profile from git config...

name = git_config("user.name")
email = git_config("user.email")

output: |
  Using: ${name} <${email}>

# Load domains from repo inventory
inventory = load_yaml("_bmad-output/lens-work/repo-inventory.yaml")
domains = []
for repo in inventory.repos.matched:
  domain = repo.domain
  if domain not in domains:
    domains.append(domain)

# Single prompt for role, scope, AND PAT setup
output: |
  
  **Profile Setup**
  
  What's your role?
  [1] Developer
  [2] Tech Lead
  [3] Architect
  [4] Product Owner
  [5] Scrum Master
  
  What domain/team do you work on?
for i, domain in enumerate(domains):
  output: "[${i+6}] ${domain}"
output: "[${len(domains)+6}] all (full access to all domains)"

output: |
  
  Set up GitHub PAT now?
  [Y]es - I'll run the secure script in my terminal
  [N]o  - Skip for now (you can run it anytime later)
  
  Enter three values separated by space (role domain pat):
  Example: "3 ${len(domains)+6} Y" = Architect + all domains + set up PAT

user_input = prompt_user()
parts = user_input.split()
role = parts[0]
scope_choice = parts[1]
pat_choice = parts[2] if len(parts) > 2 else "N"

if scope_choice == str(len(domains)+6):
  scope = "all"
else:
  scope = domains[int(scope_choice) - 6]

# Detect unique GitHub domains from repo inventory
github_domains = set()
for repo in inventory.repos.matched:
  if repo.remote:
    # Extract domain from URL (e.g., github.com or github.enterprise.com)
    if "github.com/" in repo.remote:
      github_domains.add("github.com")
    elif "github" in repo.remote:
      # Extract custom GitHub Enterprise domain
      match = re.match(r"https?://([^/]+)/", repo.remote)
      if match:
        github_domains.add(match.group(1))

github_domains = sorted(list(github_domains))

# PAT storage - provide clear instructions for manual execution
output: |
  
  🔐 GitHub Personal Access Tokens Setup
  
  ⚠️  SECURITY WARNING:
  PATs should NEVER be entered into Copilot, Claude, or any LLM chat.
  
  Detected ${len(github_domains)} GitHub domain(s) in your repos:
for domain in github_domains:
  output: "  • ${domain}"

if pat_choice.lower() in ["y", "yes"]:
  output: |
    
    Perfect! Please copy and run this command in a NEW TERMINAL WINDOW:
    
    📋 Copy this entire command:
    
    cd "${PROJECT_ROOT}" && bash _bmad/lens-work/scripts/store-github-pat.sh
    
    On Windows with PowerShell:
    cd "${PROJECT_ROOT}"; .\\_bmad\\lens-work\\scripts\\store-github-pat.ps1
    
    ⏸️  The script will:
    - Run outside of LLM context for security
    - Prompt for PAT for each domain
    - Store securely in gitignored file
    - Open the credentials file in VS Code when complete
    
    **Send "Continue" when ready...**
  
  wait_for_user = prompt_user()
  
  # Check if credentials were created
  if file_exists("_bmad-output/lens-work/personal/github-credentials.yaml"):
    output: "✅ GitHub credentials detected! Continuing with onboarding..."
  else:
    output: "⏭️  No credentials found. You can add them later by running the script."
else:
  output: |
    
    ⏭️  Skipping PAT setup. You can run this anytime:
    
    bash _bmad/lens-work/scripts/store-github-pat.sh
    
    (from project root directory)

profile = {
  name: name,
  email: email,
  role: roles[role],
  scope: scope,
  created_at: now(),
  preferences: {
    communication_style: "professional",
    auto_fetch: true
  }
}

# Save personal profile (local/gitignored)
save(profile, "_bmad-output/lens-work/personal/profile.yaml")

# Create roster entry (for team stats and repo associations)
roster_entry = {
  name: name,
  email: email,
  role: roles[role],
  onboarded_at: now(),
  repos_initiated: [],  # Populated when user runs new-* commands
  stats: {
    initiatives_started: 0,
    initiatives_completed: 0,
    last_active: now()
  }
}
save(roster_entry, "_bmad-output/lens-work/roster/${sanitize(name)}.yaml")
```

### 2a. Clone Stub Prompts from GitHub (Optional)

```yaml
# Clone stub prompts from the control repo defined in settings.json.
# settings.json is written by the installer with:
#   github.repo            - full HTTPS URL of the control repository
#   github.branch          - branch to sparse-checkout
#   github.stubsTargetPath - local destination (.github/stubPrompts)

settings_path = "_bmad-output/lens-work/settings.json"

if file_exists(settings_path):
  settings = load_json(settings_path)
  enabled    = settings.github.cloneOnboardingStubsEnabled
  repo_url   = settings.github.repo
  branch     = settings.github.branch
  target_dir = settings.github.stubsTargetPath  # .github/stubPrompts

  if enabled and repo_url:
    output: |

      📥 Syncing stub prompts from control repository...

      Repository : ${repo_url}
      Branch     : ${branch}
      Target     : ${target_dir}

    shell: |
      set -e
      mkdir -p "${target_dir}"
      TMP=$(mktemp -d)
      git clone --branch "${branch}" --depth 1 --filter=blob:none --sparse "${repo_url}" "$TMP" 2>&1
      git -C "$TMP" sparse-checkout set .github/stubPrompts
      cp -f "$TMP"/.github/stubPrompts/*.prompt.md "${target_dir}/"
      rm -rf "$TMP"

    output: "✅ Stub prompts synced to ${target_dir}"

  else:
    output: "⏭️  Stub prompt cloning is disabled (cloneOnboardingStubsEnabled=false)"
else:
  output: "⏭️  settings.json not found — stub cloning skipped (run installer first)"
```

### 3. Determine Bootstrap Scope

```yaml
if scope == "all":
  bootstrap_scope = "full"
  output: "Will bootstrap all repos from service map"
else:
  bootstrap_scope = scope
  output: "Will bootstrap repos for ${scope}"
```

### 4. Run Discovery

```yaml
invoke: scout.repo-discover
params:
  scope: bootstrap_scope

# Creates:
#   - _bmad-output/lens-work/repo-inventory.yaml (canonical repo metadata)
#   - _bmad-output/lens-work/personal/personal-repo-inventory.yaml (local machine state)

output: |
  🔍 Discovery complete
  ├── Found: ${matched} repos
  ├── Missing: ${missing} repos
  └── Extra: ${extra} repos
```

### 5. Run Reconcile (Clone Missing)

```yaml
if missing > 0:
  output: |
    📥 Cloning ${missing} missing repos...
    This may take a few minutes.
  
  invoke: scout.repo-reconcile
```

### 6. Run Documentation

```yaml
output: |
  📄 Generating initial documentation...

invoke: scout.repo-document
params:
  mode: "full"  # First run = full documentation
```

### 7. Completion

```
🎉 Onboarding Complete!

Profile: ${profile.name} (${profile.role})
Scope: ${profile.scope}

What's ready:
├── ✅ Profile created
├── ✅ ${cloned_count} repos cloned
├── ✅ ${documented_count} repos documented
└── ✅ Canonical docs in Docs/

Next steps:
├── Run #new-feature "your-feature" to start an initiative
├── Run @tracey ST to see status anytime
└── Run @compass H for help

Welcome to the team! 🚀
```

---

## Storage Locations

### Personal Profile (Gitignored)
Your personal profile is stored locally in `_bmad-output/lens-work/personal/profile.yaml`:

```yaml
# _bmad-output/lens-work/personal/profile.yaml
name: Jane Smith
email: jane.smith@example.com
role: Developer
scope: payment-service
created_at: 2026-02-03T10:00:00Z
preferences:
  communication_style: professional
  auto_fetch: true
```

### GitHub Credentials (Gitignored)
Your GitHub Personal Access Tokens are stored securely in `_bmad-output/lens-work/personal/github-credentials.yaml`:

```yaml
# _bmad-output/lens-work/personal/github-credentials.yaml
github.com:
  token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  created_at: 2026-02-03T10:00:00Z
  type: github.com

github.foo.com:
  token: ghp_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  created_at: 2026-02-03T10:00:00Z
  type: github_enterprise
```

**Security Notes:**
- This file is gitignored and never committed
- Used for GitHub API access (PRs, issues, CI status)
- Separate tokens for each GitHub domain (SaaS and Enterprise)
- Can be regenerated anytime from GitHub settings
- Optional but recommended for full lens-work features

**Generate Tokens:**
- GitHub.com (SaaS): https://github.com/settings/tokens
- GitHub Enterprise: https://{your-domain}/settings/tokens
- Required scopes: `repo`, `read:org`

### Roster Entry (Team Stats)
Your roster entry is stored in `_bmad-output/lens-work/roster/jane-smith.yaml`:

```yaml
# _bmad-output/lens-work/roster/jane-smith.yaml
name: Jane Smith
email: jane.smith@example.com
role: Developer
onboarded_at: 2026-02-03T10:00:00Z
repos_initiated: ["payment-service", "auth-service"]
stats:
  initiatives_started: 5
  initiatives_completed: 3
  last_active: 2026-02-10T15:30:00Z
```

### Personal Repo Inventory
Your machine-specific repo state is tracked in `_bmad-output/lens-work/personal/personal-repo-inventory.yaml`:

```yaml
# _bmad-output/lens-work/personal/personal-repo-inventory.yaml
scanned_at: "2026-02-10T15:00:00Z"
workstation: "DESKTOP-ABC123"

repos:
  - name: payment-service
    local_path: "D:/Projects/payment-service"
    current_branch: "feature/new-payment-api"
    has_uncommitted: true
    last_pull: "2026-02-10T09:00:00Z"
    
  - name: auth-service
    local_path: "D:/Projects/auth-service"
    current_branch: "main"
    has_uncommitted: false
    last_pull: "2026-02-09T16:30:00Z"
```
