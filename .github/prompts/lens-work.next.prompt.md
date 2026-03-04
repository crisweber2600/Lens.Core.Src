---
description: 'Execute the next required action directly without prompting for status first (@lens)'
---

Activate @lens agent and execute /next:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/next` command — determine and execute next action
3. Load `_bmad/lens-work/workflows/utility/next/workflow.md`

This is a **productivity shortcut** that eliminates the two-step pattern of:
- Step 1: Ask "what's next?"
- Step 2: Execute the suggested action

**How it works:**

1. **Load Current State** — Read `state.yaml` and initiative config
2. **Determine Next Action** — Based on current phase, status, gates, and blocks
3. **Execute Directly** — Run the next command without requiring confirmation

**Decision Logic:**

| Current State | Next Action |
|---------------|-------------|
| No active initiative | Prompt for `#new-domain`, `#new-service`, or `#new-feature` |
| Phase in progress | Continue current phase workflow |
| Dev phase with stories in `review` | Continue `/dev` to complete review/fix cycle before PR progression |
| Phase complete, more phases in track | Start next phase in sequence |
| All small-audience phases complete | Promote to medium (`@lens promote`) |
| Medium audience approved | Promote to large |
| Large audience approved | Promote to base |
| Base approved, no blocks | Start development phase (`/dev`) |
| Active blocks | Display blocks and suggest resolution |

**Example Flows:**

```
User: @lens next

[No initiative]
→ Creates new initiative prompt

[preplan complete, businessplan in track]
→ Executes /businessplan

[all small phases complete]
→ Executes @lens promote (small→medium)

[base approved, ready for dev]
→ Executes /dev
```

**Benefits:**
- Single command to continue work
- No context switching to check status
- Reduces prompt overhead
- Maintains flow state
