```prompt
---
description: 'Create user profile, set up GitHub PAT, and bootstrap TargetProjects for new team members (@lens/discovery)'
---

Activate @lens agent and execute /onboard (discovery skill):

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/onboard` command — full onboarding workflow
3. Load `_bmad/lens-work/workflows/utility/onboarding/workflow.md`
4. Load repo inventory from `_bmad-output/lens-work/repo-inventory.yaml` (if exists)

This is the **first-run workflow** for new team members. It sets up profile, credentials, and clones/documents target repos.

**Execution sequence:**

**[1] Welcome**
- @lens/discovery greets the user and explains the 3-step process: profile → credentials → repos

**[2] Create Profile**
- Read `git config user.name` and `git config user.email`
- Present combined prompt asking for:
  - Role (Developer / Tech Lead / Architect / Product Owner / Scrum Master)
  - Domain/team scope (detected from repo inventory, or "all")
  - PAT setup now? [Y/N]
  - Question mode (Interactive / Batch MD)
  - Work item tracker (Jira / Azure DevOps / None)
- Write profile to `_bmad-output/lens-work/personal/profile.yaml` (gitignored)

**[3] GitHub PAT Setup (if requested)**

⚠️ SECURITY: PATs must NEVER be entered into Copilot chat.

**Option A: Environment variables (recommended for CI/automation)**
Set environment variables for automatic PAT resolution:
- `GITHUB_PAT` — PAT for github.com
- `GH_ENTERPRISE_TOKEN` — PAT for enterprise GitHub instances
- `GH_TOKEN` — fallback for both (also used by gh CLI)

**Option B: Interactive script (stores PAT in profile.yaml)**
Present the following command for the user to run in a **separate terminal**:

```bash
# macOS / Linux / Git Bash
cd "{PROJECT_ROOT}" && bash bmad.lens.release/_bmad/lens-work/scripts/store-github-pat.sh

# Windows PowerShell
cd "{PROJECT_ROOT}"; .\bmad.lens.release\_bmad\lens-work\scripts\store-github-pat.ps1
```

- Wait for user to confirm ("Continue" / "Done")
- Check if `_bmad-output/lens-work/personal/profile.yaml` was created with `git_credentials` array
- Credentials stored per GitHub domain (github.com, enterprise domains detected from repo inventory)
- **These credentials enable automated PR creation** in:
  - Phase completion workflows (preplan, businessplan, techplan, devproposal, sprintplan)
  - Audience promotion workflows (small→medium→large)
  - Manual promotion via `promote-branch.ps1` script
- If PATs not configured, workflows will generate PR URLs only (manual creation required)

**[4] Repo Discovery & Reconciliation**
- Load service map: `_bmad/lens-work/service-map.yaml`
- Scan configured target repos in service map
- Identify which repos are already cloned vs missing
- Clone missing repos into `TargetProjects/` using configured remote URLs

**[5] Documentation Generation**
- Run `@lens/discovery repo-document` in full mode on all repos
- Write canonical docs to `Docs/{domain}/{service}/{repo}/`
- Update `_bmad-output/lens-work/repo-inventory.yaml`

**[6] Completion**
```
🎉 Onboarding Complete!

Profile: {name} ({role})
Scope:   {scope}

What's ready:
├── ✅ Profile created
├── ✅ {cloned_count} repos cloned
├── ✅ {documented_count} repos documented
└── ✅ Canonical docs generated

Next steps:
├── Run /start for orientation
├── Run /new-initiative to begin your first feature
└── Run /help for the full command reference
```

**Storage locations (all gitignored):**
- Profile: `_bmad-output/lens-work/personal/profile.yaml`
- Roster: `_bmad-output/lens-work/roster/{name-slug}.yaml`
- Repo inventory: `_bmad-output/lens-work/repo-inventory.yaml`
- Personal repo state: `_bmad-output/lens-work/personal/personal-repo-inventory.yaml`

**Re-run behavior:** If profile already exists, present a menu:
- [1] Update profile settings
- [2] Re-run credential setup
- [3] Re-sync and re-document repos
- [4] Full re-onboard (reset all)
```
