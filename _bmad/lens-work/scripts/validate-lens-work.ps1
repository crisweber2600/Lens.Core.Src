# validate-lens-work.ps1
# Validates the lens-work module structure and configuration
#
# Usage:
#   pwsh scripts/validate-lens-work.ps1 -ModulePath . -Verbose
#   pwsh scripts/validate-lens-work.ps1 -Fix

param(
    [string]$ModulePath = ".",
    [switch]$Verbose,
    [switch]$Fix
)

$errors = 0
$warnings = 0

function Write-Check {
    param([string]$Label, [bool]$Pass, [string]$Detail = "")
    if ($Pass) {
        if ($Verbose) { Write-Host "  [PASS] $Label" -ForegroundColor Green }
    } else {
        Write-Host "  [FAIL] $Label $Detail" -ForegroundColor Red
        $script:errors++
    }
}

function Write-Warn {
    param([string]$Label, [string]$Detail = "")
    Write-Host "  [WARN] $Label $Detail" -ForegroundColor Yellow
    $script:warnings++
}

# ── Section 1: Required Directories ──────────────────────────────────────────

Write-Host "`nChecking required directories..." -ForegroundColor Cyan
$requiredDirs = @("agents", "workflows", "prompts", "docs", "tests")
foreach ($dir in $requiredDirs) {
    $dirPath = Join-Path $ModulePath $dir
    $exists = Test-Path $dirPath
    if (-not $exists -and $Fix) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        $exists = $true
        Write-Host "  [FIXED] Created missing directory: $dir" -ForegroundColor Yellow
    }
    Write-Check "Directory: $dir" $exists
}

# ── Section 2: Required Agent Files ──────────────────────────────────────────

Write-Host "`nChecking agent files..." -ForegroundColor Cyan
$requiredAgents = @("compass.agent.yaml", "casey.agent.yaml", "tracey.agent.yaml", "scout.agent.yaml")
foreach ($agent in $requiredAgents) {
    $agentPath = Join-Path $ModulePath "agents/$agent"
    Write-Check "Agent: $agent" (Test-Path $agentPath)
}

# ── Section 3: Agent Spec Files ──────────────────────────────────────────────

Write-Host "`nChecking agent spec files..." -ForegroundColor Cyan
$requiredSpecs = @("compass.spec.md", "casey.spec.md", "tracey.spec.md", "scout.spec.md")
foreach ($spec in $requiredSpecs) {
    $specPath = Join-Path $ModulePath "agents/$spec"
    $exists = Test-Path $specPath
    if ($exists) {
        if ($Verbose) { Write-Host "  [PASS] Spec: $spec" -ForegroundColor Green }
    } else {
        Write-Warn "Spec: $spec" "- missing (optional but recommended)"
    }
}

# ── Section 4: Workflow Categories ───────────────────────────────────────────

Write-Host "`nChecking workflow categories..." -ForegroundColor Cyan
$categories = @("core", "router", "discovery", "utility")
foreach ($cat in $categories) {
    $catPath = Join-Path $ModulePath "workflows/$cat"
    Write-Check "Workflow category: $cat" (Test-Path $catPath)
}

# ── Section 5: module.yaml Validation ────────────────────────────────────────

Write-Host "`nChecking module.yaml..." -ForegroundColor Cyan
$moduleYamlPath = Join-Path $ModulePath "module.yaml"
if (Test-Path $moduleYamlPath) {
    Write-Check "module.yaml exists" $true
    try {
        $moduleContent = Get-Content $moduleYamlPath -Raw
        # Basic YAML structure checks (not a full parser)
        Write-Check "module.yaml has 'code' field" ($moduleContent -match "^code:")
        Write-Check "module.yaml has 'name' field" ($moduleContent -match "^name:")
        Write-Check "module.yaml has 'agents' section" ($moduleContent -match "^agents:")
    } catch {
        Write-Check "module.yaml readable" $false "- $($_.Exception.Message)"
    }
} else {
    Write-Check "module.yaml exists" $false
}

# ── Section 6: Prompt Files ─────────────────────────────────────────────────

Write-Host "`nChecking prompt files..." -ForegroundColor Cyan
$promptsPath = Join-Path $ModulePath "prompts"
if (Test-Path $promptsPath) {
    $prompts = Get-ChildItem $promptsPath -Filter "*.prompt.md" -ErrorAction SilentlyContinue
    $promptCount = ($prompts | Measure-Object).Count
    Write-Check "Prompt files found" ($promptCount -gt 0) "- found $promptCount"
    foreach ($prompt in $prompts) {
        $content = Get-Content $prompt.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and -not ($content -match "^---")) {
            Write-Warn "Prompt: $($prompt.Name)" "- missing YAML frontmatter"
        }
        if (-not ($prompt.Name -match "^lens-work\.")) {
            Write-Warn "Prompt: $($prompt.Name)" "- does not follow naming convention lens-work.{command}.prompt.md"
        }
    }
} else {
    Write-Check "Prompts directory" $false
}

# ── Section 7: Workflow Definitions ──────────────────────────────────────────

Write-Host "`nChecking workflow definitions..." -ForegroundColor Cyan
$workflowsPath = Join-Path $ModulePath "workflows"
if (Test-Path $workflowsPath) {
    $workflowDirs = Get-ChildItem $workflowsPath -Recurse -Directory |
        Where-Object { -not ($_.Name -in $categories) -and -not ($_.Name -eq "includes") }
    foreach ($wfDir in $workflowDirs) {
        $wfFile = Join-Path $wfDir.FullName "workflow.md"
        if (-not (Test-Path $wfFile)) {
            Write-Warn "Workflow: $($wfDir.Name)" "- missing workflow.md"
        }
    }
}

# ── Section 8: service-map.yaml ──────────────────────────────────────────────

Write-Host "`nChecking service-map.yaml..." -ForegroundColor Cyan
$serviceMapPath = Join-Path $ModulePath "service-map.yaml"
if (Test-Path $serviceMapPath) {
    Write-Check "service-map.yaml exists" $true
} else {
    Write-Warn "service-map.yaml" "- not found (may be generated at install time)"
}

# ── Section 9: README ────────────────────────────────────────────────────────

Write-Host "`nChecking README..." -ForegroundColor Cyan
$readmePath = Join-Path $ModulePath "README.md"
if (Test-Path $readmePath) {
    $readmeContent = Get-Content $readmePath -Raw -ErrorAction SilentlyContinue
    Write-Check "README.md exists and non-empty" ($readmeContent.Length -gt 0)
} else {
    Write-Check "README.md exists" $false
}

# ── Results ──────────────────────────────────────────────────────────────────

Write-Host "`n────────────────────────────────────────" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "Validation PASSED: No errors, no warnings." -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "Validation PASSED with $warnings warning(s)." -ForegroundColor Yellow
} else {
    Write-Host "Validation FAILED: $errors error(s), $warnings warning(s)." -ForegroundColor Red
}
Write-Host "────────────────────────────────────────`n" -ForegroundColor Cyan

exit $errors
