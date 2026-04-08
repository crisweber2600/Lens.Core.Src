# =============================================================================
# LENS Workbench — Shared Preflight (PowerShell)
#
# PURPOSE:
#   Ensures all authority repos are synchronized and constitutional governance
#   is resolved before workflow execution. Called by agent prompts that include
#   workflows/includes/preflight.md.
#
# USAGE:
#   .\lens.core\_bmad\lens-work\scripts\preflight.ps1
#   .\lens.core\_bmad\lens-work\scripts\preflight.ps1 -SkipConstitution
#   .\lens.core\_bmad\lens-work\scripts\preflight.ps1 -Caller onboard
#
# =============================================================================

[CmdletBinding()]
param(
    [switch]$SkipConstitution,
    [string]$Caller = "",
    [string]$GovernancePath = "",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..\..\..")).Path
$ReleaseDir = Join-Path $ProjectRoot "lens.core"
$TimestampFile = Join-Path $ProjectRoot "_bmad-output/lens-work/personal/.preflight-timestamp"
$GithubHashFile = Join-Path $ProjectRoot "_bmad-output/lens-work/personal/.github-hashes"
$LifecyclePath = Join-Path $ReleaseDir "_bmad/lens-work/lifecycle.yaml"

function Get-PreflightTimestamp {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    $rawValue = (Get-Content $Path -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($rawValue)) {
        return $null
    }

    # Earlier cached wrappers wrote Unix epoch seconds into the full-preflight timestamp file.
    if ($rawValue -match '^\d+$') {
        return [DateTimeOffset]::FromUnixTimeSeconds([long]$rawValue).UtcDateTime
    }

    $styles = [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
    $parsed = [datetime]::MinValue
    if ([datetime]::TryParse($rawValue, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsed)) {
        return $parsed.ToUniversalTime()
    }

    Write-Host "  ⚠ Ignoring invalid preflight timestamp at $Path" -ForegroundColor Yellow
    return $null
}

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

Set-Location $ProjectRoot

# =============================================================================
# Step 1: Check Release Branch
# =============================================================================
Write-Host "[preflight] Checking release branch..." -ForegroundColor Cyan

if (-not (Test-Path $ReleaseDir)) {
    throw "ERROR: lens.core directory not found at $ReleaseDir"
}

# =============================================================================
# Step 1a: Enforce LENS_VERSION Compatibility
# =============================================================================
Write-Host "[preflight] Verifying LENS_VERSION compatibility..." -ForegroundColor Cyan

if (-not (Test-Path $LifecyclePath)) {
    throw "ERROR: lifecycle.yaml not found at $LifecyclePath"
}

$moduleSchemaLine = Get-Content $LifecyclePath |
    Where-Object { $_ -match '^schema_version:' } | Select-Object -First 1

if ([string]::IsNullOrWhiteSpace($moduleSchemaLine)) {
    throw "VERSION MISMATCH: lifecycle.yaml is missing a 'schema_version:' entry. Run /lens-upgrade."
}

$moduleSchema = ($moduleSchemaLine -split ':', 2)[1].Trim()

if ([string]::IsNullOrWhiteSpace($moduleSchema)) {
    throw "VERSION MISMATCH: lifecycle.yaml has an empty 'schema_version'. Run /lens-upgrade."
}

$controlVersion = if (Test-Path "LENS_VERSION") { (Get-Content "LENS_VERSION" -Raw).Trim() } else { "" }

if ([string]::IsNullOrWhiteSpace($controlVersion) -or
    ($controlVersion -ne $moduleSchema -and $controlVersion -ne "$moduleSchema.0.0")) {
    $displayVersion = if ([string]::IsNullOrWhiteSpace($controlVersion)) { 'missing' } else { $controlVersion }
    throw "VERSION MISMATCH: control repo is v$displayVersion, module expects v$moduleSchema. Run /lens-upgrade."
}

Write-Host "  ✓ LENS_VERSION v$controlVersion matches module schema" -ForegroundColor Green

# =============================================================================
# Step 2: Determine Pull Strategy
# =============================================================================
$needsPull = $true
$lastTime = $null

if (Test-Path $TimestampFile) {
    $lastTime = Get-PreflightTimestamp -Path $TimestampFile
}

if ($null -ne $lastTime) {
    $elapsed = (Get-Date).ToUniversalTime() - $lastTime

    $currentBranch = git branch --show-current 2>$null
    $window = switch -Wildcard ($currentBranch) {
        "alpha*" { [timespan]::FromHours(1) }
        "beta*"  { [timespan]::FromHours(3) }
        default  { [timespan]::FromHours(24) }
    }

    if ($elapsed -lt $window) {
        $needsPull = $false
        Write-Host "[preflight] Timestamp fresh ($([int]$elapsed.TotalSeconds)s < $([int]$window.TotalSeconds)s) — skipping pulls" -ForegroundColor Cyan
    }
}

if ($needsPull) {
    Write-Host "[preflight] Pulling authority repos..." -ForegroundColor Cyan
    try { git -C $ReleaseDir pull origin 2>$null } catch {
        Write-Host "  ⚠ Release repo pull failed (offline?)" -ForegroundColor Yellow
    }

    if ($GovernancePath -and (Test-Path $GovernancePath)) {
        try { git -C $GovernancePath pull origin 2>$null } catch {
            Write-Host "  ⚠ Governance repo pull failed (offline?)" -ForegroundColor Yellow
        }
    }
}

# =============================================================================
# Step 3: Sync .github from Release Repo (hash-based)
# =============================================================================
Write-Host "[preflight] Syncing .github/ from release repo..." -ForegroundColor Cyan

$releaseGithub = Join-Path $ReleaseDir ".github"
if (-not (Test-Path $releaseGithub)) {
    throw "Missing authority folder: $releaseGithub"
}

if (-not (Test-Path ".github")) {
    New-Item -ItemType Directory -Path ".github" -Force | Out-Null
}

# Load stored hashes
$storedHashes = @{}
if (Test-Path $GithubHashFile) {
    Get-Content $GithubHashFile | ForEach-Object {
        if ($_ -match '^([0-9a-fA-F]+)  (.+)$') {
            $storedHashes[$Matches[2]] = $Matches[1].ToLower()
        }
    }
}

# Walk release .github tree; copy files whose hash changed or local copy diverged
$updatedCount = 0
$newHashes = @{}

$releaseGithubResolved = (Resolve-Path $releaseGithub).Path
Get-ChildItem $releaseGithub -Recurse -File | ForEach-Object {
    $relPath = ".github\" + $_.FullName.Substring($releaseGithubResolved.Length).TrimStart('\', '/')
    $releaseHash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    $storedHash = $storedHashes[$relPath]
    $localPath = Join-Path $ProjectRoot $relPath
    $localHash = if (Test-Path $localPath) { (Get-FileHash $localPath -Algorithm SHA256).Hash.ToLower() } else { "" }

    if ($releaseHash -ne $storedHash -or $localHash -ne $releaseHash) {
        $destDir = Split-Path $localPath -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item -Force $_.FullName $localPath
        $updatedCount++
    }
    $newHashes[$relPath] = $releaseHash
}

# Rewrite hash manifest (prunes removed files automatically)
$hashDir = Split-Path $GithubHashFile -Parent
if (-not (Test-Path $hashDir)) { New-Item -ItemType Directory -Path $hashDir -Force | Out-Null }
$newHashes.GetEnumerator() | ForEach-Object { "$($_.Value)  $($_.Key)" } | Set-Content $GithubHashFile

Write-Host "  ✓ .github/ synced ($updatedCount file(s) updated)" -ForegroundColor Green

# Prompt hygiene
if (Test-Path ".github/prompts") {
    $releasePromptDir = Join-Path $releaseGithub "prompts"

    Get-ChildItem ".github/prompts" -File -Filter "lens-work*.prompt.md" |
        Where-Object { -not (Test-Path (Join-Path $releasePromptDir $_.Name)) } |
        Remove-Item -Force

    Get-ChildItem ".github/prompts" -File -Filter "*.prompt.md" |
        Where-Object { $_.Name -notlike "lens-work*.prompt.md" } |
        Remove-Item -Force
}

# =============================================================================
# Step 3b: Sync Agent Entry Points
# =============================================================================
foreach ($entryPoint in @("CLAUDE.md")) {
    $src = Join-Path $ReleaseDir $entryPoint
    if (Test-Path $src) {
        $changed = git -C $ReleaseDir diff --name-only 'HEAD@{1}' HEAD -- $entryPoint 2>$null
        if (-not (Test-Path "./$entryPoint") -or $changed) {
            Copy-Item -Force $src "./$entryPoint"
            Write-Host "  ✓ Synced $entryPoint" -ForegroundColor Green
        }
    }
}

# =============================================================================
# Step 4: Verify IDE Adapters
# =============================================================================
if (-not (Test-Path ".claude/commands")) {
    Write-Host "[preflight] .claude/commands missing — running installer..." -ForegroundColor Yellow
    & (Join-Path $ReleaseDir "_bmad/lens-work/scripts/install.ps1") -IDE claude
}

# =============================================================================
# Step 4b: Verify Authority Repos
# =============================================================================
$missingRepos = $false
if (-not (Test-Path $ReleaseDir)) { $missingRepos = $true }
if ($GovernancePath -and -not (Test-Path $GovernancePath)) { $missingRepos = $true }

if ($missingRepos) {
    if ($Caller -eq "onboard") {
        Write-Host "[preflight] Authority repos incomplete — onboard will bootstrap" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "⚠️  Missing authority repos — this workspace needs onboarding first." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Onboarding sets up your profile, governance repo, and target project clones."
        Write-Host "  It takes about 2 minutes and only needs to run once."
        Write-Host ""
        Write-Host "  Run /onboard to get started, then retry this command."
        exit 1
    }
}

# =============================================================================
# Step 6: Update Timestamp
# =============================================================================
if ($needsPull) {
    $dir = Split-Path $TimestampFile -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") | Set-Content $TimestampFile
    Write-Host "[preflight] Timestamp updated" -ForegroundColor Green
}

Write-Host "[preflight] Preflight complete ✓" -ForegroundColor Green
