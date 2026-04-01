---
model: Claude Sonnet 4.6 (copilot)
description: "Run a retrospective on an initiative — review what worked, what broke, and capture lessons"
---

# /retrospective Prompt

Route to the retrospective workflow via the @lens router.

1. Run preflight before routing:
   1. Execute shared preflight from `{project-root}/_bmad/lens-work/workflows/includes/preflight.md`.
   2. If preflight reports missing authority repos, stop and direct the user to run `/onboard` first.
2. Load `lifecycle.yaml` from the lens-work module
3. Execute `workflows/router/retrospective/workflow.md`
