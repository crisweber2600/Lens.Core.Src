---
model: Claude Sonnet 4.6 (copilot)
description: "Start BusinessPlan phase — PRD creation and UX design"
---

# /businessplan Prompt

Route to the businessplan phase workflow via the @lens phase router.

1. Run preflight before routing:
   1. Execute shared preflight from `{project-root}/_bmad/lens-work/workflows/includes/preflight.md`.
   2. If preflight reports missing authority repos, stop and direct the user to run `/onboard` first.
2. Load `lifecycle.yaml` from the lens-work module
3. Invoke phase routing for `businessplan`:
   - Validate predecessor `preplan` PR is merged
   - Check current track includes `businessplan` in its phases
   - Create phase branch `{initiative-root}-small-businessplan`
4. Execute `workflows/router/businessplan/workflow.md`
