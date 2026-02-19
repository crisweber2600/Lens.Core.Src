#!/usr/bin/env bash
# store-github-pat.sh — Securely store GitHub PATs outside of LLM context
# Run this script in a terminal window (NOT inside Copilot/Claude/LLM chat)
set -euo pipefail

CRED_DIR="_bmad-output/lens-work/personal"
CRED_FILE="${CRED_DIR}/github-credentials.yaml"
INVENTORY_FILE="_bmad-output/lens-work/repo-inventory.yaml"

echo ""
echo "🔐 GitHub PAT Storage (Secure Terminal)"
echo "========================================"
echo ""
echo "⚠️  This script runs outside of LLM context for security."
echo "   Your PAT will NOT be visible to any AI assistant."
echo ""

# Detect GitHub domains from repo inventory
domains=()
if [[ -f "$INVENTORY_FILE" ]]; then
  # Extract unique GitHub domains from remote URLs
  while IFS= read -r domain; do
    if [[ -n "$domain" ]]; then
      domains+=("$domain")
    fi
  done < <(grep -oP 'https?://\K[^/]+' "$INVENTORY_FILE" 2>/dev/null | grep -i github | sort -u)
fi

# Default to github.com if no domains detected
if [[ ${#domains[@]} -eq 0 ]]; then
  domains=("github.com")
fi

echo "Detected GitHub domain(s):"
for d in "${domains[@]}"; do
  echo "  • $d"
done
echo ""

# Create output directory
mkdir -p "$CRED_DIR"

# Build credentials YAML
echo "# GitHub credentials for lens-work" > "$CRED_FILE"
echo "# Generated: $(date -u +%FT%TZ)" >> "$CRED_FILE"
echo "# ⚠️  This file is gitignored — never commit it" >> "$CRED_FILE"
echo "" >> "$CRED_FILE"

for domain in "${domains[@]}"; do
  echo ""
  echo "──────────────────────────────────────"
  echo "Domain: $domain"
  echo ""

  if [[ "$domain" == "github.com" ]]; then
    echo "  Generate a token at: https://github.com/settings/tokens"
  else
    echo "  Generate a token at: https://${domain}/settings/tokens"
  fi
  echo "  Required scopes: repo, read:org"
  echo ""

  read -rsp "  Enter PAT for ${domain} (input hidden): " pat
  echo ""

  if [[ -z "$pat" ]]; then
    echo "  ⏭️  Skipped ${domain}"
    continue
  fi

  # Determine type
  if [[ "$domain" == "github.com" ]]; then
    pat_type="github.com"
  else
    pat_type="github_enterprise"
  fi

  cat >> "$CRED_FILE" <<EOF
${domain}:
  token: ${pat}
  created_at: $(date -u +%FT%TZ)
  type: ${pat_type}

EOF

  echo "  ✅ Stored PAT for ${domain}"
done

echo ""
echo "========================================"
echo "✅ Credentials saved to: ${CRED_FILE}"
echo ""

# Try to open in VS Code
if command -v code &>/dev/null; then
  code "$CRED_FILE"
  echo "📂 Opened in VS Code"
fi
