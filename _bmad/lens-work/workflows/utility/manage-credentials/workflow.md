---
name: manage-credentials
description: Add, update, remove, or view git host credentials (PATs) in user profile
agent: "@lens/discovery"
trigger: '@lens /credentials or @lens credentials'
category: utility
---

# Manage Credentials

**Purpose:** Interactive management of git host PATs stored in the user profile. These credentials are required for PR creation hard gates in finish-workflow and finish-phase.

---

## Input Parameters

```yaml
# None required — interactive workflow
```

---

## Execution Sequence

### 0. Load Profile

```yaml
profile_path = "_bmad-output/personal/profile.yaml"

if not file_exists(profile_path):
  output: |
    ⚠️ No profile found. Run @lens onboard first to create your profile.
  exit: 1

profile = load(profile_path)
git_credentials = profile.git_credentials or []
detected_hosts = profile.detected_git_hosts or []
```

### 1. Display Current Credentials

```yaml
output: |
  🔑 Git Credentials Manager
  ═══════════════════════════
  
  ${if git_credentials.length > 0}
  Current credentials:
  ${for i, cred in enumerate(git_credentials)}
    [${i+1}] ${cred.host} (${cred.type})
        ├── PAT: ${cred.pat[:4]}${"*" * 20}...${cred.pat[-4:]}
        └── Configured: ${cred.configured_at}
  ${endfor}
  ${else}
  No credentials configured.
  ${endif}
  
  ${if unconfigured_hosts.length > 0}
  Detected but unconfigured hosts:
  ${for host in unconfigured_hosts}
    - ${host}
  ${endfor}
  ${endif}

output: |
  
  Actions:
  [1] Add new credential
  [2] Update existing credential
  [3] Remove credential
  [4] Re-detect hosts from repos
  [5] Test credentials
  [6] Done

action = prompt_user("[1-6]")
```

### 2. Add New Credential

```yaml
if action == "1":
  # Show known hosts or allow custom
  output: |
    Enter git host (e.g., github.com, gitlab.com, dev.azure.com):
    ${if unconfigured_hosts.length > 0}
    Or select detected host:
    ${for i, host in enumerate(unconfigured_hosts)}
      [${i+1}] ${host}
    ${endfor}
    ${endif}
  
  host_input = prompt_user()
  
  # Resolve host
  if host_input.isdigit() and int(host_input) <= unconfigured_hosts.length:
    host = unconfigured_hosts[int(host_input) - 1]
  else:
    host = host_input
  
  # Classify host type
  host_type = classify_host(host)  # github/gitlab/azure-devops/bitbucket/generic
  
  # Show host-specific PAT creation instructions
  show_pat_instructions(host, host_type)
  
  pat = prompt_user("Enter PAT:", sensitive=true)
  
  if pat != "":
    git_credentials.append({
      host: host,
      type: host_type,
      pat: pat,
      configured_at: now_iso()
    })
    
    # Update profile
    profile.git_credentials = git_credentials
    if host not in detected_hosts:
      detected_hosts.append(host)
      profile.detected_git_hosts = detected_hosts
    save(profile, profile_path)
    
    output: "✅ Credential added for ${host}"
```

### 3. Update Existing Credential

```yaml
if action == "2":
  if git_credentials.length == 0:
    output: "No credentials to update. Use [1] to add."
  else:
    output: "Select credential to update [1-${git_credentials.length}]:"
    idx = int(prompt_user()) - 1
    
    if 0 <= idx < git_credentials.length:
      cred = git_credentials[idx]
      output: "Current PAT for ${cred.host}: ${cred.pat[:4]}****"
      
      new_pat = prompt_user("Enter new PAT:", sensitive=true)
      if new_pat != "":
        git_credentials[idx].pat = new_pat
        git_credentials[idx].configured_at = now_iso()
        profile.git_credentials = git_credentials
        save(profile, profile_path)
        output: "✅ Credential updated for ${cred.host}"
```

### 4. Remove Credential

```yaml
if action == "3":
  if git_credentials.length == 0:
    output: "No credentials to remove."
  else:
    output: "Select credential to remove [1-${git_credentials.length}]:"
    idx = int(prompt_user()) - 1
    
    if 0 <= idx < git_credentials.length:
      removed = git_credentials.pop(idx)
      profile.git_credentials = git_credentials
      save(profile, profile_path)
      output: "✅ Credential removed for ${removed.host}"
```

### 5. Re-Detect Hosts

```yaml
if action == "4":
  # Re-scan all remotes
  remote_urls = []
  
  # Control repo
  control_remote = shell("git remote get-url origin 2>/dev/null") or ""
  if control_remote != "":
    remote_urls.append(control_remote)
  
  # Repo inventory
  if file_exists("_bmad-output/lens-work/repo-inventory.yaml"):
    inventory = load("_bmad-output/lens-work/repo-inventory.yaml")
    for repo in inventory.repos:
      if repo.remote and repo.remote != "no-remote":
        remote_urls.append(repo.remote)
  
  # Service map
  if file_exists("_bmad/lens-work/service-map.yaml"):
    sm = load("_bmad/lens-work/service-map.yaml")
    for repo in sm.repos:
      if repo.remote_url:
        remote_urls.append(repo.remote_url)
  
  # Extract unique hosts
  new_hosts = []
  for url in remote_urls:
    host = extract_hostname(url)
    if host not in new_hosts:
      new_hosts.append(host)
  
  profile.detected_git_hosts = new_hosts
  save(profile, profile_path)
  
  output: |
    🔍 Re-detected ${new_hosts.length} host(s):
    ${for host in new_hosts}
      - ${host} ${if host in [c.host for c in git_credentials]}(configured)${else}(not configured)${endif}
    ${endfor}
```

### 6. Test Credentials

```yaml
if action == "5":
  if git_credentials.length == 0:
    output: "No credentials to test."
  else:
    output: "Testing credentials..."
    
    for cred in git_credentials:
      if cred.type == "github" or cred.type == "github_enterprise":
        # Derive API base URL: github.com → api.github.com, GHE → {host}/api/v3
        api_base = "https://api.github.com" if cred.host == "github.com" else "https://${cred.host}/api/v3"
        result = shell("curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: token ${cred.pat}' ${api_base}/user")
        if result == "200":
          output: "  ✅ ${cred.host}: Valid"
        else:
          output: "  ❌ ${cred.host}: Invalid (HTTP ${result})"
      
      elif cred.type == "gitlab":
        result = shell("curl -s -o /dev/null -w '%{http_code}' -H 'PRIVATE-TOKEN: ${cred.pat}' https://${cred.host}/api/v4/user")
        if result == "200":
          output: "  ✅ ${cred.host}: Valid"
        else:
          output: "  ❌ ${cred.host}: Invalid (HTTP ${result})"
      
      elif cred.type == "azure-devops":
        result = shell("curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Basic $(echo -n :${cred.pat} | base64)' https://dev.azure.com/_apis/projects?api-version=7.0")
        if result == "200":
          output: "  ✅ ${cred.host}: Valid"
        else:
          output: "  ❌ ${cred.host}: Invalid (HTTP ${result})"
      
      else:
        output: "  ⚠️ ${cred.host}: Cannot test (${cred.type} — manual verification needed)"
```

---

## Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"manage-credentials","action":"${action}","hosts_configured":${git_credentials.length}}
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Profile not found | Direct to @lens onboard |
| Invalid PAT format | Warn but accept (validation happens at test) |
| Test fails | Report HTTP code, suggest regenerating PAT |
| Network unreachable | Skip test, warn user |
