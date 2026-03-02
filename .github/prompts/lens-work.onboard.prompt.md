```prompt
---
description: 'Create user profile, set up GitHub PAT, and bootstrap TargetProjects for new team members (@lens/discovery)'
---

Activate @lens agent and execute /onboard (discovery skill):

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/onboard` command — full onboarding workflow
3. Load `_bmad/lens-work/workflows/utility/onboarding/workflow.md`
4. Load repo inventory from `_bmad-output/lens-work/repo-inventory.yaml` (if exists)

This is the **first-run workflow** for new team members. It sets up profile, credentials, and clones target repos.

**Execution sequence:**

**[1] Pre-flight + Profile Setup**
Read git config (name/email) and detect GitHub domains from repo inventory.

Check PAT env vars status (GITHUB_PAT, GH_ENTERPRISE_TOKEN, GH_TOKEN):
- If all domains covered: skip to [2]
- If missing: include in single combined prompt below

**Single Onboarding Prompt:**
```
Hello {git_user_name}

Set up your profile to enable initiative tracking:
 1. Role: [Developer | Tech Lead | Architect | Product Owner | Scrum Master]
 2. Scope: {detected_domains} or [all]
 3. Question mode: [Interactive | Batch]
 4. Work items: [Jira | Azure DevOps | None]
{conditional_if_missing_pats}
 5. GitHub PATs: [Already set in ENV | Run setup script now]
```

- Write profile + PAT config to `_bmad-output/lens-work/personal/profile.yaml` (gitignored)

**If PAT setup selected:** Present single terminal command (detect OS automatically):
```bash
# Auto-detected for your platform:
cd "{PROJECT_ROOT}" && bash bmad.lens.release/_bmad/lens-work/scripts/store-github-pat.sh  # Unix/Mac
# OR
cd "{PROJECT_ROOT}"; .\bmad.lens.release\_bmad\lens-work\scripts\store-github-pat.ps1  # Windows
```
Wait for confirmation, then verify `git_credentials` added to profile.

⚠️ SECURITY: Never paste PAT into chat — use separate terminal only.

**[2] Repo Discovery & Cloning**
- Load service map: `_bmad/lens-work/service-map.yaml`
- Scan configured target repos and clone missing ones into `TargetProjects/`
- Report cloned count

**[3] Completion**
```
🎉 Onboarding Complete!

Profile: {name} ({role}, {scope})
Ready: {cloned_count} repos cloned

Next: Run #new-feature "your-feature" to start, or @lens H for help
```

**Re-run Behavior:**
If profile exists: ask user whether to [Update settings | Reset & re-onboard]
```
