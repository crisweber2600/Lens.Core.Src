#Requires -Version 5.1
<#
.SYNOPSIS
    LENS Workbench — GitHub PAT Storage Script

.DESCRIPTION
    Securely stores GitHub Personal Access Tokens as environment variables
    outside of any LLM/AI chat context.
    PATs are NEVER entered into Copilot, Claude, or any other AI assistant.

.USAGE
    cd <project-root>
    .\\_bmad\\lens-work\\scripts\\store-github-pat.ps1

.OUTPUTS
    Environment variables: GITHUB_PAT, GH_ENTERPRISE_TOKEN
    (set in current session + persisted to User scope)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# -- Resolve Paths --------------------------------------------
$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot  = Resolve-Path (Join-Path $ScriptDir '../../..') | Select-Object -ExpandProperty Path
$InventoryFile= Join-Path $ProjectRoot '_bmad-output\lens-work\repo-inventory.yaml'

# -- Banner ---------------------------------------------------
Write-Host ""
Write-Host "LENS Workbench -- GitHub PAT Setup" -ForegroundColor Cyan
Write-Host ""  # blank line after banner
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "[INFO]  PATs are stored as environment variables:" -ForegroundColor Cyan
Write-Host "   github.com:  GITHUB_PAT" -ForegroundColor DarkYellow
Write-Host "   Enterprise:  GH_ENTERPRISE_TOKEN" -ForegroundColor DarkYellow
Write-Host "   Variables are set in the current session and persisted to User scope."
Write-Host ""

# -- Check for environment variables --------------------------
$EnvVarsFound = @()
if ($env:GITHUB_PAT) { $EnvVarsFound += 'GITHUB_PAT (github.com)' }
if ($env:GH_ENTERPRISE_TOKEN) { $EnvVarsFound += 'GH_ENTERPRISE_TOKEN (enterprise)' }
if ($env:GH_TOKEN) { $EnvVarsFound += 'GH_TOKEN (fallback)' }

if ($EnvVarsFound.Count -gt 0) {
    Write-Host "[OK] PAT environment variable(s) already detected:" -ForegroundColor Green
    foreach ($ev in $EnvVarsFound) {
        Write-Host "   - $ev"
    }
    Write-Host ""
    Write-Host "   The promote-branch script will use these automatically."
    Write-Host "   Lookup order:" -ForegroundColor Cyan
    Write-Host "     github.com:  GITHUB_PAT -> GH_TOKEN"
    Write-Host "     Enterprise:  GH_ENTERPRISE_TOKEN -> GH_TOKEN"
    Write-Host ""
    $UpdatePat = Read-Host "   Do you want to update PATs? (y/N)"
    if ($UpdatePat -notmatch '^[yY]') {
        Write-Host ""
        Write-Host "[OK] Using existing environment variables. No changes needed." -ForegroundColor Green
        Write-Host "   promote-branch.ps1 will pick up PATs from the environment."
        Write-Host ""
        return
    }
    Write-Host ""
}

# -- Detect GitHub domains ------------------------------------
$GithubDomains = @()

if (Test-Path $InventoryFile) {
    $InventoryContent = Get-Content $InventoryFile -Raw -ErrorAction SilentlyContinue
    $RegexMatches = [regex]::Matches($InventoryContent, 'github\.[a-zA-Z0-9._-]+')
    $Detected = $RegexMatches | ForEach-Object { $_.Value } | Sort-Object -Unique
    foreach ($d in $Detected) {
        if ($d -notin $GithubDomains) { $GithubDomains += $d }
    }
}

# Always ensure github.com is present
if ('github.com' -notin $GithubDomains) {
    $GithubDomains = @('github.com') + $GithubDomains
}

Write-Host "Detected GitHub domain(s):" -ForegroundColor White
foreach ($d in $GithubDomains) {
    Write-Host "  - $d" -ForegroundColor Cyan
}
Write-Host ""

# Allow adding extra domains
$ExtraDomain = Read-Host "Add additional GitHub Enterprise domain? (press Enter to skip)"
if ($ExtraDomain.Trim()) {
    $GithubDomains += $ExtraDomain.Trim()
}
Write-Host ""

# -- Collect PAT per domain and set env vars -------------------
$Stored  = 0
$Skipped = 0

foreach ($Domain in $GithubDomains) {
    Write-Host (("--- {0} " -f $Domain) + ("-" * [Math]::Max(0, 40 - $Domain.Length))) -ForegroundColor DarkGray
    Write-Host "  Domain: " -NoNewline; Write-Host $Domain -ForegroundColor Cyan

    if ($Domain -eq 'github.com') {
        $PatUrl     = 'https://github.com/settings/tokens'
        $EnvVarName = 'GITHUB_PAT'
    } else {
        $PatUrl     = "https://$Domain/settings/tokens"
        $EnvVarName = 'GH_ENTERPRISE_TOKEN'
    }

    Write-Host "  Generate token at: " -NoNewline
    Write-Host $PatUrl -ForegroundColor Cyan
    Write-Host "  Required scopes:   " -NoNewline
    Write-Host "repo, read:org" -ForegroundColor Yellow
    Write-Host "  Env variable:      " -NoNewline
    Write-Host $EnvVarName -ForegroundColor Cyan
    Write-Host ""

    $SecurePat = Read-Host "  Enter PAT for $Domain (press Enter to skip)" -AsSecureString
    $Bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePat)
    $PatPlain = $null
    try {
        $PatPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
    }
    Write-Host ""

    if ([string]::IsNullOrEmpty($PatPlain)) {
        Write-Host "  [SKIP]  Skipped" -ForegroundColor Yellow
        $Skipped++
    } else {
        # Set in current session
        Set-Item -Path "Env:$EnvVarName" -Value $PatPlain
        # Persist to User scope
        [System.Environment]::SetEnvironmentVariable($EnvVarName, $PatPlain, 'User')
        Write-Host "  [OK] Stored in $EnvVarName (session + User scope)" -ForegroundColor Green
        $Stored++
    }
    Write-Host ""
}

# -- Verify environment variables ------------------------------
Write-Host ""
Write-Host "Verifying environment variables..." -ForegroundColor White
$VerifyPass = 0
$VerifyFail = 0

foreach ($Domain in $GithubDomains) {
    if ($Domain -eq 'github.com') {
        $SessionVal = $env:GITHUB_PAT
        $UserVal = [System.Environment]::GetEnvironmentVariable('GITHUB_PAT', 'User')
        if ($SessionVal -and $UserVal) {
            Write-Host "  [OK] GITHUB_PAT is set (session + persistent) (github.com)" -ForegroundColor Green
            $VerifyPass++
        } elseif ($SessionVal) {
            Write-Host "  [WARN] GITHUB_PAT set in session but NOT persisted to user env" -ForegroundColor Yellow
            $VerifyPass++
        } else {
            Write-Host "  [FAIL] GITHUB_PAT was NOT set" -ForegroundColor Red
            $VerifyFail++
        }
    } else {
        $SessionVal = $env:GH_ENTERPRISE_TOKEN
        $UserVal = [System.Environment]::GetEnvironmentVariable('GH_ENTERPRISE_TOKEN', 'User')
        if ($SessionVal -and $UserVal) {
            Write-Host "  [OK] GH_ENTERPRISE_TOKEN is set (session + persistent) ($Domain)" -ForegroundColor Green
            $VerifyPass++
        } elseif ($SessionVal) {
            Write-Host "  [WARN] GH_ENTERPRISE_TOKEN set in session but NOT persisted to user env" -ForegroundColor Yellow
            $VerifyPass++
        } else {
            Write-Host "  [FAIL] GH_ENTERPRISE_TOKEN was NOT set" -ForegroundColor Red
            $VerifyFail++
        }
    }
}
Write-Host ""

if ($Stored -gt 0) {
    Write-Host "Environment variables persisted to User scope." -ForegroundColor Cyan
    Write-Host "  New terminal windows will pick them up automatically." -ForegroundColor DarkGray
    Write-Host "  Current session also has them available." -ForegroundColor DarkGray
    Write-Host ""
}

# -- Summary ---------------------------------------------------
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host "Summary" -ForegroundColor White
Write-Host "  [OK] Env vars set: $Stored (session + User scope)" -ForegroundColor Green
Write-Host "  [OK] Env vars verified: $VerifyPass" -ForegroundColor Green
if ($VerifyFail -gt 0) {
    Write-Host "  [FAIL] Env vars failed: $VerifyFail" -ForegroundColor Red
}
Write-Host "  [SKIP]  Skipped: $Skipped domain(s)" -ForegroundColor Yellow
Write-Host ""

if ($Stored -gt 0) {
    Write-Host "[OK] PAT setup complete! You can now close this terminal." -ForegroundColor Green
} else {
    Write-Host "No PATs were stored. Run this script again when ready." -ForegroundColor Yellow
}

Write-Host ""
