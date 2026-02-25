```prompt
---
description: Create user profile, set up GitHub PAT, and bootstrap TargetProjects for new team members (Scout)
---

Activate @lens agent and execute /onboard (discovery skill):

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/onboard` command — full onboarding workflow
3. Load `workflows/utility/onboarding/workflow.md`
4. Load repo inventory from `_bmad-output/lens-work/repo-inventory.yaml` (if exists)

This is the **first-run workflow** for new team members. It sets up profile, credentials, and clones/documents target repos.

**Execution sequence:**

**[1] Welcome**
- Scout greets the user and explains the 3-step process: profile → credentials → repos

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

Present the following command for the user to run in a **separate terminal**:

```bash
# macOS / Linux / Git Bash
cd "{PROJECT_ROOT}" && bash _bmad/lens-work/scripts/store-github-pat.sh

# Windows PowerShell
cd "{PROJECT_ROOT}"; .\_bmad\lens-work\scripts\store-github-pat.ps1
```

- Wait for user to confirm ("Continue" / "Done")
- Check if `_bmad-output/lens-work/personal/github-credentials.yaml` was created
- Credentials stored per GitHub domain (github.com, enterprise domains detected from repo inventory)

**[4] Repo Discovery & Reconciliation**
- Load service map: `_bmad/lens-work/service-map.yaml`
- Scan configured target repos in service map
- Identify which repos are already cloned vs missing
- Clone missing repos into `TargetProjects/` using configured remote URLs

**[5] Documentation Generation**
- Run `scout.repo-document` in full mode on all repos
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
- Credentials: `_bmad-output/lens-work/personal/github-credentials.yaml`
- Roster: `_bmad-output/lens-work/roster/{name-slug}.yaml`
- Repo inventory: `_bmad-output/lens-work/repo-inventory.yaml`
- Personal repo state: `_bmad-output/lens-work/personal/personal-repo-inventory.yaml`

**Re-run behavior:** If profile already exists, present a menu:
- [1] Update profile settings
- [2] Re-run credential setup
- [3] Re-sync and re-document repos
- [4] Full re-onboard (reset all)
```
