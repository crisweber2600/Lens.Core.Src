# sync-prompts.ps1
# Syncs lens-work prompts from module source to control repo .github/prompts/
#
# Usage:
#   pwsh scripts/sync-prompts.ps1 -SourcePath . -TargetPath "../../.github/prompts" -DryRun
#   pwsh scripts/sync-prompts.ps1 -SourcePath . -TargetPath "../../.github/prompts"

param(
    [string]$SourcePath = ".",
    [string]$TargetPath = "../../.github/prompts",
    [switch]$DryRun,
    [switch]$Verbose
)

$synced = 0
$skipped = 0
$created = 0

# ── Resolve paths ────────────────────────────────────────────────────────────

$promptsDir = Join-Path $SourcePath "prompts"
if (-not (Test-Path $promptsDir)) {
    Write-Error "Source prompts directory not found: $promptsDir"
    exit 1
}

$resolvedTarget = $TargetPath
if (-not [System.IO.Path]::IsPathRooted($TargetPath)) {
    $resolvedTarget = Join-Path (Resolve-Path $SourcePath) $TargetPath
}

if (-not (Test-Path $resolvedTarget)) {
    if ($DryRun) {
        Write-Host "Would create target directory: $resolvedTarget" -ForegroundColor Yellow
    } else {
        New-Item -ItemType Directory -Path $resolvedTarget -Force | Out-Null
        Write-Host "Created target directory: $resolvedTarget" -ForegroundColor Green
    }
}

# ── Find and sync prompt files ───────────────────────────────────────────────

Write-Host "`nSyncing prompts from: $promptsDir" -ForegroundColor Cyan
Write-Host "                  to: $resolvedTarget" -ForegroundColor Cyan
if ($DryRun) { Write-Host "(DRY RUN - no files will be modified)`n" -ForegroundColor Yellow }
else { Write-Host "" }

$prompts = Get-ChildItem $promptsDir -Filter "*.prompt.md" -ErrorAction SilentlyContinue

if (($prompts | Measure-Object).Count -eq 0) {
    Write-Host "No prompt files found in $promptsDir" -ForegroundColor Yellow
    exit 0
}

foreach ($prompt in $prompts) {
    $targetFile = Join-Path $resolvedTarget $prompt.Name
    $targetExists = Test-Path $targetFile

    # Check if content differs
    $needsUpdate = $true
    if ($targetExists) {
        $sourceHash = (Get-FileHash $prompt.FullName -Algorithm SHA256).Hash
        $targetHash = (Get-FileHash $targetFile -Algorithm SHA256).Hash
        if ($sourceHash -eq $targetHash) {
            $needsUpdate = $false
            $skipped++
            if ($Verbose) { Write-Host "  [SKIP] $($prompt.Name) (unchanged)" -ForegroundColor DarkGray }
            continue
        }
    }

    if ($DryRun) {
        $action = if ($targetExists) { "update" } else { "create" }
        Write-Host "  [WOULD $($action.ToUpper())] $($prompt.Name)" -ForegroundColor Yellow
    } else {
        Copy-Item $prompt.FullName $targetFile -Force
        if ($targetExists) {
            Write-Host "  [UPDATED] $($prompt.Name)" -ForegroundColor Green
            $synced++
        } else {
            Write-Host "  [CREATED] $($prompt.Name)" -ForegroundColor Green
            $created++
        }
    }
}

# ── Check for orphaned prompts in target ─────────────────────────────────────

if (Test-Path $resolvedTarget) {
    $targetPrompts = Get-ChildItem $resolvedTarget -Filter "lens-work.*.prompt.md" -ErrorAction SilentlyContinue
    foreach ($tp in $targetPrompts) {
        $sourceMatch = Join-Path $promptsDir $tp.Name
        if (-not (Test-Path $sourceMatch)) {
            Write-Host "  [ORPHAN] $($tp.Name) exists in target but not in source" -ForegroundColor Yellow
        }
    }
}

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host "`n────────────────────────────────────────" -ForegroundColor Cyan
$total = ($prompts | Measure-Object).Count
Write-Host "Total: $total | Synced: $synced | Created: $created | Skipped: $skipped" -ForegroundColor Cyan
Write-Host "────────────────────────────────────────`n" -ForegroundColor Cyan
