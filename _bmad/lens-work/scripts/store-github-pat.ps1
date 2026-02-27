#Requires -Version 5.1
<#
.SYNOPSIS
    LENS Workbench — GitHub PAT Storage Script

.DESCRIPTION
    Securely stores GitHub Personal Access Tokens outside of any LLM/AI chat context.
    PATs are NEVER entered into Copilot, Claude, or any other AI assistant.

.USAGE
    cd <project-root>
    .\\_bmad\\lens-work\\scripts\\store-github-pat.ps1

.OUTPUTS
    _bmad-output/lens-work/personal/github-credentials.yaml
    (gitignored — never committed)
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# -- Resolve Paths --------------------------------------------
$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot  = Resolve-Path (Join-Path $ScriptDir '../../..') | Select-Object -ExpandProperty Path
$ProfileFile  = Join-Path $ProjectRoot '_bmad-output\lens-work\personal\profile.yaml'
$LegacyCredFile = Join-Path $ProjectRoot '_bmad-output\lens-work\personal\github-credentials.yaml'
$InventoryFile= Join-Path $ProjectRoot '_bmad-output\lens-work\repo-inventory.yaml'

# -- Banner ---------------------------------------------------
Write-Host ""
Write-Host "LENS Workbench -- GitHub PAT Setup" -ForegroundColor Cyan
Write-Host ""  # blank line after banner
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "[WARN]  SECURITY: " -ForegroundColor Yellow -NoNewline
Write-Host "PATs entered here are stored ONLY in:"
Write-Host "   $ProfileFile" -ForegroundColor DarkYellow
Write-Host "   This file is gitignored and never committed."
Write-Host "   PATs enable automated PR creation in phase workflows."
Write-Host ""

# -- Check for environment variables --------------------------
$EnvVarsFound = @()
if ($env:GITHUB_PAT) { $EnvVarsFound += 'GITHUB_PAT (github.com)' }
if ($env:GH_ENTERPRISE_TOKEN) { $EnvVarsFound += 'GH_ENTERPRISE_TOKEN (enterprise)' }
if ($env:GH_TOKEN) { $EnvVarsFound += 'GH_TOKEN (fallback)' }

if ($EnvVarsFound.Count -gt 0) {
    Write-Host "[OK] PAT environment variable(s) detected:" -ForegroundColor Green
    foreach ($ev in $EnvVarsFound) {
        Write-Host "   - $ev"
    }
    Write-Host ""
    Write-Host "   The promote-branch script will use these automatically."
    Write-Host "   Lookup order:" -ForegroundColor Cyan
    Write-Host "     github.com:  GITHUB_PAT -> GH_TOKEN -> profile.yaml"
    Write-Host "     Enterprise:  GH_ENTERPRISE_TOKEN -> GH_TOKEN -> profile.yaml"
    Write-Host ""
    $StoreEnvPat = Read-Host "   Do you also want to store PATs in profile.yaml? (y/N)"
    if ($StoreEnvPat -notmatch '^[yY]') {
        Write-Host ""
        Write-Host "[OK] Using environment variables. No profile changes needed." -ForegroundColor Green
        Write-Host "   promote-branch.ps1 will pick up PATs from the environment."
        Write-Host ""
        return
    }
    Write-Host ""
}

# -- Ensure output directory ----------------------------------
$ProfileDir = Split-Path -Parent $ProfileFile
if (-not (Test-Path $ProfileDir)) {
    New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null
}

# -- Load existing profile or initialize ----------------------
$Profile = @{}
$ExistingCredentials = @()

if (Test-Path $ProfileFile) {
    # Parse existing profile.yaml
    $ProfileContent = Get-Content $ProfileFile -Raw -ErrorAction SilentlyContinue
    if ($ProfileContent) {
        # Simple YAML parsing for git_credentials array
        $InCredentials = $false
        $CurrentCred = $null
        foreach ($line in $ProfileContent -split "`n") {
            if ($line -match '^git_credentials:') {
                $InCredentials = $true
            } elseif ($InCredentials -and $line -match '^  - host:\s*(.+)\s*$') {
                if ($CurrentCred) { $ExistingCredentials += $CurrentCred }
                $CurrentCred = @{ host = $Matches[1].Trim() }
            } elseif ($InCredentials -and $CurrentCred -and $line -match '^    (\w+):\s*(.+)\s*$') {
                $CurrentCred[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
            } elseif ($InCredentials -and $line -match '^\w' -and $line -notmatch '^  ') {
                if ($CurrentCred) { $ExistingCredentials += $CurrentCred }
                $InCredentials = $false
                $CurrentCred = $null
            }
        }
        if ($CurrentCred) { $ExistingCredentials += $CurrentCred }
    }
}

# -- Migrate from legacy github-credentials.yaml if exists ----
if ((Test-Path $LegacyCredFile) -and $ExistingCredentials.Count -eq 0) {
    Write-Host "Migrating from legacy github-credentials.yaml..." -ForegroundColor Cyan
    $LegacyContent = Get-Content $LegacyCredFile -Raw
    $CurrentDomain = $null
    foreach ($line in $LegacyContent -split "`n") {
        if ($line -match '^([a-zA-Z0-9._-]+):\s*$') {
            $CurrentDomain = $Matches[1]
        } elseif ($CurrentDomain -and $line -match '^\s+token:\s*(.+)\s*$') {
            $token = $Matches[1].Trim()
            $type = if ($CurrentDomain -eq 'github.com') { 'github' } else { 'github_enterprise' }
            $ExistingCredentials += @{
                host = $CurrentDomain
                type = $type
                pat = $token
                configured_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            }
        }
    }
    if ($ExistingCredentials.Count -gt 0) {
        Write-Host "   [OK] Migrated $($ExistingCredentials.Count) credential(s)" -ForegroundColor Green
    }
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

# -- Prepare credential collection ------------------------------
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$AllCredentials = @()
$UpdatedHosts = @()
$Stored  = 0
$Skipped = 0

foreach ($Domain in $GithubDomains) {
    Write-Host (("--- {0} " -f $Domain) + ("-" * [Math]::Max(0, 40 - $Domain.Length))) -ForegroundColor DarkGray
    Write-Host "  Domain: " -NoNewline; Write-Host $Domain -ForegroundColor Cyan

    # Check if already configured
    $Existing = $ExistingCredentials | Where-Object { $_.host -eq $Domain } | Select-Object -First 1
    
    if ($Existing) {
        Write-Host "  [INFO]  Already configured" -ForegroundColor DarkCyan
        # Prompt to update
        $Update = Read-Host "  Update PAT? (y/N)"
        if ($Update -match '^[yY]') {
            if ($Domain -eq 'github.com') {
                $PatUrl = 'https://github.com/settings/tokens'
            } else {
                $PatUrl = "https://$Domain/settings/tokens"
            }
            Write-Host "  Generate token at: " -NoNewline
            Write-Host $PatUrl -ForegroundColor Cyan
            Write-Host "  Required scopes:   " -NoNewline
            Write-Host "repo, read:org" -ForegroundColor Yellow
            Write-Host ""
            
            $SecurePat = Read-Host "  Enter new PAT for $Domain" -AsSecureString
            if ($SecurePat.Length -gt 0) {
                $Bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePat)
                try {
                    $PatPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
                } finally {
                    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
                }
                
                if (-not [string]::IsNullOrWhiteSpace($PatPlain)) {
                    $credType = if ($Domain -eq 'github.com') { 'github' } else { 'github_enterprise' }
                    $AllCredentials += @{
                        host = $Domain
                        type = $credType
                        pat = $PatPlain
                        configured_at = $Timestamp
                    }
                    $UpdatedHosts += $Domain
                    $Stored++
                    Write-Host "  [OK] Updated" -ForegroundColor Green
                } else {
                    $AllCredentials += $Existing
                }
            } else {
                $AllCredentials += $Existing
            }
        } else {
            $AllCredentials += $Existing
        }
        Write-Host ""
        continue
    }
    
    if ($Domain -eq 'github.com') {
        $PatUrl     = 'https://github.com/settings/tokens'
        $DomainType = 'github'
    } else {
        $PatUrl     = "https://$Domain/settings/tokens"
        $DomainType = 'github_enterprise'
    }

    Write-Host "  Generate token at: " -NoNewline
    Write-Host $PatUrl -ForegroundColor Cyan
    Write-Host "  Required scopes:   " -NoNewline
    Write-Host "repo, read:org" -ForegroundColor Yellow
    Write-Host ""

    $SecurePat = Read-Host "  Enter PAT for $Domain (press Enter to skip)" -AsSecureString
    Write-Host ""

    if ($SecurePat.Length -eq 0) {
        Write-Host "  [SKIP]  Skipped" -ForegroundColor Yellow
        $Skipped++
    } else {
        $Bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePat)
        try {
            $PatPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
        } finally {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
        }

        if ([string]::IsNullOrWhiteSpace($PatPlain)) {
            Write-Host "  [SKIP]  Skipped" -ForegroundColor Yellow
            $Skipped++
        } else {
            $AllCredentials += @{
                host = $Domain
                type = $DomainType
                pat = $PatPlain
                configured_at = $Timestamp
            }
            $UpdatedHosts += $Domain
            Write-Host "  [OK] Stored" -ForegroundColor Green
            $Stored++
        }
    }
    Write-Host ""
}

# -- Write profile.yaml ----------------------------------------
if ($AllCredentials.Count -gt 0) {
    $ProfileYaml = @"
# LENS Workbench User Profile
# Generated by: store-github-pat.ps1
# Last updated: $Timestamp
# GITIGNORED — never committed — local machine only

git_credentials:
"@

    foreach ($Cred in $AllCredentials) {
        $ProfileYaml += @"
`n  - host: $($Cred.host)
    type: $($Cred.type)
    pat: $($Cred.pat)
    configured_at: "$($Cred.configured_at)"
"@
    }
    
    Set-Content -Path $ProfileFile -Value $ProfileYaml -Encoding UTF8
}

# -- Store PATs in environment variables -----------------------
$EnvSet = 0

foreach ($Cred in $AllCredentials) {
    if ($Cred.host -eq 'github.com') {
        $env:GITHUB_PAT = $Cred.pat
        [System.Environment]::SetEnvironmentVariable('GITHUB_PAT', $Cred.pat, 'User')
    } else {
        $env:GH_ENTERPRISE_TOKEN = $Cred.pat
        [System.Environment]::SetEnvironmentVariable('GH_ENTERPRISE_TOKEN', $Cred.pat, 'User')
    }
    $EnvSet++
}

# -- Verify environment variables ------------------------------
Write-Host ""
Write-Host "Verifying environment variables..." -ForegroundColor White
$VerifyPass = 0
$VerifyFail = 0

foreach ($Cred in $AllCredentials) {
    if ($Cred.host -eq 'github.com') {
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
            Write-Host "  [OK] GH_ENTERPRISE_TOKEN is set (session + persistent) ($($Cred.host))" -ForegroundColor Green
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

if ($EnvSet -gt 0) {
    Write-Host "Environment variables persisted to User scope." -ForegroundColor Cyan
    Write-Host "  New terminal windows will pick them up automatically." -ForegroundColor DarkGray
    Write-Host "  Current session also has them available." -ForegroundColor DarkGray
    Write-Host ""
}

# -- Summary ---------------------------------------------------
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host "Summary" -ForegroundColor White
Write-Host "  [OK] Stored:  $Stored token(s) to profile" -ForegroundColor Green
Write-Host "  [OK] Env vars set: $EnvSet (session + User scope)" -ForegroundColor Green
Write-Host "  [OK] Env vars verified: $VerifyPass" -ForegroundColor Green
if ($VerifyFail -gt 0) {
    Write-Host "  [FAIL] Env vars failed: $VerifyFail" -ForegroundColor Red
}
Write-Host "  [SKIP]  Skipped: $Skipped domain(s)" -ForegroundColor Yellow
Write-Host "  Total credentials: $($AllCredentials.Count)" -ForegroundColor Cyan
Write-Host ""

if ($AllCredentials.Count -gt 0) {
    Write-Host "PATs stored at:" -ForegroundColor Green
    Write-Host "  $ProfileFile" -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "These credentials enable automated PR creation in:" -ForegroundColor White
    Write-Host "  - Phase completion workflows (preplan, businessplan, techplan, etc.)" -ForegroundColor DarkGray
    Write-Host "  - Audience promotion workflows (small->medium->large)" -ForegroundColor DarkGray
    Write-Host "  - Manual promotion via promote-branch.ps1" -ForegroundColor DarkGray
    Write-Host ""

    # Open in VS Code if available
    $CodePath = Get-Command code -ErrorAction SilentlyContinue
    if ($CodePath) {
        Write-Host "Opening profile file in VS Code..." -ForegroundColor DarkGray
        & code $ProfileFile
    }

    Write-Host ""
    Write-Host "[OK] PAT setup complete! You can now close this terminal." -ForegroundColor Green
} else {
    Write-Host "No PATs were stored. Run this script again when ready." -ForegroundColor Yellow
}

Write-Host ""
