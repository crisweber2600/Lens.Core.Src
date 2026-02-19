#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Migrates planning artifacts from legacy paths to docs-path structure.

.DESCRIPTION
    Moves planning artifacts from _bmad-output/planning-artifacts/ to the
    initiative's docs.path location (e.g., docs/BMAD/LENS/BMAD.Lens/<initiative-id>/).
    Updates initiative config with docs block if missing.

.PARAMETER InitiativeId
    The initiative ID to migrate (e.g., "context-enhancement-9bfe4e")

.PARAMETER DryRun
    If specified, shows what would be done without making changes.

.EXAMPLE
    ./migrate-artifacts.ps1 -InitiativeId "context-enhancement-9bfe4e"
    ./migrate-artifacts.ps1 -InitiativeId "context-enhancement-9bfe4e" -DryRun
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$InitiativeId,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Resolve paths
$projectRoot = git rev-parse --show-toplevel 2>$null
if (-not $projectRoot) {
    Write-Error "Not in a git repository"
    exit 1
}

$legacyPath = Join-Path $projectRoot "_bmad-output" "planning-artifacts"
$initiativeConfigDir = Join-Path $projectRoot "_bmad-output" "lens-work" "initiatives"
$initiativeConfig = Join-Path $initiativeConfigDir "$InitiativeId.yaml"

# Validate initiative exists
if (-not (Test-Path $initiativeConfig)) {
    Write-Error "Initiative config not found: $initiativeConfig"
    exit 1
}

# Read initiative config to get docs path
$configContent = Get-Content $initiativeConfig -Raw

# Check if docs.path already exists
if ($configContent -match "docs:\s*\n\s+path:") {
    Write-Host "Initiative already has docs.path configured." -ForegroundColor Yellow

    # Extract existing path
    if ($configContent -match "path:\s+(.+)") {
        $docsPath = $Matches[1].Trim().Trim('"', "'")
        Write-Host "  docs.path: $docsPath" -ForegroundColor Cyan
    }
} else {
    # Need to add docs block — derive from initiative metadata
    # Extract domain/service/repo from config
    $domain = "BMAD"
    $service = "LENS"
    $repo = "BMAD.Lens"

    if ($configContent -match "domain:\s+(.+)") {
        $domain = $Matches[1].Trim().Trim('"', "'")
    }
    if ($configContent -match "service:\s+(.+)") {
        $service = $Matches[1].Trim().Trim('"', "'")
    }
    if ($configContent -match "repo:\s+(.+)") {
        $repo = $Matches[1].Trim().Trim('"', "'")
    }

    $docsPath = "docs/$domain/$service/$repo/$InitiativeId"
    Write-Host "Will add docs.path: $docsPath" -ForegroundColor Green
}

$targetPath = Join-Path $projectRoot $docsPath

# Planning artifacts to migrate
$artifacts = @(
    "product-brief.md",
    "prd.md",
    "architecture.md",
    "epics.md",
    "stories.md",
    "readiness-checklist.md",
    "ux-design.md"
)

# Check what exists in legacy path
$found = @()
$missing = @()
foreach ($artifact in $artifacts) {
    $sourcePath = Join-Path $legacyPath $artifact
    if (Test-Path $sourcePath) {
        $found += $artifact
    } else {
        $missing += $artifact
    }
}

if ($found.Count -eq 0) {
    Write-Host "No artifacts found in legacy path: $legacyPath" -ForegroundColor Yellow
    Write-Host "Nothing to migrate." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n=== Migration Plan ===" -ForegroundColor Cyan
Write-Host "Source: $legacyPath" -ForegroundColor White
Write-Host "Target: $targetPath" -ForegroundColor White
Write-Host "Found artifacts: $($found -join ', ')" -ForegroundColor Green
if ($missing.Count -gt 0) {
    Write-Host "Missing artifacts: $($missing -join ', ')" -ForegroundColor Yellow
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] No changes made." -ForegroundColor Yellow
    exit 0
}

# Create target directory
if (-not (Test-Path $targetPath)) {
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    Write-Host "Created directory: $targetPath" -ForegroundColor Green
}

# Also create reviews subdirectory
$reviewsPath = Join-Path $targetPath "reviews"
if (-not (Test-Path $reviewsPath)) {
    New-Item -ItemType Directory -Path $reviewsPath -Force | Out-Null
    Write-Host "Created directory: $reviewsPath" -ForegroundColor Green
}

# Move artifacts
foreach ($artifact in $found) {
    $source = Join-Path $legacyPath $artifact
    $dest = Join-Path $targetPath $artifact
    Copy-Item -Path $source -Destination $dest -Force
    Write-Host "  Copied: $artifact" -ForegroundColor Green
}

# Check for review files
$legacyReviewsPath = Join-Path $legacyPath "reviews"
if (Test-Path $legacyReviewsPath) {
    $reviewFiles = Get-ChildItem -Path $legacyReviewsPath -File
    foreach ($review in $reviewFiles) {
        $dest = Join-Path $reviewsPath $review.Name
        Copy-Item -Path $review.FullName -Destination $dest -Force
        Write-Host "  Copied review: $($review.Name)" -ForegroundColor Green
    }
}

# Update initiative config with docs block if needed
if ($configContent -notmatch "docs:\s*\n\s+path:") {
    $docsBlock = @"

docs:
  path: "$docsPath"
  domain: "$domain"
  service: "$service"
  repo: "$repo"
"@
    Add-Content -Path $initiativeConfig -Value $docsBlock
    Write-Host "`nUpdated initiative config with docs block" -ForegroundColor Green
}

Write-Host "`n=== Migration Complete ===" -ForegroundColor Cyan
Write-Host "Artifacts are now at: $targetPath" -ForegroundColor Green
Write-Host "Legacy copies remain at: $legacyPath (manual cleanup needed)" -ForegroundColor Yellow
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "  1. Verify artifacts at new location" -ForegroundColor White
Write-Host "  2. git add $docsPath" -ForegroundColor White
Write-Host "  3. Remove legacy copies when ready: Remove-Item $legacyPath -Recurse" -ForegroundColor White
