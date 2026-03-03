```prompt
---
description: 'Create user profile, set up GitHub PAT, and bootstrap TargetProjects for new team members (@lens/discovery)'
---

Activate @lens agent and execute /onboard (discovery skill):

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/onboard` command — full onboarding workflow
3. Load `_bmad/lens-work/workflows/utility/onboarding/workflow.md`
4. Load repo inventory from `_bmad-output/lens-work/repo-inventory.yaml` (if exists)

This is the **first-run workflow** for new team members. It sets up profile, credentials, and clones target repos.

**Execution sequence:**

**[1] Pre-flight + Profile Setup**
Read git config (name/email) and detect GitHub domains from repo inventory.

Check PAT env vars status (GITHUB_PAT, GH_ENTERPRISE_TOKEN, GH_TOKEN):
- If all domains covered: skip PAT questions
- If missing: include PAT setup question

**Present onboarding questions to the user:**

Greet the user:
```
Hello {git_user_name}!

Let's set up your profile to enable initiative tracking.
```

**ASK THE FOLLOWING QUESTIONS** (use ask_questions tool or present as an interactive prompt):

1. **Role:** What's your role?
   - Options: Developer, Tech Lead, Architect, Product Owner, Scrum Master

2. **Scope:** What domain/team do you work on?
   - Options: {list detected_domains from repo inventory}, or "all" (full access to all domains)

3. **Question mode:** How do you prefer to interact?
   - Options: Interactive (step-by-step), Batch (all at once)

4. **Work items:** What work item system do you use?
   - Options: Jira, Azure DevOps, None

5. **GitHub PATs:** (Only ask if PAT env vars are missing)
   - Options: "Already set in ENV", "Run setup script now"

**After receiving user responses:**
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
```

**Auto-Advance:** After onboarding completes, automatically execute `/switch`.
Load and execute `lens-work.switch.prompt.md`. The `/switch` prompt presents the
full command menu and handles routing to the appropriate next action.
Do NOT display "Run /switch" — just execute it.

**Re-run Behavior:**
If profile exists: ask user whether to [Update settings | Reset & re-onboard].
On re-onboard, do NOT auto-advance — the user likely already has initiatives.
```
