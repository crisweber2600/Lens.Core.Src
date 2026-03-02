---
description: 'Execute the next required action directly without prompting for status first (@lens)'
---

Activate @lens agent and execute /next:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

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
