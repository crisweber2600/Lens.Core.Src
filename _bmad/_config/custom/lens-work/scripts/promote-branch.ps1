#Requires -Version 5.1
<#!
.SYNOPSIS
    LENS Workbench — Branch promotion + cleanup helper

.DESCRIPTION
    Promotes a source branch to its next target (audience/phase/workflow),
    prints a PR URL, and optionally cleans up merged branches locally and remotely.

.USAGE
    .\_bmad\lens-work\scripts\promote-branch.ps1
    .\_bmad\lens-work\scripts\promote-branch.ps1 -SourceBranch my-initiative-small
    .\_bmad\lens-work\scripts\promote-branch.ps1 -SourceBranch my-initiative-small-techplan -Cleanup
    .\_bmad\lens-work\scripts\promote-branch.ps1 -SourceBranch my-initiative-small -TargetBranch my-initiative-medium -Cleanup -CleanupChildren
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SourceBranch,
    [string]$TargetBranch,
    [string]$Remote = 'origin',
    [switch]$Cleanup,
    [switch]$CleanupChildren,
    [switch]$SkipCleanCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args,
        [switch]$AllowFailure
    )

    $output = & git @Args 2>&1
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed: $output"
    }
    return $output
}

function Test-LocalBranch {
    param([string]$Branch)
    Invoke-Git -Args @('show-ref', '--verify', "refs/heads/$Branch") -AllowFailure | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Test-RemoteBranch {
    param([string]$Branch)
    $result = Invoke-Git -Args @('ls-remote', '--heads', $Remote, $Branch) -AllowFailure
    return (-not [string]::IsNullOrWhiteSpace($result))
}

function Get-BranchContext {
    param([string]$Branch)

    $parts = $Branch -split '-'
    $audiences = @('small', 'medium', 'large')
    $audIndex = -1
    for ($i = $parts.Length - 1; $i -ge 0; $i--) {
        if ($audiences -contains $parts[$i]) {
            $audIndex = $i
            break
        }
    }

    if ($audIndex -lt 0) {
        return $null
    }

    $root = if ($audIndex -gt 0) { ($parts[0..($audIndex - 1)] -join '-') } else { '' }
    $suffix = @()
    if ($audIndex + 1 -lt $parts.Length) {
        $suffix = $parts[($audIndex + 1)..($parts.Length - 1)]
    }

    return @{
        Root = $root
        Audience = $parts[$audIndex]
        Suffix = $suffix
    }
}

function Get-PromotionPlan {
    param([string]$Branch)

    $ctx = Get-BranchContext -Branch $Branch
    if (-not $ctx) {
        return $null
    }

    $root = $ctx.Root
    $audience = $ctx.Audience
    $suffix = $ctx.Suffix

    if ($suffix.Count -eq 0) {
        switch ($audience) {
            'small'  { return @{ Kind = 'audience'; Target = "$root-medium" } }
            'medium' { return @{ Kind = 'audience'; Target = "$root-large" } }
            'large'  { return @{ Kind = 'audience'; Target = "$root" } }
        }
    }

    if ($suffix.Count -eq 1) {
        return @{ Kind = 'phase'; Target = "$root-$audience" }
    }

    $phase = $suffix[0]
    return @{ Kind = 'workflow'; Target = "$root-$audience-$phase" }
}

function Get-RemoteUrl {
    param([string]$RemoteName)
    return (Invoke-Git -Args @('remote', 'get-url', $RemoteName)).Trim()
}

function Parse-RemoteUrl {
    param([string]$RemoteUrl)

    $info = [ordered]@{
        Host = $null
        Org = $null
        Project = $null
        Repo = $null
        Platform = 'unknown'
    }

    if ($RemoteUrl -match '^https?://[^/]*dev\.azure\.com/([^/]+)/([^/]+)/_git/([^/]+?)(\.git)?$') {
        $info.Host = 'dev.azure.com'
        $info.Org = $Matches[1]
        $info.Project = $Matches[2]
        $info.Repo = $Matches[3]
        $info.Platform = 'azdo'
        return $info
    }

    if ($RemoteUrl -match '^git@ssh\.dev\.azure\.com:v3/([^/]+)/([^/]+)/([^/]+?)(\.git)?$') {
        $info.Host = 'dev.azure.com'
        $info.Org = $Matches[1]
        $info.Project = $Matches[2]
        $info.Repo = $Matches[3]
        $info.Platform = 'azdo'
        return $info
    }

    if ($RemoteUrl -match '^https?://([^/]+)/([^/]+)/([^/]+?)(\.git)?$') {
        $info.Host = $Matches[1]
        $info.Org = $Matches[2]
        $info.Repo = $Matches[3]
        $info.Platform = ($info.Host -match 'gitlab\.com') ? 'gitlab' : 'github'
        return $info
    }

    if ($RemoteUrl -match '^git@([^:]+):([^/]+)/([^/]+?)(\.git)?$') {
        $info.Host = $Matches[1]
        $info.Org = $Matches[2]
        $info.Repo = $Matches[3]
        $info.Platform = ($info.Host -match 'gitlab\.com') ? 'gitlab' : 'github'
        return $info
    }

    if ($RemoteUrl -match '^ssh://git@([^/]+)/([^/]+)/([^/]+?)(\.git)?$') {
        $info.Host = $Matches[1]
        $info.Org = $Matches[2]
        $info.Repo = $Matches[3]
        $info.Platform = ($info.Host -match 'gitlab\.com') ? 'gitlab' : 'github'
        return $info
    }

    return $info
}

function Get-PrUrl {
    param(
        [hashtable]$RemoteInfo,
        [string]$Source,
        [string]$Target
    )

    if ($RemoteInfo.Platform -eq 'github' -and $RemoteInfo.Host -and $RemoteInfo.Org -and $RemoteInfo.Repo) {
        return "https://$($RemoteInfo.Host)/$($RemoteInfo.Org)/$($RemoteInfo.Repo)/compare/$Target...$Source"
    }

    if ($RemoteInfo.Platform -eq 'gitlab' -and $RemoteInfo.Host -and $RemoteInfo.Org -and $RemoteInfo.Repo) {
        return "https://$($RemoteInfo.Host)/$($RemoteInfo.Org)/$($RemoteInfo.Repo)/-/merge_requests/new?source_branch=$Source&target_branch=$Target"
    }

    if ($RemoteInfo.Platform -eq 'azdo' -and $RemoteInfo.Org -and $RemoteInfo.Project -and $RemoteInfo.Repo) {
        return "https://dev.azure.com/$($RemoteInfo.Org)/$($RemoteInfo.Project)/_git/$($RemoteInfo.Repo)/pullrequestcreate?sourceRef=$Source&targetRef=$Target"
    }

    return "MANUAL: Create PR from $Source -> $Target"
}

function Get-RepoRoot {
    $root = Invoke-Git -Args @('rev-parse', '--show-toplevel') -AllowFailure
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($root)) {
        return $root.Trim()
    }

    return (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
}

function Get-GithubPat {
    param(
        [string]$Host,
        [string]$CredFile
    )

    if (-not $Host -or -not (Test-Path $CredFile)) {
        return $null
    }

    $current = $null
    foreach ($line in Get-Content $CredFile) {
        if ($line -match '^\s*([A-Za-z0-9._-]+)\s*:\s*$') {
            $current = $Matches[1].Trim()
            continue
        }

        if ($current -eq $Host -and $line -match '^\s*token\s*:\s*(.+?)\s*$') {
            return $Matches[1].Trim()
        }
    }

    return $null
}

function Ensure-CleanState {
    $status = Invoke-Git -Args @('status', '--porcelain')
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw 'Uncommitted changes detected. Commit or stash before promoting.'
    }
}

function Ensure-TargetCheckedOut {
    param([string]$Branch)

    if (Test-LocalBranch -Branch $Branch) {
        Invoke-Git -Args @('checkout', $Branch) | Out-Null
        return
    }

    if (Test-RemoteBranch -Branch $Branch) {
        Invoke-Git -Args @('checkout', '-b', $Branch, "$Remote/$Branch") | Out-Null
        return
    }

    throw "Target branch '$Branch' not found locally or on '$Remote'."
}

if (-not $SourceBranch) {
    $SourceBranch = (Invoke-Git -Args @('branch', '--show-current')).Trim()
}

if ([string]::IsNullOrWhiteSpace($SourceBranch)) {
    throw 'Source branch is required (unable to detect current branch).'
}

if (-not $TargetBranch) {
    $plan = Get-PromotionPlan -Branch $SourceBranch
    if (-not $plan) {
        throw 'Unable to infer target branch. Provide -TargetBranch explicitly.'
    }

    $TargetBranch = $plan.Target
    $PromotionKind = $plan.Kind
} else {
    $PromotionKind = 'manual'
}

if (-not $SkipCleanCheck) {
    Ensure-CleanState
}

Invoke-Git -Args @('fetch', $Remote, '--prune') | Out-Null

$remoteUrl = Get-RemoteUrl -RemoteName $Remote
$remoteInfo = Parse-RemoteUrl -RemoteUrl $remoteUrl
$prUrl = Get-PrUrl -RemoteInfo $remoteInfo -Source $SourceBranch -Target $TargetBranch

$repoRoot = Get-RepoRoot
$credFile = Join-Path $repoRoot '_bmad-output\lens-work\personal\github-credentials.yaml'
$pat = $null
$patSource = $null
if ($remoteInfo.Platform -eq 'github') {
    # Priority 1: Environment variables
    if ($env:GITHUB_PAT) {
        $pat = $env:GITHUB_PAT
        $patSource = 'GITHUB_PAT environment variable'
    } elseif ($env:GH_TOKEN) {
        $pat = $env:GH_TOKEN
        $patSource = 'GH_TOKEN environment variable'
    } else {
        # Priority 2: Credentials file
        $pat = Get-GithubPat -Host $remoteInfo.Host -CredFile $credFile
        if ($pat) {
            $patSource = 'github-credentials.yaml'
        }
    }
    if ($pat) {
        $env:GH_TOKEN = $pat
    }
}

if (Test-LocalBranch -Branch $SourceBranch) {
    Invoke-Git -Args @('push', $Remote, $SourceBranch) | Out-Null
}

if (-not (Test-RemoteBranch -Branch $TargetBranch) -and -not (Test-LocalBranch -Branch $TargetBranch)) {
    throw "Target branch '$TargetBranch' not found locally or on '$Remote'."
}

Write-Host "Promotion plan" -ForegroundColor White
Write-Host "  Kind:   $PromotionKind" -ForegroundColor Cyan
Write-Host "  Source: $SourceBranch" -ForegroundColor Cyan
Write-Host "  Target: $TargetBranch" -ForegroundColor Cyan
if ($remoteInfo.Host) {
    Write-Host "  Remote: $($remoteInfo.Host)" -ForegroundColor Cyan
}
if ($remoteInfo.Platform -eq 'github') {
    if ($pat) {
        Write-Host "  PAT:    loaded from $patSource" -ForegroundColor DarkGreen
    } elseif (Test-Path $credFile) {
        Write-Host "  PAT:    not found for $($remoteInfo.Host)" -ForegroundColor Yellow
        Write-Host "  Action: URL-only (set GITHUB_PAT env var or run store-github-pat.ps1)" -ForegroundColor Yellow
    } else {
        Write-Host "  PAT:    no credentials found" -ForegroundColor Yellow
        Write-Host "  Action: URL-only (set GITHUB_PAT env var or run store-github-pat.ps1)" -ForegroundColor Yellow
    }
}
Write-Host "  PR:     $prUrl" -ForegroundColor Yellow
Write-Host ""

if (-not $Cleanup) {
    Write-Host 'Cleanup not requested. Use -Cleanup to remove merged branches.' -ForegroundColor DarkGray
    return
}

$merged = $false
if (Test-RemoteBranch -Branch $SourceBranch -and Test-RemoteBranch -Branch $TargetBranch) {
    Invoke-Git -Args @('merge-base', '--is-ancestor', "$Remote/$SourceBranch", "$Remote/$TargetBranch") -AllowFailure | Out-Null
    $merged = ($LASTEXITCODE -eq 0)
} elseif (Test-LocalBranch -Branch $SourceBranch -and Test-LocalBranch -Branch $TargetBranch) {
    Invoke-Git -Args @('merge-base', '--is-ancestor', $SourceBranch, $TargetBranch) -AllowFailure | Out-Null
    $merged = ($LASTEXITCODE -eq 0)
}

if (-not $merged) {
    Write-Host "Source branch '$SourceBranch' is not merged into '$TargetBranch'. Cleanup skipped." -ForegroundColor Yellow
    return
}

Ensure-TargetCheckedOut -Branch $TargetBranch

if (Test-LocalBranch -Branch $SourceBranch) {
    if ($PSCmdlet.ShouldProcess("local/$SourceBranch", 'Delete local branch')) {
        Invoke-Git -Args @('branch', '-d', $SourceBranch) | Out-Null
    }
}

if (Test-RemoteBranch -Branch $SourceBranch) {
    if ($PSCmdlet.ShouldProcess("$Remote/$SourceBranch", 'Delete remote branch')) {
        Invoke-Git -Args @('push', $Remote, '--delete', $SourceBranch) | Out-Null
    }
}

if ($CleanupChildren) {
    $localBranches = Invoke-Git -Args @('for-each-ref', 'refs/heads', '--format=%(refname:short)')
    $localChildren = $localBranches | Where-Object { $_ -like "$SourceBranch-*" }

    foreach ($branch in $localChildren) {
        if ($PSCmdlet.ShouldProcess("local/$branch", 'Delete local child branch')) {
            Invoke-Git -Args @('branch', '-d', $branch) -AllowFailure | Out-Null
        }
    }

    $remoteBranches = Invoke-Git -Args @('for-each-ref', "refs/remotes/$Remote", '--format=%(refname:short)')
    $remoteChildren = $remoteBranches |
        Where-Object { $_ -like "$Remote/$SourceBranch-*" } |
        ForEach-Object { $_.Substring($Remote.Length + 1) }

    foreach ($branch in $remoteChildren) {
        if ($PSCmdlet.ShouldProcess("$Remote/$branch", 'Delete remote child branch')) {
            Invoke-Git -Args @('push', $Remote, '--delete', $branch) -AllowFailure | Out-Null
        }
    }
}

Write-Host 'Cleanup complete.' -ForegroundColor Green
