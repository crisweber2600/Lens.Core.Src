```prompt
---
description: Launch Pre-Plan phase — brainstorming, discovery, and vision setting
---

Activate @lens agent and execute /pre-plan:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /pre-plan command to launch Pre-Plan phase
3. Skills invoked: state-management (read), constitution (validate), git-orchestration (create phase branch), checklist (generate)
4. Route to CIS brainstorming → BMM pre-planning workflows
5. At phase end: create PR, merge, advance state

Use `#think` before selecting workflows or defining the problem scope.

**Branch lifecycle:**
- START: `{featureBranchRoot}-{audience}-p1` created from `{featureBranchRoot}-{audience}` and pushed
- WORK: Workflow branches from `-p1` (e.g., `-p1-brainstorm`)
- END: PR from `-p1` → `-{audience}`, delete `-p1`, checkout `-{audience}`

**Prerequisites:**
- Initiative created via `/new` command
- Active initiative in state.yaml

```
