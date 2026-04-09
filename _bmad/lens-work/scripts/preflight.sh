#!/usr/bin/env bash
# =============================================================================
# LENS Workbench — Shared Preflight
#
# PURPOSE:
#   Ensures all authority repos are synchronized and constitutional governance
#   is resolved before workflow execution. Called by agent prompts that include
#   workflows/includes/preflight.md.
#
# USAGE:
#   ./lens.core/_bmad/lens-work/scripts/preflight.sh
#   ./lens.core/_bmad/lens-work/scripts/preflight.sh --skip-constitution
#   ./lens.core/_bmad/lens-work/scripts/preflight.sh --caller onboard
#
# OPTIONS:
#   --skip-constitution     Skip Step 5 (Resolve and Enforce Constitution)
#   --caller <workflow>     Calling workflow name (e.g., "onboard"). Onboard
#                           callers bypass the authority repo hard-stop.
#   --governance-path <p>   Governance repo path (default: from governance-setup.yaml)
#   -h, --help              Show this help message
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Script lives at lens.core/_bmad/lens-work/scripts; project root is one level above lens.core.
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
RELEASE_DIR="${PROJECT_ROOT}/lens.core"
TIMESTAMP_FILE="${PROJECT_ROOT}/docs/lens-work/personal/.preflight-timestamp"
GITHUB_HASH_FILE="${PROJECT_ROOT}/docs/lens-work/personal/.github-hashes"

# -- Colors -----------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# -- Defaults ---------------------------------------------------------------
export SKIP_CONSTITUTION=false
CALLER=""
GOVERNANCE_PATH=""

# -- Parse arguments ---------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-constitution) SKIP_CONSTITUTION=true; shift ;;
    --caller) CALLER="$2"; shift 2 ;;
    --governance-path) GOVERNANCE_PATH="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^# =====/{ /^# =====/d; s/^# \?//; p }' "$0"
      exit 0
      ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

cd "$PROJECT_ROOT"

# =============================================================================
# Step 1: Check Release Branch
# =============================================================================
echo -e "${CYAN}[preflight]${NC} Checking release branch..."
if [ ! -d "$RELEASE_DIR" ]; then
  echo -e "${RED}ERROR: lens.core directory not found at ${RELEASE_DIR}${NC}"
  exit 1
fi

# =============================================================================
# Step 1a: Enforce LENS_VERSION Compatibility
# =============================================================================
echo -e "${CYAN}[preflight]${NC} Verifying LENS_VERSION compatibility..."

MODULE_SCHEMA=$(awk '/^schema_version:/ { print $2; exit }' \
  "${RELEASE_DIR}/_bmad/lens-work/lifecycle.yaml")

if [[ -z "$MODULE_SCHEMA" ]]; then
  echo -e "${RED}ERROR: Unable to determine schema_version from lifecycle.yaml.${NC}"
  exit 1
fi

if [[ ! -f LENS_VERSION ]]; then
  echo -e "${RED}VERSION MISMATCH: control repo is missing LENS_VERSION, module expects v${MODULE_SCHEMA}. Run /lens-upgrade.${NC}"
  exit 1
fi

CONTROL_VERSION=$(tr -d $'\r\n' < LENS_VERSION || true)

if [[ -z "$CONTROL_VERSION" || ( "$CONTROL_VERSION" != "$MODULE_SCHEMA" && "$CONTROL_VERSION" != "$MODULE_SCHEMA.0.0" ) ]]; then
  echo -e "${RED}VERSION MISMATCH: control repo is v${CONTROL_VERSION:-missing}, module expects v${MODULE_SCHEMA}. Run /lens-upgrade.${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ LENS_VERSION v${CONTROL_VERSION} matches module schema${NC}"

# =============================================================================
# Step 2: Determine Pull Strategy
# =============================================================================
parse_timestamp_epoch() {
  local raw_value="$1"

  # Earlier cached wrappers wrote Unix epoch seconds into the full-preflight timestamp file.
  if [[ "$raw_value" =~ ^[0-9]+$ ]]; then
    echo "$raw_value"
    return
  fi

  date -d "$raw_value" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$raw_value" +%s 2>/dev/null || echo 0
}

NEEDS_PULL=true

if [[ -f "$TIMESTAMP_FILE" ]]; then
  LAST_PREFLIGHT=$(cat "$TIMESTAMP_FILE")
  LAST_EPOCH=$(parse_timestamp_epoch "$LAST_PREFLIGHT")
  NOW_EPOCH=$(date +%s)
  ELAPSED=$(( NOW_EPOCH - LAST_EPOCH ))

  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  case "$CURRENT_BRANCH" in
    alpha*) WINDOW=3600 ;;    # 1 hour
    beta*)  WINDOW=10800 ;;   # 3 hours
    *)      WINDOW=86400 ;;   # 24 hours
  esac

  if (( ELAPSED < WINDOW )); then
    NEEDS_PULL=false
    echo -e "${CYAN}[preflight]${NC} Timestamp fresh (${ELAPSED}s < ${WINDOW}s) — skipping pulls"
  fi
fi

if [[ "$NEEDS_PULL" == "true" ]]; then
  echo -e "${CYAN}[preflight]${NC} Pulling authority repos..."
  git -C "$RELEASE_DIR" pull origin 2>/dev/null || echo -e "${YELLOW}  ⚠ Release repo pull failed (offline?)${NC}"

  if [[ -n "$GOVERNANCE_PATH" && -d "$GOVERNANCE_PATH" ]]; then
    git -C "$GOVERNANCE_PATH" pull origin 2>/dev/null || echo -e "${YELLOW}  ⚠ Governance repo pull failed (offline?)${NC}"
  fi
fi

# =============================================================================
# Step 3: Sync .github from Release Repo (hash-based)
# =============================================================================
echo -e "${CYAN}[preflight]${NC} Syncing .github/ from release repo..."

if [ ! -d "${RELEASE_DIR}/.github" ]; then
  echo -e "${RED}ERROR: Missing authority folder ${RELEASE_DIR}/.github${NC}"
  exit 1
fi

mkdir -p .github

# Load stored hashes into associative array
declare -A stored_hashes
if [[ -f "$GITHUB_HASH_FILE" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    hash="${line%%  *}"
    file="${line#*  }"
    stored_hashes["$file"]="$hash"
  done < "$GITHUB_HASH_FILE"
fi

# Walk release .github tree; copy files whose hash changed or local copy diverged
UPDATED_COUNT=0
declare -A new_hashes

while IFS= read -r abs_src; do
  rel=".github/${abs_src#${RELEASE_DIR}/.github/}"
  release_hash=$(sha256sum "$abs_src" | awk '{print $1}')
  stored_hash="${stored_hashes[$rel]:-}"
  local_hash=""
  [[ -f "${PROJECT_ROOT}/${rel}" ]] && local_hash=$(sha256sum "${PROJECT_ROOT}/${rel}" | awk '{print $1}')

  if [[ "$release_hash" != "$stored_hash" || "$local_hash" != "$release_hash" ]]; then
    mkdir -p "${PROJECT_ROOT}/$(dirname "$rel")"
    cp -f "$abs_src" "${PROJECT_ROOT}/${rel}"
    (( UPDATED_COUNT++ )) || true
  fi
  new_hashes["$rel"]="$release_hash"
done < <(find "${RELEASE_DIR}/.github" -type f)

# Rewrite hash manifest (prunes removed files automatically)
mkdir -p "$(dirname "$GITHUB_HASH_FILE")"
: > "$GITHUB_HASH_FILE"
for rel in "${!new_hashes[@]}"; do
  echo "${new_hashes[$rel]}  ${rel}" >> "$GITHUB_HASH_FILE"
done

echo -e "${GREEN}  ✓ .github/ synced (${UPDATED_COUNT} file(s) updated)${NC}"

# Remove stale lens-work prompt stubs so deletions in the release repo propagate locally.
if [ -d ".github/prompts" ]; then
  while IFS= read -r prompt_file; do
    [ -f "${RELEASE_DIR}/${prompt_file}" ] || rm -f "${prompt_file}"
  done < <(find .github/prompts -maxdepth 1 -type f \( -name 'lens-work*.prompt.md' -o -name 'lens-*.prompt.md' \))
fi

# Prompt hygiene: keep only published lens-work prompt families.
if [ -d ".github/prompts" ]; then
  find .github/prompts -type f -name '*.prompt.md' ! \( -name 'lens-work*.prompt.md' -o -name 'lens-*.prompt.md' \) -delete
fi

# =============================================================================
# Step 3b: Sync Agent Entry Points
# =============================================================================
# shellcheck disable=SC2043  # Single entry point now; loop kept for future expansion
for entry_point in CLAUDE.md; do
  if [ -f "${RELEASE_DIR}/${entry_point}" ]; then
    CHANGED="$(git -C "$RELEASE_DIR" diff --name-only 'HEAD@{1}' HEAD -- "$entry_point" 2>/dev/null || true)"
    if [ ! -f "./${entry_point}" ] || [ -n "$CHANGED" ]; then
      cp "${RELEASE_DIR}/${entry_point}" "./${entry_point}"
      echo -e "${GREEN}  ✓ Synced ${entry_point}${NC}"
    fi
  fi
done

# =============================================================================
# Step 4: Verify IDE Adapters
# =============================================================================
if [ ! -d ".claude/commands" ]; then
  echo -e "${YELLOW}[preflight]${NC} .claude/commands missing — running installer..."
  bash "${RELEASE_DIR}/_bmad/lens-work/scripts/install.sh" --ide claude
fi

# =============================================================================
# Step 4b: Verify Authority Repos
# =============================================================================
MISSING_REPOS=false
if [ ! -d "$RELEASE_DIR" ]; then MISSING_REPOS=true; fi
if [[ -n "$GOVERNANCE_PATH" && ! -d "$GOVERNANCE_PATH" ]]; then MISSING_REPOS=true; fi

if [[ "$MISSING_REPOS" == "true" ]]; then
  if [[ "$CALLER" == "onboard" ]]; then
    echo -e "${YELLOW}[preflight]${NC} Authority repos incomplete — onboard will bootstrap"
  else
    echo -e "${YELLOW}⚠️  Missing authority repos — this workspace needs onboarding first.${NC}"
    echo ""
    echo "  Onboarding sets up your profile, governance repo, and target project clones."
    echo "  It takes about 2 minutes and only needs to run once."
    echo ""
    echo -e "  Run ${BOLD}/onboard${NC} to get started, then retry this command."
    exit 1
  fi
fi

# =============================================================================
# Step 6: Update Timestamp
# =============================================================================
if [[ "$NEEDS_PULL" == "true" ]]; then
  mkdir -p "$(dirname "$TIMESTAMP_FILE")"
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$TIMESTAMP_FILE"
  echo -e "${GREEN}[preflight]${NC} Timestamp updated"
fi

echo -e "${GREEN}[preflight]${NC} Preflight complete ✓"
