---
name: check-repos
description: "Validate repository health and sync status"
agent: "@lens/discovery"
trigger: "Manual or via onboarding"
category: utility
---

# Check Repos Workflow

**Purpose:** Validate repository health, sync status, and configuration for all tracked repos or a specific repo.

---

## Input Parameters

```yaml
repo_name: string | null   # Optional — if omitted, check all repos from service-map.yaml and repo-inventory.yaml
```

---

## Execution Sequence

### Step 1: Load Configuration

```yaml
# ── Governance repo (always loaded from governance-setup.yaml) ───────────
gov_setup_path = "_bmad-output/lens-work/governance-setup.yaml"
gov_setup = null
if file_exists(gov_setup_path):
  gov_setup = load(gov_setup_path)

# ── Service map (optional — may not exist for template repos) ────────────
service_map_paths:
  - "_bmad/lens-work/service-map.yaml"
  - "_lens/domain-map.yaml"
  - "lens/domain-map.yaml"

service_map = null
for path in service_map_paths:
  if file_exists(path):
    service_map = load(path)
    break

# At least one source must exist
if service_map == null and gov_setup == null:
  output: |
    ❌ No repo configuration found.
    
    Provide at least one of:
    - _bmad-output/lens-work/governance-setup.yaml  (governance repo)
    - _bmad/lens-work/service-map.yaml              (full service map)
    
    Run bootstrap or copy governance-setup.example.yaml first.
  exit: 1

# Load repo inventory if available (supplements other sources)
inventory = null
inventory_path = "_bmad-output/lens-work/repo-inventory.yaml"
if file_exists(inventory_path):
  inventory = load(inventory_path)

# Build consolidated repo list
repos_to_check = []

# 1. Add governance repo from governance-setup.yaml (authoritative source)
if gov_setup != null:
  repos_to_check.append({
    name: gov_setup.repo.name,
    expected_path: gov_setup.repo.local_path,
    expected_remote: gov_setup.repo.remote_url,
    expected_branch: gov_setup.repo.default_branch or "main",
    role: "governance",
    source: "governance-setup",
    critical: true,
    missing_message: |
      ❌ Governance repo '${gov_setup.repo.name}' is not cloned at ${gov_setup.repo.local_path}.
      
      This repo holds universal artifacts (constitutions, roster, policies) that
      are shared across all initiatives.  Without it, governance workflows will fail.
      
      Clone it now:
        git clone ${gov_setup.repo.remote_url} ${gov_setup.repo.local_path}
      then retry.
  })

# 2. Add repos from service map (if present), skipping governance if already added
if service_map != null:
  for repo in service_map.repos:
    # Skip governance repo if already loaded from governance-setup.yaml
    if gov_setup != null and repo.name == gov_setup.repo.name:
      continue
    repos_to_check.append({
      name: repo.name,
      expected_path: repo.local_path or "TargetProjects/${repo.name}",
      expected_remote: repo.remote_url or null,
      expected_branch: repo.default_branch or "main",
      role: repo.role or "target",
      source: "service-map"
    })

# 3. Flag any remaining governance-role repos from service map
for repo in repos_to_check:
  if repo.role == "governance" and not repo.get("critical"):
    repo.critical = true
    repo.missing_message = |
      ❌ Governance repo '${repo.name}' is not cloned at ${repo.expected_path}.
      
      This repo holds universal artifacts (constitutions, roster, policies) that
      are shared across all initiatives.  Without it, governance workflows will fail.
      
      Clone it now:
        git clone ${repo.expected_remote} ${repo.expected_path}
      then retry.

# Add any inventory-only repos not already in list
if inventory != null:
  for repo in inventory.repos.extra:
    if repo.name not in [r.name for r in repos_to_check]:
      repos_to_check.append({
        name: repo.name,
        expected_path: repo.path,
        expected_remote: null,
        expected_branch: "main",
        source: "inventory-extra"
      })

# Filter to single repo if specified
if repo_name != null:
  repos_to_check = [r for r in repos_to_check if r.name == repo_name]
  if repos_to_check.length == 0:
    output: |
      ❌ Repo '${repo_name}' not found in service map or inventory.
      
      Available repos:
      ${for repo in service_map.repos}
        - ${repo.name}
      ${endfor}
    exit: 1
```

---

### Step 2: Health Checks

```yaml
results = []

for repo in repos_to_check:
  check = {
    name: repo.name,
    path: repo.expected_path,
    issues: [],
    status: "healthy"  # healthy | warning | error
  }
```

```bash
  repo_path="${repo.expected_path}"
  
  # Check 1: Repo directory exists
  if [ ! -d "${repo_path}" ]; then
    echo "ISSUE:missing:Repo directory not found at ${repo_path}"
    continue
  fi
  
  # Check 2: Valid git repo
  if ! git -C "${repo_path}" rev-parse --git-dir > /dev/null 2>&1; then
    echo "ISSUE:not-git:Directory exists but is not a valid git repository"
    continue
  fi
  
  # Check 3: Remote URL matches expected
  actual_remote=$(git -C "${repo_path}" remote get-url origin 2>/dev/null || echo "no-remote")
  expected_remote="${repo.expected_remote}"
  if [ -n "${expected_remote}" ] && [ "${actual_remote}" != "${expected_remote}" ]; then
    echo "ISSUE:remote-mismatch:Expected remote '${expected_remote}', got '${actual_remote}'"
  fi
  
  # Check 4: Current branch
  current_branch=$(git -C "${repo_path}" branch --show-current 2>/dev/null || echo "detached")
  expected_branch="${repo.expected_branch}"
  echo "INFO:branch:${current_branch}"
  
  # Check 5: Uncommitted changes
  uncommitted=$(git -C "${repo_path}" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "${uncommitted}" -gt 0 ]; then
    echo "ISSUE:uncommitted:${uncommitted} uncommitted changes"
  fi
  
  # Check 6: Sync status with remote
  git -C "${repo_path}" fetch origin "${current_branch}" --quiet 2>/dev/null
  
  behind=$(git -C "${repo_path}" rev-list --count "HEAD..@{u}" 2>/dev/null || echo "0")
  ahead=$(git -C "${repo_path}" rev-list --count "@{u}..HEAD" 2>/dev/null || echo "0")
  
  if [ "${behind}" -gt 0 ]; then
    echo "ISSUE:behind:${behind} commits behind remote"
  fi
  if [ "${ahead}" -gt 0 ]; then
    echo "INFO:ahead:${ahead} commits ahead of remote"
  fi
```

```yaml
  # Classify result
  if "missing" in check.issues or "not-git" in check.issues:
    check.status = "error"
  elif check.issues.length > 0:
    check.status = "warning"
  else:
    check.status = "healthy"

  results.append(check)
```

---

### Step 3: Report

```yaml
# Count by status
healthy_count = count(results, status == "healthy")
warning_count = count(results, status == "warning")
error_count = count(results, status == "error")

# Status icons
icon_map = {
  "healthy": "✅",
  "warning": "⚠️",
  "error": "❌"
}

output: |
  📋 Repository Health Check
  ═══════════════════════════════════════════════════
  Checked: ${results.length} repos
  
  ${for repo in results}
  ${icon_map[repo.status]} ${repo.name} — ${repo.summary}
  ${if repo.issues.length > 0}
  ${for issue in repo.issues}
     └── ${issue.type}: ${issue.detail}
  ${endfor}
  ${endif}
  ${endfor}
  
  ═══════════════════════════════════════════════════
  Summary: ${healthy_count} healthy, ${warning_count} warnings, ${error_count} errors
```

---

### Step 4: Fix Suggestions

```yaml
if error_count + warning_count > 0:
  output: |
    🔧 Suggested Fixes
    ═══════════════════════════════════════════════════

  for repo in results:
    if repo.status == "healthy":
      continue

    for issue in repo.issues:
      fix = get_fix(issue)
      output: |
        ${repo.name} — ${issue.type}
        └── ${fix.command}
            ${fix.explanation}

  output: |
    ═══════════════════════════════════════════════════
    
    Run fixes manually or use '@lens reconcile' to auto-fix missing repos.
```

```yaml
# Fix suggestion lookup
fix_suggestions:
  missing:
    command: "git clone ${repo.expected_remote} ${repo.expected_path}"
    explanation: "Clone the repository to the expected TargetProjects path."
  
  not-git:
    command: "rm -rf ${repo.expected_path} && git clone ${repo.expected_remote} ${repo.expected_path}"
    explanation: "Remove corrupted directory and re-clone."
  
  remote-mismatch:
    command: "git -C ${repo.expected_path} remote set-url origin ${repo.expected_remote}"
    explanation: "Update the remote URL to match service map."
  
  uncommitted:
    command: "git -C ${repo.expected_path} stash  # or: git -C ${repo.expected_path} add -A && git -C ${repo.expected_path} commit -m 'WIP'"
    explanation: "Stash or commit uncommitted changes."
  
  behind:
    command: "git -C ${repo.expected_path} pull origin ${repo.current_branch}"
    explanation: "Pull latest changes from remote."
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Service map not found | Suggest running bootstrap first |
| Git not installed | Error with install instructions |
| Network unreachable | Skip remote sync checks, report partial results |
| Permission denied on repo | Report and skip, suggest checking SSH keys |
| Repo in detached HEAD | Report as warning, suggest checkout of default branch |

---

## Post-Conditions

- [ ] All repos in service map checked for existence and health
- [ ] Sync status with remote verified for each repo
- [ ] Issues classified as error (missing/broken) or warning (dirty/behind)
- [ ] Fix suggestions provided for every issue found
- [ ] Summary report displayed with counts
