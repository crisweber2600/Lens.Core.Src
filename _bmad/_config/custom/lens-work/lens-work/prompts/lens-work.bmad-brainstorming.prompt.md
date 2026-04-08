---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Run bmad-brainstorming with Lens domain, service, feature, governance, and repo context"
---

# /bmad-brainstorming Prompt

Route to the shared Lens BMAD wrapper workflow.

1. **Preflight**: Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.
2. Execute `{project-root}/lens.core/_bmad/lens-work/workflows/utility/lens-bmad-skill/workflow.md` with parameters:
   - `skill_id`: `bmad-brainstorming`
3. The wrapper resolves active Lens context when available, injects governance and directory guidance, and then delegates to the registered BMAD skill.