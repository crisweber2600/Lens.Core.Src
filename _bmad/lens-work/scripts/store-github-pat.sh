#!/usr/bin/env bash
# ============================================================
# LENS Workbench — GitHub PAT Storage Script
# store-github-pat.sh
#
# PURPOSE:
#   Securely stores GitHub Personal Access Tokens outside of
#   any LLM/AI chat context — PATs are NEVER entered into Copilot
#   or any other AI assistant.
#
# USAGE:
#   cd <project-root>
#   bash _bmad/lens-work/scripts/store-github-pat.sh
#
# OUTPUT:
#   Environment variables: GITHUB_PAT, GH_ENTERPRISE_TOKEN
#   (set in current session; user must persist to shell profile)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
PROFILE_FILE="${PROJECT_ROOT}/_bmad-output/lens-work/personal/profile.yaml"
INVENTORY_FILE="${PROJECT_ROOT}/_bmad-output/lens-work/repo-inventory.yaml"

# -- Colors --------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN} LENS Workbench — GitHub PAT Setup${RESET}"
echo "===================================="
echo ""
echo -e "${YELLOW}[WARN]  SECURITY: PATs entered here are stored ONLY in:${RESET}"
echo "   ${PROFILE_FILE}"
echo "   This file is gitignored and never committed."
echo "   PATs enable automated PR creation in phase workflows."
echo ""

# -- Check for environment variables -------------------------
ENV_VARS_FOUND=()
if [[ -n "${GITHUB_PAT:-}" ]]; then
  ENV_VARS_FOUND+=("GITHUB_PAT (github.com)")
fi
if [[ -n "${GH_ENTERPRISE_TOKEN:-}" ]]; then
  ENV_VARS_FOUND+=("GH_ENTERPRISE_TOKEN (enterprise)")
fi
if [[ -n "${GH_TOKEN:-}" ]]; then
  ENV_VARS_FOUND+=("GH_TOKEN (fallback)")
fi

if [[ ${#ENV_VARS_FOUND[@]} -gt 0 ]]; then
  echo -e "${GREEN}[OK] PAT environment variable(s) detected:${RESET}"
  for ev in "${ENV_VARS_FOUND[@]}"; do
    echo -e "   - ${ev}"
  done
  echo ""
  echo -e "   The promote-branch script will use these automatically."
  echo -e "   ${CYAN}Lookup order:${RESET}"
  echo -e "     github.com:  GITHUB_PAT -> GH_TOKEN -> profile.yaml"
  echo -e "     Enterprise:  GH_ENTERPRISE_TOKEN -> GH_TOKEN -> profile.yaml"
  echo ""
  echo -e "   Do you also want to store PATs in profile.yaml? ${BOLD}(y/N)${RESET}"
  read -r STORE_ENV_PAT
  if [[ ! "$STORE_ENV_PAT" =~ ^[yY] ]]; then
    echo ""
    echo -e "${GREEN}${BOLD}[OK] Using environment variables. No profile changes needed.${RESET}"
    echo -e "   promote-branch.sh will pick up PATs from the environment."
    echo ""
    exit 0
  fi
  echo ""
fi

# -- Ensure output directory exists --------------------------
mkdir -p "$(dirname "${PROFILE_FILE}")"

# -- Load existing profile or initialize ----------------------
EXISTING_CREDENTIALS=()
if [[ -f "${PROFILE_FILE}" ]]; then
  # Parse existing git_credentials from profile.yaml
  IN_CREDS=false
  CURRENT_HOST=""
  CURRENT_TYPE=""
  CURRENT_PAT=""
  CURRENT_DATE=""
  
  while IFS= read -r line; do
    if [[ "$line" =~ ^git_credentials: ]]; then
      IN_CREDS=true
    elif [[ "$IN_CREDS" == true && "$line" =~ ^[[:space:]]{2}-[[:space:]]host:[[:space:]]*(.+) ]]; then
      # Save previous credential if exists
      if [[ -n "$CURRENT_HOST" ]]; then
        EXISTING_CREDENTIALS+=("${CURRENT_HOST}|${CURRENT_TYPE}|${CURRENT_PAT}|${CURRENT_DATE}")
      fi
      CURRENT_HOST="${BASH_REMATCH[1]}"
      CURRENT_TYPE=""
      CURRENT_PAT=""
      CURRENT_DATE=""
    elif [[ "$IN_CREDS" == true && "$line" =~ ^[[:space:]]{4}type:[[:space:]]*(.+) ]]; then
      CURRENT_TYPE="${BASH_REMATCH[1]}"
    elif [[ "$IN_CREDS" == true && "$line" =~ ^[[:space:]]{4}pat:[[:space:]]*(.+) ]]; then
      CURRENT_PAT="${BASH_REMATCH[1]}"
    elif [[ "$IN_CREDS" == true && "$line" =~ ^[[:space:]]{4}configured_at:[[:space:]]*[\"\']?([^\"\']*)[\"\']*$ ]]; then
      CURRENT_DATE="${BASH_REMATCH[1]}"
    elif [[ "$IN_CREDS" == true && "$line" =~ ^[a-zA-Z] ]]; then
      # End of git_credentials section
      if [[ -n "$CURRENT_HOST" ]]; then
        EXISTING_CREDENTIALS+=("${CURRENT_HOST}|${CURRENT_TYPE}|${CURRENT_PAT}|${CURRENT_DATE}")
      fi
      IN_CREDS=false
    fi
  done < "${PROFILE_FILE}"
  
  # Save last credential if exists
  if [[ -n "$CURRENT_HOST" ]]; then
    EXISTING_CREDENTIALS+=("${CURRENT_HOST}|${CURRENT_TYPE}|${CURRENT_PAT}|${CURRENT_DATE}")
  fi
fi

# -- Detect GitHub domains ------------------------------------
GITHUB_DOMAINS=()

# Try to detect from repo inventory
if [[ -f "${INVENTORY_FILE}" ]]; then
  while IFS= read -r domain; do
    [[ -n "${domain}" ]] && GITHUB_DOMAINS+=("${domain}")
  done < <(grep -oP '(?<=github\.)[a-zA-Z0-9._-]+' "${INVENTORY_FILE}" 2>/dev/null \
    | sed 's/^/github./' | sort -u || true)
fi

# Always include github.com as a default
if [[ ${#GITHUB_DOMAINS[@]} -eq 0 ]]; then
  GITHUB_DOMAINS=("github.com")
else
  # Ensure github.com is in the list
  if ! printf '%s\n' "${GITHUB_DOMAINS[@]}" | grep -q "^github\.com$"; then
    GITHUB_DOMAINS=("github.com" "${GITHUB_DOMAINS[@]}")
  fi
fi

echo -e "${BOLD}Detected GitHub domain(s):${RESET}"
for d in "${GITHUB_DOMAINS[@]}"; do
  echo "  - ${d}"
done
echo ""

# Allow adding extra domains
echo -e "Add additional GitHub Enterprise domain? ${CYAN}[Enter domain or press Enter to skip]${RESET}"
read -r EXTRA_DOMAIN
if [[ -n "${EXTRA_DOMAIN}" ]]; then
  GITHUB_DOMAINS+=("${EXTRA_DOMAIN}")
fi
echo ""

# -- Prepare credential collection ------------------------------
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -Iseconds 2>/dev/null || echo "$(date)")
ALL_CREDENTIALS=()
UPDATED_HOSTS=()
STORED=0
SKIPPED=0

for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
  echo -e "${BOLD}--- ${DOMAIN} ---------------------------------------${RESET}"

  # Check if already configured
  EXISTING=""
  for cred in "${EXISTING_CREDENTIALS[@]}"; do
    IFS='|' read -r host type pat date <<< "$cred"
    if [[ "$host" == "$DOMAIN" ]]; then
      EXISTING="$cred"
      break
    fi
  done
  
  if [[ -n "$EXISTING" ]]; then
    IFS='|' read -r host type pat date <<< "$EXISTING"
    echo -e "  ${CYAN}[INFO]  Already configured${RESET}"
    echo -e "  Update PAT? ${BOLD}(y/N)${RESET}"
    read -r UPDATE
    
    if [[ "$UPDATE" =~ ^[yY] ]]; then
      if [[ "${DOMAIN}" == "github.com" ]]; then
        PAT_URL="https://github.com/settings/tokens"
      else
        PAT_URL="https://${DOMAIN}/settings/tokens"
      fi
      
      echo -e "  Generate token at: ${CYAN}${PAT_URL}${RESET}"
      echo -e "  Required scopes:   ${YELLOW}repo, read:org${RESET}"
      echo ""
      echo -e "  Enter new PAT for ${BOLD}${DOMAIN}${RESET}:"
      read -rs PAT_VALUE
      echo ""
      
      if [[ -n "${PAT_VALUE}" ]]; then
        if [[ "${DOMAIN}" == "github.com" ]]; then
          DOMAIN_TYPE="github"
        else
          DOMAIN_TYPE="github_enterprise"
        fi
        ALL_CREDENTIALS+=("${DOMAIN}|${DOMAIN_TYPE}|${PAT_VALUE}|${TIMESTAMP}")
        UPDATED_HOSTS+=("${DOMAIN}")
        STORED=$((STORED + 1))
        echo -e "  ${GREEN}[OK] Updated${RESET}"
      else
        ALL_CREDENTIALS+=("$EXISTING")
      fi
    else
      ALL_CREDENTIALS+=("$EXISTING")
    fi
    echo ""
    continue
  fi

  # Classify domain type
  if [[ "${DOMAIN}" == "github.com" ]]; then
    PAT_URL="https://github.com/settings/tokens"
    DOMAIN_TYPE="github"
  else
    PAT_URL="https://${DOMAIN}/settings/tokens"
    DOMAIN_TYPE="github_enterprise"
  fi

  echo -e "  Generate token at: ${CYAN}${PAT_URL}${RESET}"
  echo -e "  Required scopes:   ${YELLOW}repo, read:org${RESET}"
  echo ""
  echo -e "  Enter PAT for ${BOLD}${DOMAIN}${RESET} (or press Enter to skip):"
  read -rs PAT_VALUE
  echo ""

  if [[ -z "${PAT_VALUE}" ]]; then
    echo -e "  ${YELLOW}[SKIP]  Skipped${RESET}"
    SKIPPED=$((SKIPPED + 1))
  else
    # Basic validation — GitHub PATs start with ghp_, github_pat_, or ghs_
    if [[ "${PAT_VALUE}" =~ ^(ghp_|github_pat_|ghs_|glpat-|[a-zA-Z0-9]{40,}) ]]; then
      ALL_CREDENTIALS+=("${DOMAIN}|${DOMAIN_TYPE}|${PAT_VALUE}|${TIMESTAMP}")
      UPDATED_HOSTS+=("${DOMAIN}")
      echo -e "  ${GREEN}[OK] Stored${RESET}"
      STORED=$((STORED + 1))
    else
      echo -e "  ${RED}[WARN]  Unexpected PAT format — storing anyway...${RESET}"
      ALL_CREDENTIALS+=("${DOMAIN}|${DOMAIN_TYPE}|${PAT_VALUE}|${TIMESTAMP}")
      UPDATED_HOSTS+=("${DOMAIN}")
      STORED=$((STORED + 1))
    fi
  fi
  echo ""
done

# -- Write profile.yaml ----------------------------------------
if [[ ${#ALL_CREDENTIALS[@]} -gt 0 ]]; then
  cat > "${PROFILE_FILE}" << PROFILE_HEADER
# LENS Workbench User Profile
# Generated by: store-github-pat.sh
# Last updated: ${TIMESTAMP}
# GITIGNORED — never committed — local machine only

git_credentials:
PROFILE_HEADER

  for cred in "${ALL_CREDENTIALS[@]}"; do
    IFS='|' read -r host type pat date <<< "$cred"
    cat >> "${PROFILE_FILE}" << CRED_ENTRY
  - host: ${host}
    type: ${type}
    pat: ${pat}
    configured_at: "${date}"
CRED_ENTRY
  done
fi

# -- Store PATs in environment variables -----------------------
ENV_SET=0
ENV_FAILED=0

for cred in "${ALL_CREDENTIALS[@]}"; do
  IFS='|' read -r host type pat date <<< "$cred"
  if [[ "${host}" == "github.com" ]]; then
    export GITHUB_PAT="${pat}"
    ENV_VAR_NAME="GITHUB_PAT"
  else
    export GH_ENTERPRISE_TOKEN="${pat}"
    ENV_VAR_NAME="GH_ENTERPRISE_TOKEN"
  fi
  ENV_SET=$((ENV_SET + 1))
done

# -- Verify environment variables ------------------------------
echo ""
echo -e "${BOLD}Verifying environment variables...${RESET}"
VERIFY_PASS=0
VERIFY_FAIL=0

for cred in "${ALL_CREDENTIALS[@]}"; do
  IFS='|' read -r host type pat date <<< "$cred"
  if [[ "${host}" == "github.com" ]]; then
    if [[ -n "${GITHUB_PAT:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GITHUB_PAT is set (github.com)"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GITHUB_PAT was NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  else
    if [[ -n "${GH_ENTERPRISE_TOKEN:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GH_ENTERPRISE_TOKEN is set (${host})"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GH_ENTERPRISE_TOKEN was NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  fi
done
echo ""

# -- Persist env vars guidance --------------------------------
if [[ ${ENV_SET} -gt 0 ]]; then
  echo -e "${CYAN}${BOLD}Persisting environment variables:${RESET}"
  echo -e "  Environment variables are set for this terminal session."
  echo -e "  To make them permanent, add to your shell profile:"
  echo ""
  for cred in "${ALL_CREDENTIALS[@]}"; do
    IFS='|' read -r host type pat date <<< "$cred"
    if [[ "${host}" == "github.com" ]]; then
      echo -e "  ${YELLOW}echo 'export GITHUB_PAT=\"<your-pat>\"' >> ~/.bashrc${RESET}"
    else
      echo -e "  ${YELLOW}echo 'export GH_ENTERPRISE_TOKEN=\"<your-pat>\"' >> ~/.bashrc${RESET}"
    fi
  done
  echo ""
fi

# -- Summary ---------------------------------------------------
echo "===================================="
echo -e "${BOLD}Summary${RESET}"
echo "  [OK] Stored:  ${STORED} token(s) to profile"
echo "  [OK] Env vars set: ${ENV_SET}"
echo "  [OK] Env vars verified: ${VERIFY_PASS}"
if [[ ${VERIFY_FAIL} -gt 0 ]]; then
  echo -e "  ${RED}[FAIL] Env vars failed: ${VERIFY_FAIL}${RESET}"
fi
echo "  [SKIP]  Skipped: ${SKIPPED} domain(s)"
echo "  Total credentials: ${#ALL_CREDENTIALS[@]}"
echo ""

if [[ ${#ALL_CREDENTIALS[@]} -gt 0 ]]; then
  echo -e "${GREEN}PATs stored at:${RESET}"
  echo "  ${PROFILE_FILE}"
  echo ""
  echo -e "These credentials enable automated PR creation in:"
  echo -e "  - Phase completion workflows (preplan, businessplan, techplan, etc.)"
  echo -e "  - Audience promotion workflows (small->medium->large)"
  echo -e "  - Manual promotion via promote-branch.ps1"
  echo ""

  # Open in VS Code if available
  if command -v code &>/dev/null; then
    echo -e "Opening profile file in VS Code..."
    code "${PROFILE_FILE}"
  fi

  echo -e "${GREEN}${BOLD}[OK] PAT setup complete! You can now close this terminal.${RESET}"
else
  echo -e "${YELLOW}No PATs were stored. Run this script again when ready.${RESET}"
fi
echo ""
