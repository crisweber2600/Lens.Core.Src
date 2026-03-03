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

1. **No profile** → Auto-execute `/onboard`. Load and execute `lens-work.onboard.prompt.md`.
2. **No active initiative** → Auto-execute `/new-initiative`. Load and execute `lens-work.new-initiative.prompt.md`.
3. **Active initiative, workflow_status = `in_progress`** → Auto-execute `/resume` to continue `{current_phase}`.
4. **Active initiative, phase complete, promotion pending** → Auto-execute `@lens promote`. Load and execute `lens-work.promote.prompt.md`. After promote PR: pause for merge, then auto-advance to next phase.
5. **Active initiative, promotion complete, next phase ready** → Auto-execute `/{next_phase_prompt}` — load and execute the target phase prompt.
6. **All phases complete** → Display completion summary. Do NOT auto-advance — ask user whether to archive or start new initiative.

**Auto-Advance (always):**
After showing the orientation report, immediately auto-execute the most relevant
action from the routing logic above. Do NOT display "Suggested next step" or ask
the user to manually run a command. Just execute it.

Exception: If the situation is ambiguous (multiple active initiatives, errors in
state), present the orientation report and ask the user to choose.

**If no arguments provided:** Run full orientation as described above.

**If user provides text:** Treat it as a question or context and answer using
current state before showing orientation. Example: `/start what phase am I in?`
```
