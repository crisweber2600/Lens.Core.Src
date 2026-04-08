# =============================================================================
# LENS Workbench — Run Preflight (Cached)
#
# PURPOSE:
#   Wraps preflight.ps1 with a simple timestamp cache so repeated calls within
#   the same work session skip redundant re-runs. The cache expires after a
#   configurable TTL (default 300 seconds / 5 minutes).
#
# USAGE:
#   .\lens.core\_bmad\lens-work\scripts\run-preflight-cached.ps1
#   .\lens.core\_bmad\lens-work\scripts\run-preflight-cached.ps1 -TTL 600
#   .\lens.core\_bmad\lens-work\scripts\run-preflight-cached.ps1 -Force
#   .\lens.core\_bmad\lens-work\scripts\run-preflight-cached.ps1 -Json
#
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [int]$TTL = 300,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$Json,

    [Parameter(Mandatory = $false)]
    [switch]$SkipConstitution,

    [Parameter(Mandatory = $false)]
    [string]$Caller = "",

    [Parameter(Mandatory = $false)]
    [string]$GovernancePath = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..\..\..")).Path
$CacheFile   = Join-Path $ProjectRoot "_bmad-output/lens-work/personal/.preflight-cache"

# =============================================================================
# Cache check
# =============================================================================

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$cacheValid = $false
$cachedAt = $null
$age = $null

if ((Test-Path $CacheFile) -and -not $Force) {
    $rawCachedAt = (Get-Content $CacheFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($rawCachedAt -match '^\d+$') {
        $cachedAt = [long]$rawCachedAt
        $age = $now - $cachedAt
        if ($age -lt $TTL) {
            $cacheValid = $true
        }
    }
}

# =============================================================================
# Execute or skip
# =============================================================================

if ($cacheValid) {
    $remaining = $TTL - $age
    if ($Json) {
        @{
            status         = "cached"
            cached_at      = $cachedAt
            age_seconds    = $age
            ttl_remaining  = $remaining
            ran_preflight  = $false
        } | ConvertTo-Json -Depth 2
    } else {
        Write-Host "[preflight-cached] Valid cache (${age}s old, ${remaining}s remaining). Skipping re-run." -ForegroundColor Green
    }
    return
}

# Run the actual preflight
Write-Host "[preflight-cached] Cache expired or forced. Running preflight..." -ForegroundColor Cyan

$preflightScript = Join-Path $ScriptDir "preflight.ps1"
$powerShellHost = if ($PSVersionTable.PSEdition -eq "Desktop") {
    Join-Path $PSHOME "powershell.exe"
} else {
    Join-Path $PSHOME "pwsh"
}
$invocationArgs = @("-NoLogo", "-NoProfile", "-File", $preflightScript)

if ([string]::IsNullOrWhiteSpace($powerShellHost) -or -not (Test-Path $powerShellHost)) {
    $powerShellHost = if ($PSVersionTable.PSEdition -eq "Desktop") { "powershell" } else { "pwsh" }
}

if ($SkipConstitution) { $invocationArgs += "-SkipConstitution" }
if ($Caller)           { $invocationArgs += "-Caller"; $invocationArgs += $Caller }
if ($GovernancePath)   { $invocationArgs += "-GovernancePath"; $invocationArgs += $GovernancePath }

$exitCode = 0

try {
    & $powerShellHost @invocationArgs
    $exitCode = $LASTEXITCODE
} catch {
    $exitCode = 1
}

if ($exitCode -eq 0) {
    $cacheDir = Split-Path -Parent $CacheFile
    if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null }
    $cachedAt = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    [System.IO.File]::WriteAllText($CacheFile, [string]$cachedAt, [System.Text.UTF8Encoding]::new($false))

    if ($Json) {
        @{
            status         = "passed"
            cached_at      = $cachedAt
            age_seconds    = 0
            ttl_remaining  = $TTL
            ran_preflight  = $true
        } | ConvertTo-Json -Depth 2
    } else {
        Write-Host "[preflight-cached] Preflight passed. Cache refreshed (TTL: ${TTL}s)." -ForegroundColor Green
    }
} else {
    if ($Json) {
        @{
            status         = "failed"
            cached_at      = $null
            age_seconds    = $null
            ttl_remaining  = $null
            ran_preflight  = $true
            exit_code      = $exitCode
        } | ConvertTo-Json -Depth 2
    } else {
        Write-Host "[preflight-cached] Preflight failed (exit $exitCode). Cache NOT updated." -ForegroundColor Red
    }
    exit $exitCode
}
