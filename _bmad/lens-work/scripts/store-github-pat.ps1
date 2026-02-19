# store-github-pat.ps1 — Securely store GitHub PATs outside of LLM context
# Run this script in a terminal window (NOT inside Copilot/Claude/LLM chat)

$ErrorActionPreference = "Stop"

$CredDir = "_bmad-output/lens-work/personal"
$CredFile = "$CredDir/github-credentials.yaml"
$InventoryFile = "_bmad-output/lens-work/repo-inventory.yaml"

Write-Host ""
Write-Host "🔐 GitHub PAT Storage (Secure Terminal)" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""
Write-Host "⚠️  This script runs outside of LLM context for security." -ForegroundColor Yellow
Write-Host "   Your PAT will NOT be visible to any AI assistant."
Write-Host ""

# Detect GitHub domains from repo inventory
$domains = @()
if (Test-Path $InventoryFile) {
    $content = Get-Content $InventoryFile -Raw
    $matches = [regex]::Matches($content, 'https?://([^/]+)')
    foreach ($m in $matches) {
        $host = $m.Groups[1].Value
        if ($host -match "github" -and $domains -notcontains $host) {
            $domains += $host
        }
    }
}

# Default to github.com if no domains detected
if ($domains.Count -eq 0) {
    $domains = @("github.com")
}

Write-Host "Detected GitHub domain(s):"
foreach ($d in $domains) {
    Write-Host "  • $d"
}
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Path $CredDir -Force | Out-Null

# Build credentials YAML
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$yaml = @"
# GitHub credentials for lens-work
# Generated: $timestamp
# ⚠️  This file is gitignored — never commit it

"@

foreach ($domain in $domains) {
    Write-Host ""
    Write-Host "──────────────────────────────────────"
    Write-Host "Domain: $domain"
    Write-Host ""

    if ($domain -eq "github.com") {
        Write-Host "  Generate a token at: https://github.com/settings/tokens"
    } else {
        Write-Host "  Generate a token at: https://$domain/settings/tokens"
    }
    Write-Host "  Required scopes: repo, read:org"
    Write-Host ""

    $secPat = Read-Host "  Enter PAT for $domain (input hidden)" -AsSecureString
    $pat = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPat)
    )

    if ([string]::IsNullOrWhiteSpace($pat)) {
        Write-Host "  ⏭️  Skipped $domain"
        continue
    }

    $patType = if ($domain -eq "github.com") { "github.com" } else { "github_enterprise" }

    $yaml += @"
${domain}:
  token: $pat
  created_at: $timestamp
  type: $patType

"@

    Write-Host "  ✅ Stored PAT for $domain" -ForegroundColor Green
}

$yaml | Out-File -FilePath $CredFile -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "========================================"
Write-Host "✅ Credentials saved to: $CredFile" -ForegroundColor Green
Write-Host ""

# Try to open in VS Code
if (Get-Command code -ErrorAction SilentlyContinue) {
    code $CredFile
    Write-Host "📂 Opened in VS Code"
}
