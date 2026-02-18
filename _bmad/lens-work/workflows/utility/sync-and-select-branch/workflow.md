---
name: sync-and-select-branch
description: "Daily-limited git sync with branch inspection and user selection, profile-tracked"
agent: casey
trigger: "Internal workflow — invoked by compass or lens-work startup"
category: utility
---

# Sync and Select Branch Workflow

**Purpose:** Run git synchronization once per day per user, inspect target project branches, find most recent commits, present selection menu, and store choice in user profile.

---

## Input Parameters

```yaml
initiative_id: string        # Active initiative ID
target_repo: string          # Target repo name (e.g., "BMAD.Lens", "bmad-chat")
force_sync: boolean          # If true, bypass daily limit and always sync (default: false)
```

---

## Execution Sequence

### Step 0: Load Configuration and Profile

```bash
# Load service map
service_map = load("{project-root}/_bmad/lens-work/service-map.yaml")

# Load user profile
profile_path = "{project-root}/_bmad-output/personal/profile.yaml"
profile = load(profile_path)

if profile == null:
  error: "Profile not found at ${profile_path}"
  hint: "Run lens-work bootstrap to initialize your profile."
  exit: 1

# Capture current timestamp and date
now_ts = ISO_8601_timestamp()  # e.g., "2026-02-09T14:30:45Z"
today = ISO_date()             # e.g., "2026-02-09"
git_user = exec("git config user.name")
```

---

### Step 1: Check Daily Sync Limit

```yaml
# Initialize lens_work section if missing
if profile.lens_work == null:
  profile.lens_work = {}

last_sync = profile.lens_work.last_sync or null

if last_sync != null && last_sync.date == today && force_sync == false:
  # Sync already ran today
  output: |
    ✅ Already synced today (${last_sync.timestamp})
    
    Using cached selection:
    ├── Initiative: ${initiative_id}
    ├── Target repo: ${target_repo}
    └── Last branch: ${profile.lens_work.selected_branch.branch}
    
    To force a new sync, use: [F]orce or /sync-now
  
  # Return cached branch without running sync
  cached_branch = profile.lens_work.selected_branch.branch
  return:
    branch: ${cached_branch}
    cached: true
    exit: 0

elif force_sync == true:
  output: |
    🔄 Force sync requested. Running full sequence...
else:
  output: |
    🔄 First sync today. Checking remote...
```

---

### Step 2: Pre-flight Check (Control Repo)

```bash
# Ensure we're in BMAD control repo
if [ ! -d ".git" ] || [ ! -d "_bmad" ]; then
  error "Must run from BMAD control repo root"
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  output: |
    ⚠️  Uncommitted changes in control repo detected.
    
    Options:
      [1] Stash changes and continue
      [2] Abort sync
  
  read -p "Choice: " stash_choice

  case "$stash_choice" in
    1)
      stash_label="lens-work/sync/$(date +%Y%m%dT%H%M%S)"
      git stash push -m "$stash_label"
      output "✅ Changes stashed: ${stash_label}"
      stashed=true
      ;;
    2|*)
      output "❌ Sync aborted. Commit or stash changes first."
      exit 1
      ;;
  esac
fi
```

---

### Step 3: Sync Control Repo

```bash
# Fetch from remote (may take 2-5 seconds)
output "↓ Syncing control repo..."
git fetch origin main

# Pull with stash fallback
if git pull origin main 2>/dev/null; then
  output "✅ Control repo synced"
  
  # Pop stash if we stashed earlier
  if [ "$stashed" = true ]; then
    git stash pop
    output "✅ Stashed changes restored"
  fi
else
  # Pull failed—use stash fallback
  output "⚠️  Pull conflicted. Using stash strategy..."
  git stash push -m "lens-work/sync/conflict/$(date +%Y%m%dT%H%M%S)"
  git pull origin main
  git stash pop 2>&1 | grep -v "^No stash entries found" || true
  output "✅ Sync completed with stash recovery"
  stashed=false
fi
```

---

### Step 4: Resolve Target Repo

```yaml
# Find target repo in service map
target_repo_config = find(
  service_map.repos,
  repo => repo.name == target_repo
)

if target_repo_config == null:
  error: "Target repo not found in service-map.yaml: ${target_repo}"
  hint: "Available repos: ${service_map.repos.map(r => r.name).join(', ')}"
  exit: 1

# Resolve local path relative to BMAD root
target_repo_path = target_repo_config.local_path
# Re-base if path is relative (handle both styles)
if ! path_is_absolute(target_repo_path):
  target_repo_path = "${project_root}/${target_repo_path}"

output: |
  📍 Target repo: ${target_repo}
  └── Path: ${target_repo_path}
```

---

### Step 5: Inspect Target Repo Branches

```bash
# Verify target repo exists
if [ ! -d "${target_repo_path}/.git" ]; then
  error: "Target repo not found or not a git repository"
  hint: "Expected path: ${target_repo_path}"
  exit 1
fi

cd "${target_repo_path}"

output "🔍 Scanning branches..."

# Fetch from remote to ensure fresh branch list
git fetch --all --prune 2>/dev/null || true

# Get all branches (local + remote-tracking) with last commit info
# Format: branch_name|commit_hash|commit_date (ISO)|commit_author|commit_subject
branches=$(git for-each-ref \
  --sort=-committerdate \
  --format='%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(authorname)|%(subject)' \
  refs/heads/ refs/remotes/origin/)

if [ -z "$branches" ]; then
  error: "No branches found in target repo"
  exit 1
fi

# Count branches
branch_count=$(echo "$branches" | wc -l)
output "✅ Found ${branch_count} branches"
```

---

### Step 6: Parse and Sort Branches by Recency

```yaml
# Parse branch output and create selection list
branch_list = []
for each line in branches_output:
  parts = line.split("|")
  branch_list.push({
    name: parts[0],
    commit_hash: parts[1],
    commit_date: parts[2],      # ISO format
    commit_author: parts[3],
    commit_subject: parts[4]
  })

# Sort by commit_date descending (most recent first)
branch_list.sort_by(b => b.commit_date, descending=true)

# Limit to top 10 most recent
branch_list_display = branch_list.slice(0, 10)

output: |
  📊 Most Recent Branches (Top 10)
```

---

### Step 7: Present Branch Selection Menu

```yaml
output: |
  🧭 Select target branch for ${initiative_id}
  
  ${for (i, branch) in enumerate(branch_list_display, start=1)}
  [${i}] ${branch.name}
       └─ ${branch.commit_date} | ${branch.commit_author}
       └─ ${branch.commit_subject}
  
  ${endfor}
  
  Or enter custom branch name: (type branch name or number)
  
  Special:
    [R] Reload (re-scan branches)
    [A] Show all branches
    [C] Cancel

read: selection

# Validate selection
if selection == "C":
  output "Cancelled. No branch selected."
  exit: 0

elif selection == "R":
  goto Step 5  # Re-scan branches

elif selection == "A":
  # Show all branches (paginated)
  for (i, branch) in enumerate(branch_list, start=1):
    output "[${i}] ${branch.name} | ${branch.commit_date}"
  read: selection
  # Validate numeric selection
  if is_numeric(selection):
    selected_index = int(selection) - 1
    if 0 <= selected_index < len(branch_list):
      selected_branch = branch_list[selected_index].name
    else:
      output "Invalid selection. Try again."
      goto Step 7

elif is_numeric(selection):
  selected_index = int(selection) - 1
  if 0 <= selected_index < len(branch_list_display):
    selected_branch = branch_list_display[selected_index].name
  else:
    output "Invalid selection. Try again."
    goto Step 7

else:
  # Custom branch name (validate it exists)
  custom_branch = selection
  if custom_branch in [b.name for b in branch_list]:
    selected_branch = custom_branch
  else:
    output: |
      ⚠️  Branch not found: ${custom_branch}
      
      [1] Try again with different name
      [2] Show branch list
      [3] Cancel
    read: retry_choice
    goto Retry logic...

# Get full details for selected branch
selected_branch_details = find(
  branch_list,
  b => b.name == selected_branch
)

output: |
  ✅ Selected: ${selected_branch}
  ├── Last commit: ${selected_branch_details.commit_date}
  ├── Author: ${selected_branch_details.commit_author}
  └── Message: ${selected_branch_details.commit_subject}
```

---

### Step 8: Checkout Selected Branch

```bash
cd "${target_repo_path}"

# Ensure we're on the selected branch
if ! git checkout "${selected_branch}" 2>/dev/null; then
  # Create local tracking branch if needed
  git checkout --track "origin/${selected_branch}" 2>/dev/null || \
    (git fetch origin "${selected_branch}" && git checkout "${selected_branch}")
fi

current_branch=$(git branch --show-current)
if [ "$current_branch" != "$selected_branch" ]; then
  error: "Failed to checkout ${selected_branch}"
  exit: 1
fi

output: |
  ✅ Checked out: ${selected_branch}
  
  Branch status:
  ├── Current: ${selected_branch}
  ├── Last commit: ${selected_branch_details.commit_hash}
  └── Date: ${selected_branch_details.commit_date}

# Return to BMAD control repo
cd "${project_root}"
```

---

### Step 9: Update User Profile

```yaml
# Update profile with sync result
profile.lens_work = profile.lens_work or {}
profile.lens_work.last_sync = {
  date: ${today},
  timestamp: ${now_ts},
  user: ${git_user},
  initiative_id: ${initiative_id},
  target_repo: ${target_repo}
}

profile.lens_work.selected_branch = {
  initiative_id: ${initiative_id},
  target_repo: ${target_repo},
  branch: ${selected_branch},
  commit_hash: ${selected_branch_details.commit_hash},
  commit_date: ${selected_branch_details.commit_date},
  commit_author: ${selected_branch_details.commit_author},
  timestamp: ${now_ts}
}

# Write back to profile file (git-ignored)
write_yaml(${profile_path}, profile)

output: |
  💾 Profile updated
  └── Next sync in 24 hours (or use /sync-now to force)
```

---

### Step 10: Log Event

```json
Append to event-log.jsonl:
{
  "ts": "${now_ts}",
  "event": "branch-sync",
  "user": "${git_user}",
  "initiative_id": "${initiative_id}",
  "target_repo": "${target_repo}",
  "selected_branch": "${selected_branch}",
  "commit_hash": "${selected_branch_details.commit_hash}",
  "commit_date": "${selected_branch_details.commit_date}",
  "cached": false
}
```

---

### Step 11: Return to Caller

```yaml
return:
  branch: ${selected_branch}
  commit_hash: ${selected_branch_details.commit_hash}
  commit_date: ${selected_branch_details.commit_date}
  cached: false
  timestamp: ${now_ts}
```

---

## Success Metrics

✅ Daily limit respected per user
✅ Control repo synced successfully (with stash fallback)
✅ Target repo branches scanned and sorted by recency
✅ User selection menu presented with 10 most recent branches
✅ Selected branch checked out in target repo
✅ Profile updated with sync timestamp and branch selection
✅ Event logged for audit trail
✅ Cache used on subsequent calls within same 24-hour period

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Profile not found | Run lens-work bootstrap first |
| Control repo not found | Ensure running from BMAD root |
| Target repo not in service-map | Update service-map.yaml |
| Target repo directory missing | Clone repo to expected path |
| No branches in target repo | Init repo with at least one commit |
| Checkout fails | Verify branch exists, try fetch + checkout |
| Stash conflicts | Manual conflict resolution needed |

