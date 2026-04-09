---
agent: agent
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "First-time repository setup — clones authority repos and triggers onboarding"
---

# SetupRepo — LENS Workbench Initial Setup

This prompt performs first-time setup of a control repo for lens-work.

## Steps

### 0. Verify Working Directory

Ensure the path is set to the root of the repository (the control repo you want to set up).

### 1. Ensure {release_repo_root} Exists

If the release module is not already present locally, clone it into `{release_repo_root}` and check out the appropriate branch.

### 2. Run setup-control-repo

Use the release payload's setup script instead of manually copying `.github`, cloning governance, or writing `LENS_VERSION` yourself.

```bash
# Bash
./{release_repo_root}/_bmad/lens-work/scripts/setup-control-repo.sh
```

```powershell
# PowerShell
.\{release_repo_root}\_bmad\lens-work\scripts\setup-control-repo.ps1
```

That setup script is the supported bootstrap path. It:

- Syncs `.github/` from the release payload
- Clones or updates the governance repo
- Writes `docs/lens-work/governance-setup.yaml`
- Writes `LENS_VERSION`
- Updates `.gitignore`

### 3. Trigger Onboarding

Run the onboarding prompt only after `setup-control-repo` completes successfully:

```
/lens-work.onboard
```

This final onboarding step will:

- Create workspace directories if they are still missing
- Detect your git provider
- Validate authentication
- Bootstrap TargetProjects from governance
- Run health check

## Notes

- `/lens-work.onboard` assumes the repo has already been bootstrapped and that `LENS_VERSION` exists
- Future updates to agents/prompts will auto-sync when preflight detects changes
- See `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md` for sync logic
