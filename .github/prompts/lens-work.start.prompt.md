```prompt
---
description: Run LENS Workbench preflight check and activate @lens for lifecycle navigation
---

Activate @lens agent and run preflight check:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Load lifecycle contract: `_bmad/lens-work/lifecycle.yaml`
3. Load module config: `_bmad/lens-work/bmadconfig.yaml`
4. Check if user profile exists: `_bmad-output/lens-work/personal/profile.yaml`
5. Load state: `_bmad-output/lens-work/state.yaml` (if exists)
6. Determine current context and present orientation report
7. Route user to the appropriate next action

Use `#think` before determining what the user should do next.

**Preflight checklist:**

| Check | File | Action if missing |
|-------|------|-------------------|
| Profile | `_bmad-output/lens-work/personal/profile.yaml` | Route to `/onboard` |
| State file | `_bmad-output/lens-work/state.yaml` | Create empty state, prompt for first initiative |
| Repo inventory | `_bmad-output/lens-work/repo-inventory.yaml` | Suggest `/bootstrap` |
| Active initiative | `state.active_initiative` | Prompt to create or resume |

**Orientation output (always shown):**

```
🔭 LENS Workbench — Ready

Profile:    {name} ({role})
Initiative: {active_initiative.name} [{current_phase}] — {workflow_status}
Branch:     {current_branch}
Audience:   {current_audience}

Lifecycle Progress:
  preplan ──► businessplan ──► techplan ──► devproposal ──► sprintplan ──► dev
  {highlight current phase with ►}
```

**Routing logic (present in order of relevance):**

1. **No profile** → "Run `/onboard` to set up your profile and repositories."
2. **No active initiative** → "Run `/new-initiative` to start a new feature, service, or domain."
3. **Active initiative, workflow_status = `in_progress`** → "Resume: `/resume` to continue `{current_phase}`."
4. **Active initiative, phase complete, promotion pending** → "Run `/promote` to advance `{source_audience}` → `{target_audience}`."
5. **Active initiative, promotion complete, next phase ready** → "Run `/{next_phase_prompt}` to start the next phase."
6. **All phases complete** → "Initiative `{name}` is complete. Run `/archive` or `/new-initiative`."

**Next step block (always shown at end):**
```
Suggested next step: {single most relevant action}

Type /help for the full command reference.
```

**If no arguments provided:** Run full orientation as described above.

**If user provides text:** Treat it as a question or context and answer using
current state before showing orientation. Example: `/start what phase am I in?`
```
