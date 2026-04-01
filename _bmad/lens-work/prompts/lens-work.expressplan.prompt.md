---
model: Claude Sonnet 4.6 (copilot)
description: "Start ExpressPlan — all planning artifacts in one session, no branches, no PRs"
---

# /expressplan Prompt

Route to the expressplan workflow via the @lens phase router.

1. Run preflight before routing:
   1. Execute shared preflight from `{project-root}/_bmad/lens-work/workflows/includes/preflight.md`.
   2. If preflight reports missing authority repos, stop and direct the user to run `/onboard` first.
2. Load `lifecycle.yaml` from the lens-work module
3. Validate that the active initiative uses the `express` track
4. Execute `workflows/router/expressplan/workflow.md`
