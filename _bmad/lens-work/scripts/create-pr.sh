#!/usr/bin/env bash
# REQ-8: PR creation with PAT+curl or manual URL fallback
# Usage: create-pr.sh <head_branch> <base_branch> <title> <body>
#
# Exit codes:
#   0 = PR created successfully
#   1 = Manual fallback (no PAT or no remote)
#   2 = API error

set -euo pipefail

HEAD_BRANCH="${1:?Usage: create-pr.sh <head> <base> <title> <body>}"
BASE_BRANCH="${2:?Missing base branch}"
PR_TITLE="${3:?Missing PR title}"
PR_BODY="${4:-}"

# --- Credential Loading ---
CRED_FILE="_bmad-output/lens-work/personal/github-credentials.yaml"

load_pat() {
  if [[ ! -f "$CRED_FILE" ]]; then
    return 1
  fi
  # Simple yaml parsing for pat field
  PAT=$(grep -E '^\s*pat:' "$CRED_FILE" | head -1 | sed 's/.*pat:\s*["'\'']\?\([^"'\'']*\)["'\'']\?\s*$/\1/')
  if [[ -z "$PAT" || "$PAT" == "null" ]]; then
    return 1
  fi
  echo "$PAT"
}

# --- Remote Parsing ---
get_remote_info() {
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ -z "$remote_url" ]]; then
    return 1
  fi
  
  # Parse owner/repo from HTTPS or SSH URL
  if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
  else
    return 1
  fi
}

# --- Manual Fallback ---
manual_fallback() {
  local reason="$1"
  echo "⚠️  Cannot auto-create PR: ${reason}"
  
  if get_remote_info 2>/dev/null; then
    local compare_url="https://github.com/${OWNER}/${REPO}/compare/${BASE_BRANCH}...${HEAD_BRANCH}?expand=1&title=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PR_TITLE}'))" 2>/dev/null || echo "${PR_TITLE}")"
    echo "📋 Create PR manually:"
    echo "   ${compare_url}"
  else
    echo "📋 Create PR manually from ${HEAD_BRANCH} → ${BASE_BRANCH}"
  fi
  exit 1
}

# --- Main ---
PAT=$(load_pat) || manual_fallback "No PAT configured in ${CRED_FILE}"
get_remote_info || manual_fallback "Cannot parse GitHub remote URL"

# Create PR via GitHub API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/pulls" \
  -d "{
    \"title\": \"${PR_TITLE}\",
    \"body\": \"${PR_BODY}\",
    \"head\": \"${HEAD_BRANCH}\",
    \"base\": \"${BASE_BRANCH}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]]; then
  PR_URL=$(echo "$BODY" | grep -o '"html_url":\s*"[^"]*"' | head -1 | sed 's/"html_url":\s*"\(.*\)"/\1/')
  PR_NUMBER=$(echo "$BODY" | grep -o '"number":\s*[0-9]*' | head -1 | sed 's/"number":\s*//')
  echo "✅ PR #${PR_NUMBER} created: ${PR_URL}"
  exit 0
elif [[ "$HTTP_CODE" == "422" ]]; then
  # PR may already exist
  EXISTING=$(echo "$BODY" | grep -o '"message":\s*"[^"]*"' | head -1)
  echo "⚠️  PR already exists or validation error: ${EXISTING}"
  manual_fallback "API 422: ${EXISTING}"
else
  echo "❌ API error (HTTP ${HTTP_CODE})"
  manual_fallback "API returned HTTP ${HTTP_CODE}"
fi
