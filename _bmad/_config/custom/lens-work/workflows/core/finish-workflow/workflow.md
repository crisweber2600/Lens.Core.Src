---
name: finish-workflow
description: Commit, push, and print PR link
agent: casey
trigger: Compass invokes when workflow completes
category: core
auto_triggered: true
---

# Finish Workflow

**Purpose:** Commit all changes, push workflow branch, and print PR link.

---

## Input Parameters

```yaml
workflow_name: string      # Current workflow from state
commit_message: string     # Optional custom message
```

---

## Execution Sequence

### 0. Validate Branch & Sync

```bash
# Verify we're on a workflow branch
# Pattern: {featureBranchRoot}-{audience}-p{N}-{workflow}  (flat, hyphen-separated)
current_branch=$(git branch --show-current)

# Branch must contain -(small|medium|large)-p{N}-{workflow}
# Valid: chat-spark-backend-xyz-small-p1-brainstorm
# Invalid: main, chat-spark-backend-xyz, chat-spark-backend-xyz-small
if [[ ! "$current_branch" =~ -(small|medium|large)-p[0-9]+-[a-z0-9]+([-][a-z0-9]+)*$ ]]; then
  error "Not on a workflow branch: $current_branch"
  error "Expected pattern: {featureBranchRoot}-{audience}-p{N}-{workflow}"
  exit 1
fi

# Ensure branch is checked out and up to date
git checkout "$current_branch"
git fetch origin
```

### 1. Stage Changes

```bash
# Stage all changes in BMAD control repo
git add -A
```

### 2. Commit

```bash
# Default message format
commit_msg="${commit_message:-[lens-work] Complete ${workflow_name}}"
git commit -m "${commit_msg}"
```

### 3. Push

```bash
# Push workflow branch
current_branch=$(git branch --show-current)
git push -u origin "${current_branch}"
```

### 4. Generate PR Link

```bash
# Detect remote type
remote_url=$(git remote get-url origin)

# Parse components from flat branch: {featureBranchRoot}-{audience}-p{N}-{workflow}
# e.g., chat-spark-backend-xyz-small-p1-brainstorm
# Extract review_size, phase, workflow, and featureBranchRoot
review_size=$(echo ${current_branch} | sed -E "s/.*-(small|medium|large)-p[0-9]+-.*/\1/")
phase_segment=$(echo ${current_branch} | grep -oP '(?<=-(small|medium|large)-)p[0-9]+')
workflow=$(echo ${current_branch} | sed -E "s/.*-p[0-9]+-//")
featureBranchRoot=$(echo ${current_branch} | sed -E "s/-(small|medium|large)-p[0-9]+-.*//")

# Target is the phase branch (without workflow suffix)
# e.g., chat-spark-backend-xyz-small-p1
target_branch="${featureBranchRoot}-${review_size}-${phase_segment}"
source_branch="${current_branch}"

# Generate PR link based on remote type
if [[ "$remote_url" == *"github.com"* ]]; then
  pr_link="https://github.com/${org}/${repo}/compare/${target_branch}...${source_branch}"
elif [[ "$remote_url" == *"gitlab.com"* ]]; then
  pr_link="https://gitlab.com/${org}/${repo}/-/merge_requests/new?source_branch=${source_branch}&target_branch=${target_branch}"
elif [[ "$remote_url" == *"dev.azure.com"* ]]; then
  pr_link="https://dev.azure.com/${org}/${project}/_git/${repo}/pullrequestcreate?sourceRef=${source_branch}&targetRef=${target_branch}"
fi
```

### 4a. Load PAT and Create PR (HARD GATE)

```yaml
# Load user profile for git credentials
profile = load("_bmad-output/personal/profile.yaml")

# Determine which host PAT to use by matching remote URL
remote_host = extract_hostname(remote_url)  # e.g., "github.com"

pat = null
if profile.git_credentials != null:
  for cred in profile.git_credentials:
    if cred.host == remote_host:
      pat = cred.pat
      break

if pat == null:
  error: |
    ⚠️ HARD GATE: No PAT found for host '${remote_host}'
    ├── Run @scout onboard to configure git credentials
    ├── Or manually add to _bmad-output/personal/profile.yaml:
    │   git_credentials:
    │     - host: "${remote_host}"
    │       pat: "your-pat-here"
    │       type: "github"  # or "gitlab", "azure"
    └── Then re-run this workflow
  exit: 1
```

```bash
# Create actual PR using GitHub CLI (or equivalent for other hosts)
if [[ "$remote_url" == *"github.com"* ]]; then
  # Parse org/repo from remote URL
  org_repo=$(echo "$remote_url" | sed -E 's|https://github\.com/||; s|\.git$||')
  
  export GH_TOKEN="${pat}"
  
  pr_result=$(gh pr create \
    --repo "${org_repo}" \
    --base "${target_branch}" \
    --head "${source_branch}" \
    --title "feat(${featureBranchRoot}): Complete ${workflow_name}" \
    --body "## Workflow Complete: ${workflow_name}

**Initiative:** ${featureBranchRoot}
**Phase:** ${phase_segment}
**Review audience:** ${review_size}
**Branch:** ${source_branch} → ${target_branch}

### Changes
All artifacts from the ${workflow_name} workflow.

---
*Created automatically by lens-work finish-workflow*" 2>&1)
  
  pr_exit_code=$?
  
  if [ $pr_exit_code -ne 0 ]; then
    # Check if PR already exists
    if echo "$pr_result" | grep -q "already exists"; then
      echo "ℹ️ PR already exists for this branch"
      pr_url=$(gh pr view "${source_branch}" --repo "${org_repo}" --json url -q '.url' 2>/dev/null)
    else
      echo "❌ HARD GATE: PR creation failed"
      echo "├── Error: ${pr_result}"
      echo "├── Source: ${source_branch}"
      echo "├── Target: ${target_branch}"
      echo "└── Fix the issue and re-run finish-workflow"
      exit 1
    fi
  else
    pr_url="${pr_result}"
  fi

elif [[ "$remote_url" == *"gitlab.com"* ]]; then
  # GitLab: Use API to create merge request
  org_repo=$(echo "$remote_url" | sed -E 's|https://gitlab\.com/||; s|\.git$||')
  encoded_repo=$(echo "$org_repo" | sed 's|/|%2F|g')
  
  pr_result=$(curl -s -X POST \
    "https://gitlab.com/api/v4/projects/${encoded_repo}/merge_requests" \
    -H "PRIVATE-TOKEN: ${pat}" \
    -d "source_branch=${source_branch}" \
    -d "target_branch=${target_branch}" \
    -d "title=feat(${featureBranchRoot}): Complete ${workflow_name}" \
    -d "description=Workflow ${workflow_name} complete for ${featureBranchRoot}")
  
  pr_url=$(echo "$pr_result" | jq -r '.web_url // empty')
  
  if [ -z "$pr_url" ]; then
    echo "❌ HARD GATE: MR creation failed"
    echo "├── Response: ${pr_result}"
    echo "└── Fix the issue and re-run finish-workflow"
    exit 1
  fi

elif [[ "$remote_url" == *"dev.azure.com"* ]]; then
  # Azure DevOps: Use REST API to create pull request
  # Extract org, project, repo from URL format: https://dev.azure.com/{org}/{project}/_git/{repo}
  ado_org=$(echo "$remote_url" | sed -E 's|https://dev\.azure\.com/([^/]+)/.*|\1|')
  ado_project=$(echo "$remote_url" | sed -E 's|https://dev\.azure\.com/[^/]+/([^/]+)/.*|\1|')
  ado_repo=$(echo "$remote_url" | sed -E 's|.*/_git/([^/]+)(\.git)?$|\1|')
  
  pr_result=$(curl -s -X POST \
    "https://dev.azure.com/${ado_org}/${ado_project}/_apis/git/repositories/${ado_repo}/pullrequests?api-version=7.0" \
    -H "Authorization: Basic $(echo -n ":${pat}" | base64)" \
    -H "Content-Type: application/json" \
    -d "{\"sourceRefName\":\"refs/heads/${source_branch}\",\"targetRefName\":\"refs/heads/${target_branch}\",\"title\":\"feat(${featureBranchRoot}): Complete ${workflow_name}\"}")
  
  pr_url=$(echo "$pr_result" | jq -r '.url // empty')
  
  if [ -z "$pr_url" ]; then
    echo "❌ HARD GATE: PR creation failed"
    echo "├── Response: ${pr_result}"
    echo "└── Fix the issue and re-run finish-workflow"
    exit 1
  fi

else
  echo "⚠️ Unknown remote type: ${remote_url}"
  echo "├── PR link (manual): ${pr_link}"
  echo "└── Create PR manually before proceeding"
  pr_url="${pr_link}"
fi

echo "✅ PR created: ${pr_url}"
```

### 4b. Advance to Next Phase Branch

```yaml
# Determine next phase branch
# Current: {featureBranchRoot}-{audience}-p{N}-{workflow}
# Next phase: needs review_audience_map lookup for next phase
next_phase_number = int(phase_segment.replace("p", "")) + 1

# Phase map for branch naming
phase_max = 4  # 4 phases: Analysis, Planning, Solutioning, Implementation

# Look up next review audience from initiative config
# review_audience_map: {p1: small, p2: medium, p3: large, p4: large}
if next_phase_number <= phase_max:
  next_review_size = initiative.review_audience_map["p${next_phase_number}"]
  next_branch = "${featureBranchRoot}-${next_review_size}-p${next_phase_number}"
  
  output: |
    🔄 Advancing to next phase branch...
    ├── Current: ${current_branch}
    ├── Next: ${next_branch}
    └── Review audience escalation: ${review_size} → ${next_review_size}
```

```bash
# Only advance if not on the last phase
if [ ${next_phase_number} -le ${phase_max} ]; then
  # Check if next phase branch exists
  if git rev-parse --verify "origin/${next_branch}" >/dev/null 2>&1; then
    git checkout "${next_branch}"
    git pull origin "${next_branch}"
    echo "✅ Switched to: ${next_branch}"
  else
    # Create next phase branch from its review audience branch
    audience_branch="${featureBranchRoot}-${next_review_size}"
    git checkout "${audience_branch}"
    git pull origin "${audience_branch}"
    git checkout -b "${next_branch}"
    git push -u origin "${next_branch}"
    echo "✅ Created and switched to: ${next_branch}"
  fi
else
  echo "ℹ️ Final phase reached. Staying on current branch."
  echo "└── Next: Merge phase branch into ${review_size} audience via PR"
fi
```

### 5. Update State

```yaml
# Update gates in state.yaml
gates:
  - name: "${review_size}-${phase_segment}-${workflow}"
    status: completed
    completed_at: "${ISO_TIMESTAMP}"
    pr_url: "${pr_url}"
    pr_link: "${pr_link}"

current:
  workflow_status: completed
  pr_created: true
  pr_url: "${pr_url}"
```

### 6. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"finish-workflow","workflow":"${workflow_name}","pr_url":"${pr_url}","pr_link":"${pr_link}","next_branch":"${next_branch}"}
```

### 7. Output

```
✅ Workflow complete: ${workflow_name}
├── Committed: ${commit_hash}
├── Pushed: ${current_branch}
├── PR Created: ${pr_url}
├── PR Link: ${pr_link}
├── Advanced to: ${next_branch}
└── HARD GATE: PR must be merged before next phase can finish
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Nothing to commit | Warn but continue (empty workflow) |
| Push rejected | Pull + rebase, then retry |
| Remote type unknown | Output manual PR instructions with link |
| **No PAT found** | **HARD GATE: Run @scout onboard to configure credentials** |
| **PR creation failed** | **HARD GATE: Fix issue and re-run finish-workflow** |
| **PR already exists** | Use existing PR URL, continue |
| Next branch exists | Checkout and pull latest |
| Next branch missing | Create from review audience branch |
