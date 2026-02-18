```prompt
---
description: Launch Analysis phase with brainstorming, research, and product brief workflows
---

Activate Compass agent and execute /pre-plan:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute `/pre-plan` command to launch Analysis phase
3. At phase start: create and push `{smallGroupBranchRoot}-p1` from `{smallGroupBranchRoot}`
4. Offer workflow options: Brainstorming → Research → Product Brief
5. At phase end: create PR from `{smallGroupBranchRoot}-p1` into `{smallGroupBranchRoot}`, delete `{smallGroupBranchRoot}-p1`, checkout `{smallGroupBranchRoot}`

Use `#think` before selecting workflows or defining the problem scope.

**Branch lifecycle:**
- START: `{smallGroupBranchRoot}-p1` branch created from `{smallGroupBranchRoot}` and pushed immediately
- WORK: All P1 workflow branches created from `-small-p1` (e.g., `-small-p1-brainstorm`)
- END: PR from `-small-p1` → `-small`, then delete `-small-p1` locally, checkout `-small`

**Prerequisites:**
- Initiative created via `#new-*` command
- Layer detected with confidence ≥ 75%

**Authorized Roles:** PO, Architect, Tech Lead

```
