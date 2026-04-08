---
model: "{default_model}"
communication_language: "{communication_language}"
document_output_language: "{document_output_language}"
description: "Run bmad-create-prd with Lens feature, governance, and output-path context"
---

# /bmad-create-prd Prompt

Route to the shared Lens BMAD wrapper workflow.

1. **Preflight**: Execute `{project-root}/lens.core/_bmad/lens-work/workflows/includes/preflight.md`. Halt if authority repos missing — direct user to `/onboard`.
2. Execute `{project-root}/lens.core/_bmad/lens-work/workflows/utility/lens-bmad-skill/workflow.md` with parameters:
   - `skill_id`: `bmad-create-prd`
3. The wrapper resolves the active domain, service, feature, governance, and preferred planning-artifact path before delegating to the BMAD skill.