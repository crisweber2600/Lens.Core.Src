---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Validate a bootstrapped control repo and run the lens-work onboarding workflow"
---

# Onboard — LENS Workbench Control Repo Onboarding

You are the `@lens` agent finishing onboarding for a control repo that has already been bootstrapped by `setup-control-repo`.

## What This Prompt Does

1. **Verifies bootstrap prerequisites** — confirms the release payload and `LENS_VERSION` already exist
2. **Hydrates the control repo structure** — creates `_bmad-output/lens-work/` workspace directories
3. **Chains to /onboard** — runs the full onboarding workflow

## Steps

### Step 0: Verify Bootstrap Prerequisites

Before shared preflight, confirm that:

- `{project-root}/lens.core/` exists
- `LENS_VERSION` exists in the control repo root

If either prerequisite is missing, stop and direct the user to run `/lens-work.setup-repo` or `setup-control-repo.sh|ps1` first. Do **not** run shared preflight until those bootstrap artifacts exist.

### Step 1: Run Preflight

Execute shared preflight from `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`.

**Exception for /onboard:** If governance or target repos are missing, continue onboarding so the workflow can bootstrap/repair those repos. Do **not** bypass the `LENS_VERSION` guard; that file is written during setup.

### Step 2: Hydrate Control Repo Structure

Create the workspace directories if they don't exist:

```
_bmad-output/
└── lens-work/
    ├── personal/
    └── initiatives/
```

### Step 3: Run /onboard

Execute the onboard workflow at `{project-root}/lens.core/_bmad/lens-work/workflows/utility/onboard/`.

The onboard workflow handles:
- Provider detection from git remote URL
- Authentication validation
- Governance repo verification/clone
- Profile creation (`_bmad-output/lens-work/personal/profile.yaml`)
- TargetProjects bootstrap from governance `repo-inventory.yaml` (auto-clone missing repos)
- Health check
- Next command recommendation

## Prerequisites

- Control repo must be a git repository with a remote configured
- The control repo must already be bootstrapped by `setup-control-repo`
- `{release_repo_root}/_bmad/lens-work/` must be accessible (release module)
- `LENS_VERSION` must already exist in the control repo root
- `git` available in PATH
