---
title: "Profile-Tracked Daily Sync Mechanism"
description: "User profile schema for lens-work branch synchronization with daily rate limiting"
version: "1.0.0"
date: "2026-02-09"
---

# Profile-Tracked Daily Sync Mechanism

## Overview

The lens-work system tracks **branch synchronization per user, per day** using the user's personal profile file (`_bmad-output/personal/profile.yaml`). This prevents excessive git operations while keeping branch selections fresh.

---

## Profile Schema

### Root Level

```yaml
name: string              # User's full name (e.g., "Cris Weber")
email: string             # User's email (e.g., "cris.weber@northstaret.com")
role: string              # User's role (e.g., "Architect", "Developer")
preferred_lane: string    # Preferred initiative size (small/medium/large)
created_at: ISO_8601      # ISO timestamp when profile was created

# Existing preferences section
preferences:
  auto_fetch: boolean     # Auto-fetch from remote on startup
  status_on_start: boolean # Show status check on startup
  color_output: boolean   # Color console output
```

### Lens-Work Section (NEW)

The `lens_work` section stores synchronization metadata and branch selections:

```yaml
lens_work:
  # Daily sync timestamp and metadata
  last_sync:
    date: string                     # ISO date (YYYY-MM-DD) of last sync
    timestamp: ISO_8601              # Full ISO timestamp of last sync
    user: string                     # Git user name at time of sync
    initiative_id: string            # Initiative being synced
    target_repo: string              # Target repository synced
  
  # Selected branch for current initiative
  selected_branch:
    initiative_id: string            # Initiative this branch belongs to
    target_repo: string              # Repository name
    branch: string                   # Branch name (e.g., main, develop)
    commit_hash: string              # SHA of last commit on branch
    commit_date: ISO_8601            # Timestamp of commit
    commit_author: string            # Author of last commit
    timestamp: ISO_8601              # When branch was selected/synced
```

---

## Daily Sync Workflow

### Decision Tree

```
User runs lens-work or /switch command
    ↓
Load profile from profile.yaml
    ↓
Check: last_sync.date == today?
    ├─ YES → Use cached branch selection
    │         └─ Display: "✅ Already synced today"
    │         └─ Continue with cached branch
    │
    └─ NO → Offer sync option
             ├─ User selects [1] Sync Now
             │   └─ Run sync-and-select-branch workflow
             │   └─ Update profile with new branch + today's date
             │   └─ Checkout selected branch in target repo
             │   └─ Continue
             │
             └─ User selects [2] Skip (use yesterday's branch)
                 └─ Continue with cached branch
```

---

## Sync Invocation Points

The sync check runs in these places:

### 1. **Startup** (`lens-work.start.prompt.md`)

```yaml
# Phase 0: Daily Sync Check
├─ Load profile
├─ Check if last_sync.date == today
├─ If NO: Offer [1] Sync or [2] Skip
└─ Continue to Compass activation
```

**Behavior:**
- Optional—user can skip
- Recommended for fresh branch list
- Cached selection available if skipped

---

### 2. **New Initiative** (`init-initiative/workflow.md`)

```yaml
# After initiative creation (step 10.5)
├─ For each target repo:
├─ Run sync-and-select-branch with force_sync=true
├─ Always syncs (ignores daily limit) on new initiative
└─ Checks out selected branch immediately
```

**Behavior:**
- **Mandatory** on new initiative creation
- `force_sync: true` bypasses daily limit
- Sets today's sync date in profile
- User cannot skip

---

### 3. **Context Switch** (`switch/workflow.md`)

```yaml
# Step 1.5: Check Daily Sync Status
├─ Load profile
├─ Check if last_sync.date == today
├─ If NO: Offer [1] Sync Now or [2] Skip
└─ Proceed with switch
```

**Behavior:**
- Offered as optional step during `/switch`
- Respects daily limit (won't force sync if already done today)
- User can choose to sync or continue with cached branch

---

### 4. **Force Sync** (`/sync-now` command)

```
User runs: /sync-now
    ↓
Compass routes to sync-and-select-branch workflow
    ↓
Parameters: force_sync=true
    ↓
Ignores daily limit, always syncs
    ↓
Updates profile with current timestamp
```

**Behavior:**
- Manual override command
- Available anytime
- Resets today's sync date in profile
- Useful after major branch activity

---

## Rate Limiting Logic

### Daily Limit Check

```bash
# In sync-and-select-branch workflow (Step 1)

profile = load("_bmad-output/personal/profile.yaml")
today = ISO_date()  # e.g., "2026-02-09"
last_sync_date = profile.lens_work.last_sync.date

if last_sync_date == today && force_sync == false:
  # Already synced today
  cached_branch = profile.lens_work.selected_branch.branch
  return: { branch: cached_branch, cached: true }
else:
  # First sync today OR force_sync=true
  # Run full sync sequence and update profile
  run_sync_sequence()
  profile.lens_work.last_sync.date = today
  save_profile()
  return: { branch: selected_branch, cached: false }
```

### Reset Behavior

The daily limit **resets at midnight** (ISO date change). Examples:

- **Sync on 2026-02-09 at 10:30 AM**
  - `last_sync.date = "2026-02-09"`
  - Subsequent calls before midnight: cached
  - After midnight (2026-02-10 00:00): fresh sync available

- **Force sync with `/sync-now`**
  - `last_sync.date = today` (updated)
  - Resets the daily clock
  - Next scheduled sync available tomorrow

---

## Profile Update Sequence

When sync completes successfully:

```yaml
# Step 9: Update User Profile

profile.lens_work.last_sync = {
  date: "2026-02-09",
  timestamp: "2026-02-09T14:30:45Z",
  user: "Cris Weber",
  initiative_id: "rate-limit-x7k2m9",
  target_repo: "bmadServer"
}

profile.lens_work.selected_branch = {
  initiative_id: "rate-limit-x7k2m9",
  target_repo: "bmadServer",
  branch: "main",
  commit_hash: "a1b2c3d4e5f6",
  commit_date: "2026-02-09T10:15:00Z",
  commit_author: "Jane Doe",
  timestamp: "2026-02-09T14:30:45Z"
}

# Write back (git-ignored)
write_yaml("_bmad-output/personal/profile.yaml", profile)
```

---

## Multiple Initiatives

When user has multiple initiatives:

### Same User, Different Initiatives

Each user's profile tracks **one selected branch at a time**. When switching initiatives:

```yaml
# Scenario: User has rate-limit-x7k2m9 and feature-y9k5p3

# Current state (on rate-limit)
profile.lens_work.selected_branch.initiative_id = "rate-limit-x7k2m9"
profile.lens_work.selected_branch.branch = "main"

# User runs: /switch
# → Switch to feature-y9k5p3
# → Check sync (daily limit applies)
# → If NO sync today:
#   → Offer: [1] Sync for feature-y9k5p3
#   → If accepted:
#     × Scan branches in feature-y9k5p3's target repo
#     × Update profile.selected_branch.initiative_id = "feature-y9k5p3"
#     × Checkout selected branch in target repo
#   → If skipped:
#     × Use previous selected_branch (from different initiative!)
#     × ⚠️ May not match feature-y9k5p3

# Note: To keep branch selection current per initiative,
# run sync each time switching (don't skip).
```

**Best Practice:** Users should run sync when switching to a different initiative to get fresh branch list for that initiative.

---

## Error Handling

### Profile Not Found

If `_bmad-output/personal/profile.yaml` doesn't exist:

```
Error: Profile not found
Hint: Run lens-work bootstrap to initialize your profile
```

**Recovery:**
```bash
# Bootstrap creates profile with empty lens_work section
# Then first sync populates it
```

### Corrupted Profile

If profile YAML is invalid:

```
Error: Failed to parse profile.yaml
Hint: Check file format or restore from backup
```

**Recovery:**
```bash
# Restore backup or delete to reinitialize:
rm _bmad-output/personal/profile.yaml
# Re-run lens-work startup
```

### Stale Sync Timestamp

If `last_sync.date` is in the future (clock skew):

```
⚠️  Sync timestamp is in the future
    Treating as "sync not today"
    Offering fresh sync
```

---

## Git-Ignored Profile

The profile file is **git-ignored** to prevent merge conflicts across collaborators:

```bash
# .gitignore
_bmad-output/personal/
_bmad-output/lens-work/state.yaml
```

Each user has their own local profile with their own daily sync timestamp and branch selection. This prevents conflicts when multiple collaborators work in the same control repo.

---

## Audit Trail

Sync events are logged to `event-log.jsonl`:

```json
{
  "ts": "2026-02-09T14:30:45Z",
  "event": "branch-sync",
  "user": "Cris Weber",
  "initiative_id": "rate-limit-x7k2m9",
  "target_repo": "bmadServer",
  "selected_branch": "main",
  "commit_hash": "a1b2c3d4e5f6",
  "commit_date": "2026-02-09T10:15:00Z",
  "cached": false
}
```

Log entries track:
- **Who** synced (user)
- **When** (ISO timestamp)
- **What** initiative and repo
- **Which** branch was selected
- **Cached or fresh** (true = used yesterday's selection, false = new sync)

---

## Configuration Migration

### From No Sync (Legacy)

Old workflows without daily sync:
```yaml
# Old profile.yaml
name: "Cris Weber"
email: "cris.weber@northstaret.com"
# ... no lens_work section
```

**First sync adds:**
```yaml
lens_work:
  last_sync: { ... }
  selected_branch: { ... }
```

### From Two-File State Only

Workflows using only `state.yaml` + `initiative.yaml` (no profile branch tracking):

The new system adds profile tracking transparently. Existing workflows continue to work; branch info is now also cached in profile for performance.

---

## Best Practices

### For Individual Contributors

1. **Run sync on startup** — Fresh branch list each morning
2. **Use `/sync-now` after git activity** — If you pull new branches externally
3. **Let daily limit work** — Don't force sync repeatedly same day
4. **Switch with sync** — Always sync when changing initiatives to get fresh branch list

### For Team Development

1. **Document branch conventions** in `service-map.yaml`
2. **Commit service-map.yaml** to version control
3. **Each user has own profile** — No merge conflicts
4. **Sync events logged** to `event-log.jsonl` (committed) for audit
5. **Profile is git-ignored** — Each user's local cache

---

## API Reference

### sync-and-select-branch Workflow

**Invocation:**
```yaml
invoke_workflow:
  path: "_bmad/lens-work/workflows/utility/sync-and-select-branch/workflow.md"
  params:
    initiative_id: string
    target_repo: string
    force_sync: boolean  # Optional, default: false
```

**Returns:**
```yaml
branch: string                    # Selected branch name
commit_hash: string              # Last commit SHA
commit_date: ISO_8601            # Commit timestamp
cached: boolean                  # true=cached, false=fresh sync
timestamp: ISO_8601              # When sync/cache occurred
```

### Compass Command

```
/sync-now

Syntax:  /sync-now
         /sync-now [initiative-id] [repo-name]

Examples:
  /sync-now                        # Force sync current initiative
  /sync-now rate-limit-x7k2m9 bmadServer
                                   # Force sync specific repo
```

---

## Troubleshooting

### Scenario: "Already synced today but branches changed"

**Problem:** New branch created but sync says "cached"

**Solution:**
```
Use /sync-now to force immediate sync
or wait until tomorrow (daily reset at midnight)
```

### Scenario: "Selected branch doesn't exist"

**Problem:** `profile.selected_branch.branch` was deleted

**Solution:**
```
Run /sync-now to scan branches again
Select new branch from current list
```

### Scenario: "Wrong branch for initiative"

**Problem:** Switched initiatives but branch cached from old initiative

**Solution:**
```
Run /sync-now when switching initiatives
Profile tracks one branch at a time, so always sync on switch
```

