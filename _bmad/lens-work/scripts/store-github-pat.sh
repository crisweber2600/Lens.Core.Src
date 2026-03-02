#!/usr/bin/env bash
# ============================================================
# LENS Workbench — GitHub PAT Setup Script
# store-github-pat.sh
#
# PURPOSE:
#   Securely collects GitHub Personal Access Tokens outside of
#   any LLM/AI chat context — PATs are NEVER entered into Copilot
#   or any other AI assistant.
#
# USAGE:
#   cd <project-root>
#   bash bmad.lens.release/_bmad/lens-work/scripts/store-github-pat.sh
#
# OUTPUT:
#   Environment variables only: GITHUB_PAT, GH_ENTERPRISE_TOKEN
#   No files are written. User must persist to shell profile manually.
# ============================================================

set -euo pipefail

INVENTORY_FILE="$(pwd)/_bmad-output/lens-work/repo-inventory.yaml"

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
echo -e "${YELLOW}[SECURITY]${RESET} PATs are set as environment variables only."
echo "  No files are written. To persist, add exports to your shell profile."
echo ""

# -- Check for already-set environment variables -------------
ENV_VARS_FOUND=()
[[ -n "${GITHUB_PAT:-}" ]]          && ENV_VARS_FOUND+=("GITHUB_PAT (github.com)")
[[ -n "${GH_ENTERPRISE_TOKEN:-}" ]] && ENV_VARS_FOUND+=("GH_ENTERPRISE_TOKEN (enterprise)")
[[ -n "${GH_TOKEN:-}" ]]            && ENV_VARS_FOUND+=("GH_TOKEN (fallback)")

if [[ ${#ENV_VARS_FOUND[@]} -gt 0 ]]; then
  echo -e "${GREEN}[OK] PAT environment variable(s) already set:${RESET}"
  for ev in "${ENV_VARS_FOUND[@]}"; do
    echo -e "   - ${ev}"
  done
  echo ""
  echo -e "  Overwrite existing values? ${BOLD}(y/N)${RESET}"
  read -r OVERWRITE
  if [[ ! "$OVERWRITE" =~ ^[yY] ]]; then
    echo ""
    echo -e "${GREEN}${BOLD}[OK] Using existing environment variables. Nothing changed.${RESET}"
    echo ""
    exit 0
  fi
  echo ""
fi

# -- Detect GitHub domains from repo inventory ---------------
GITHUB_DOMAINS=()

if [[ -f "${INVENTORY_FILE}" ]]; then
  while IFS= read -r domain; do
    [[ -n "${domain}" ]] && GITHUB_DOMAINS+=("${domain}")
  done < <(grep -oP '(?<=https://)[a-zA-Z0-9._-]*github[a-zA-Z0-9._-]*(?=/)' "${INVENTORY_FILE}" 2>/dev/null \
    | sort -u || true)
fi

# Always include github.com
if [[ ${#GITHUB_DOMAINS[@]} -eq 0 ]]; then
  GITHUB_DOMAINS=("github.com")
elif ! printf '%s\n' "${GITHUB_DOMAINS[@]}" | grep -q "^github\.com$"; then
  GITHUB_DOMAINS=("github.com" "${GITHUB_DOMAINS[@]}")
fi

echo -e "${BOLD}Detected GitHub domain(s):${RESET}"
for d in "${GITHUB_DOMAINS[@]}"; do
  echo "  - ${d}"
done
echo ""

echo -e "Add additional GitHub Enterprise domain? ${CYAN}[Enter domain or press Enter to skip]${RESET}"
read -r EXTRA_DOMAIN
[[ -n "${EXTRA_DOMAIN}" ]] && GITHUB_DOMAINS+=("${EXTRA_DOMAIN}")
echo ""

# -- Collect and export PATs ---------------------------------
STORED=0
SKIPPED=0

for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
  echo -e "${BOLD}--- ${DOMAIN} ---${RESET}"

  if [[ "${DOMAIN}" == "github.com" ]]; then
    PAT_URL="https://github.com/settings/tokens"
    ENV_VAR="GITHUB_PAT"
  else
    PAT_URL="https://${DOMAIN}/settings/tokens"
    ENV_VAR="GH_ENTERPRISE_TOKEN"
  fi

  echo -e "  Generate token at: ${CYAN}${PAT_URL}${RESET}"
  echo -e "  Required scopes:   ${YELLOW}repo, read:org${RESET}"
  echo ""
  echo -e "  Enter PAT for ${BOLD}${DOMAIN}${RESET} (or press Enter to skip):"
  read -rs PAT_VALUE
  echo ""

  if [[ -z "${PAT_VALUE}" ]]; then
    echo -e "  ${YELLOW}[SKIP]${RESET} Skipped"
    SKIPPED=$((SKIPPED + 1))
  else
    export "${ENV_VAR}=${PAT_VALUE}"
    echo -e "  ${GREEN}[OK]${RESET} ${ENV_VAR} set"
    STORED=$((STORED + 1))
  fi
  echo ""
done

# -- Verify -------------------------------------------------
echo -e "${BOLD}Verifying environment variables...${RESET}"
VERIFY_PASS=0
VERIFY_FAIL=0

for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
  if [[ "${DOMAIN}" == "github.com" ]]; then
    if [[ -n "${GITHUB_PAT:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GITHUB_PAT is set (github.com)"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GITHUB_PAT is NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  else
    if [[ -n "${GH_ENTERPRISE_TOKEN:-}" ]]; then
      echo -e "  ${GREEN}[OK]${RESET} GH_ENTERPRISE_TOKEN is set (${DOMAIN})"
      VERIFY_PASS=$((VERIFY_PASS + 1))
    else
      echo -e "  ${RED}[FAIL]${RESET} GH_ENTERPRISE_TOKEN is NOT set"
      VERIFY_FAIL=$((VERIFY_FAIL + 1))
    fi
  fi
done
echo ""

# -- Persistence guidance -----------------------------------
if [[ ${STORED} -gt 0 ]]; then
  echo -e "${CYAN}${BOLD}To persist across sessions, add to your shell profile (~/.bashrc or ~/.zshrc):${RESET}"
  for DOMAIN in "${GITHUB_DOMAINS[@]}"; do
    if [[ "${DOMAIN}" == "github.com" ]]; then
      echo -e "  ${YELLOW}export GITHUB_PAT=\"<your-pat>\"${RESET}"
    else
      echo -e "  ${YELLOW}export GH_ENTERPRISE_TOKEN=\"<your-pat>\"${RESET}"
    fi
  done
  echo ""
fi

# -- Summary ------------------------------------------------
echo "===================================="
echo -e "${BOLD}Summary${RESET}"
echo "  Env vars set:      ${STORED}"
echo "  Env vars verified: ${VERIFY_PASS}"
[[ ${VERIFY_FAIL} -gt 0 ]] && echo -e "  ${RED}Env vars failed:   ${VERIFY_FAIL}${RESET}"
echo "  Skipped:           ${SKIPPED}"
echo ""

if [[ ${STORED} -gt 0 ]]; then
  echo -e "${GREEN}${BOLD}[OK] PAT setup complete! You can now close this terminal.${RESET}"
else
  echo -e "${YELLOW}No PATs were set. Run this script again when ready.${RESET}"
fi
echo ""
