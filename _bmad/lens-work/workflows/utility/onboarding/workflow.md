---
name: onboarding
description: Create profile + run bootstrap
agent: "@lens/discovery"
trigger: '@lens onboard or @lens-work onboard'
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

I'm LENS, your setup guide. I'll help you:
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

# REQ-2: Question mode preference prompt
output: |
  
  **Question Mode**
  
  How would you like to answer phase questions?
  [1] Interactive (guided chat — recommended)
  [2] Batch MD (single markdown file per phase)

qm_input = prompt_user()
if qm_input.strip() == "2":
  question_mode = "batch"
else:
  question_mode = "interactive"

# REQ-3: Tracker preference prompt
output: |
  
  **Work Item Tracker**
  
  What work item tracker do you use?
  [1] Jira
  [2] Azure DevOps
  [3] None

tracker_input = prompt_user()
if tracker_input.strip() == "1":
  tracker = "jira"
  output: |
    Jira base URL (optional):
    Example: https://mycompany.atlassian.net
    Press Enter to skip.
  jira_url_input = prompt_user()
  jira_base_url = jira_url_input.strip() if jira_url_input.strip() else null
elif tracker_input.strip() == "2":
  tracker = "azure-devops"
  jira_base_url = null
else:
  tracker = "none"
  jira_base_url = null

profile = {
  name: name,
  email: email,
  role: roles[role],
  scope: scope,
  created_at: now(),
  preferences: {
    communication_style: "professional",
    auto_fetch: true,
    question_mode: question_mode,  # REQ-2
    tracker: tracker,  # REQ-3
    jira_base_url: jira_base_url if tracker == "jira" and jira_base_url else null  # REQ-3
  }
}

# REQ-4
# ANTI-PATTERN: Do NOT create profiles/*.yaml files.
# User preferences go ONLY in: personal/profile.yaml
# Team roster info goes in the GOVERNANCE REPO: roster/{name}.yaml
# The profiles/ directory must NOT exist.
# The roster/ directory must NOT exist inside _bmad-output/lens-work/.

# Save personal profile (local/gitignored)
save(profile, "_bmad-output/lens-work/personal/profile.yaml")

# Resolve governance repo root from module.yaml
module = load_yaml("_bmad/lens-work/module.yaml")
governance_root = module.outputs.governance_repo_root  # TargetProjects/lens/lens-governance

# Verify governance repo is cloned
if not dir_exists(governance_root) or not is_git_repo(governance_root):
  output: |
    ⚠️  Governance repo not cloned at ${governance_root}.
    Running check-repos to clone it before saving roster entry...
  run_workflow("check-repos", repo="bmad.lens.governance")

# Create roster entry in the GOVERNANCE REPO (committed, universal across all initiatives)
# Branch: universal/onboard-{sanitize(name)} in the governance repo
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
save(roster_entry, "${governance_root}/roster/${sanitize(name)}.yaml")
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

### 3a. Ensure TargetProjects Directory <!-- REQ-5 -->

```yaml
# REQ-5: Auto-create TargetProjects directory before discovery
# Derives the target-projects parent path from governance-setup.yaml
# (or falls back to repo-inventory.yaml).
# Idempotent — no error if directory already exists.

gov_setup_path = "_bmad-output/lens-work/governance-setup.yaml"
if file_exists(gov_setup_path):
  gov_setup = load_yaml(gov_setup_path)
  # e.g. "TargetProjects/lens/lens-governance" → "TargetProjects/lens"
  target_path = dirname(gov_setup.repo.local_path)
else:
  # Fallback: derive from repo-inventory if available
  inventory_path = "_bmad-output/lens-work/repo-inventory.yaml"
  if file_exists(inventory_path):
    inv = load_yaml(inventory_path)
    target_path = inv.target_projects_root or "TargetProjects"
  else:
    target_path = "TargetProjects"

shell: mkdir -p "${target_path}"

output: |
  📂 TargetProjects directory ensured: ${target_path}
```

### 4. Run Discovery

```yaml
invoke: discovery.repo-discover
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
  
  invoke: discovery.repo-reconcile
```

### 6. Run Documentation

```yaml
output: |
  📄 Generating initial documentation...

invoke: discovery.repo-document
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
├── Run @lens ST to see status anytime
└── Run @lens H for help

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
  question_mode: interactive  # REQ-2
  tracker: jira  # REQ-3
  jira_base_url: https://mycompany.atlassian.net  # REQ-3 (only if tracker is jira)
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
