---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Run bmad-quick-dev with Lens feature scope, target repo resolution, and write-boundary guidance"
---

# /bmad-quick-dev Prompt

Route to the shared Lens BMAD wrapper workflow.

1. **Preflight**: Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.
2. Execute `{project-root}/lens.core/_bmad/lens-work/workflows/utility/lens-bmad-skill/workflow.md` with parameters:
   - `skill_id`: `bmad-quick-dev`
3. The wrapper resolves the active feature scope, target repo, and implementation write boundaries before delegating to the BMAD skill.