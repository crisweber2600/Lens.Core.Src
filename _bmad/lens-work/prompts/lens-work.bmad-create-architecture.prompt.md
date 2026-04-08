---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Run bmad-create-architecture with Lens feature, repo, and governance context"
---

# /bmad-create-architecture Prompt

Route to the shared Lens BMAD wrapper workflow.

1. **Preflight**: Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.
2. Execute `{project-root}/lens.core/_bmad/lens-work/workflows/utility/lens-bmad-skill/workflow.md` with parameters:
   - `skill_id`: `bmad-create-architecture`
3. The wrapper resolves the active feature scope, planning output path, and governance context before delegating to the BMAD skill.