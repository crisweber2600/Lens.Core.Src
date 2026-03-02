#!/usr/bin/env bash
# ============================================================
# LENS Workbench — GitHub PAT Storage Script
# store-github-pat.sh
#
# PURPOSE:
#   Securely stores GitHub Personal Access Tokens as environment
#   variables outside of any LLM/AI chat context — PATs are NEVER
#   entered into Copilot or any other AI assistant.
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
echo -e "${CYAN}[INFO]  PATs are stored as environment variables:${RESET}"
echo -e "   github.com:  ${YELLOW}GITHUB_PAT${RESET}"
echo -e "   Enterprise:  ${YELLOW}GH_ENTERPRISE_TOKEN${RESET}"
echo "   Variables are set for the current session."
echo "   To make them permanent, add to your shell profile (~/.bashrc)."
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
  echo -e "${GREEN}[OK] PAT environment variable(s) already detected:${RESET}"
  for ev in "${ENV_VARS_FOUND[@]}"; do
    echo -e "   - ${ev}"
  done
  echo ""
  echo -e "   The promote-branch script will use these automatically."
  echo -e "   ${CYAN}Lookup order:${RESET}"
  echo -e "     github.com:  GITHUB_PAT -> GH_TOKEN"
  echo -e "     Enterprise:  GH_ENTERPRISE_TOKEN -> GH_TOKEN"
  echo ""
  echo -e "   Do you want to update PATs? ${BOLD}(y/N)${RESET}"
  read -r UPDATE_PAT
  if [[ ! "$UPDATE_PAT" =~ ^[yY] ]]; then
    echo ""
    echo -e "${GREEN}${BOLD}[OK] Using existing environment variables. No changes needed.${RESET}"
    echo -e "   promote-branch.sh will pick up PATs from the environment."
    echo ""
    exit 0
  fi
  echo ""
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

# -- Collect PAT per domain and set env vars -------------------
STORED=0
SKIPPED=0

for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
  echo -e "${BOLD}--- ${DOMAIN} ---------------------------------------${RESET}"

  # Classify domain type
  if [[ "${DOMAIN}" == "github.com" ]]; then
    PAT_URL="https://github.com/settings/tokens"
    ENV_VAR_NAME="GITHUB_PAT"
  else
    PAT_URL="https://${DOMAIN}/settings/tokens"
    ENV_VAR_NAME="GH_ENTERPRISE_TOKEN"
  fi

  echo -e "  Generate token at: ${CYAN}${PAT_URL}${RESET}"
  echo -e "  Required scopes:   ${YELLOW}repo, read:org${RESET}"
  echo -e "  Env variable:      ${CYAN}${ENV_VAR_NAME}${RESET}"
  echo ""
  echo -e "  Enter PAT for ${BOLD}${DOMAIN}${RESET} (or press Enter to skip):"
  read -rs PAT_VALUE
  echo ""

  if [[ -z "${PAT_VALUE}" ]]; then
    echo -e "  ${YELLOW}[SKIP]  Skipped${RESET}"
    SKIPPED=$((SKIPPED + 1))
  else
    export "${ENV_VAR_NAME}=${PAT_VALUE}"
    echo -e "  ${GREEN}[OK] Stored in ${ENV_VAR_NAME} (current session)${RESET}"
    STORED=$((STORED + 1))
  fi
  echo ""
done

# -- Verify environment variables ------------------------------
echo ""
echo -e "${BOLD}Verifying environment variables...${RESET}"
VERIFY_PASS=0
VERIFY_FAIL=0

for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
  if [[ "${DOMAIN}" == "github.com" ]]; then
    if [[ -n "${GITHUB_PAT:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GITHUB_PAT is set (github.com)"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GITHUB_PAT was NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  else
    if [[ -n "${GH_ENTERPRISE_TOKEN:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GH_ENTERPRISE_TOKEN is set (${DOMAIN})"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GH_ENTERPRISE_TOKEN was NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  fi
done
echo ""

# -- Persist env vars guidance --------------------------------
if [[ ${STORED} -gt 0 ]]; then
  echo -e "${CYAN}${BOLD}Persisting environment variables:${RESET}"
  echo -e "  Environment variables are set for this terminal session."
  echo -e "  To make them permanent, add to your shell profile:"
  echo ""
  if [[ -n "${GITHUB_PAT:-}" ]]; then
    echo -e "  ${YELLOW}echo 'export GITHUB_PAT=\"<your-pat>\"' >> ~/.bashrc${RESET}"
  fi
  if [[ -n "${GH_ENTERPRISE_TOKEN:-}" ]]; then
    echo -e "  ${YELLOW}echo 'export GH_ENTERPRISE_TOKEN=\"<your-pat>\"' >> ~/.bashrc${RESET}"
  fi
  echo ""
fi

# -- Summary ---------------------------------------------------
echo "===================================="
echo -e "${BOLD}Summary${RESET}"
echo "  [OK] Env vars set: ${STORED} (current session)"
echo "  [OK] Env vars verified: ${VERIFY_PASS}"
if [[ ${VERIFY_FAIL} -gt 0 ]]; then
  echo -e "  ${RED}[FAIL] Env vars failed: ${VERIFY_FAIL}${RESET}"
fi
echo "  [SKIP]  Skipped: ${SKIPPED} domain(s)"
echo ""

if [[ ${STORED} -gt 0 ]]; then
  echo -e "${GREEN}${BOLD}[OK] PAT setup complete! You can now close this terminal.${RESET}"
else
  echo -e "${YELLOW}No PATs were stored. Run this script again when ready.${RESET}"
fi
echo ""
