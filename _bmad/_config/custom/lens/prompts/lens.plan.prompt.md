```prompt
---
description: Launch Plan phase — product requirements, epics, and feature definition
---

Activate @lens agent and execute /plan:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /plan command to launch Plan phase
3. Skills invoked: state-management (read), constitution (validate pre-plan gate passed), git-orchestration (create/checkout phase branch), checklist (generate plan checklist)
4. Route to BMM product planning workflows (PRD, epics, user stories, acceptance criteria)
5. At phase end: create PR, merge, advance state

**Branch lifecycle:**
- START: `{featureBranchRoot}-{audience}-p{N}` created and pushed
- WORK: Workflow branches from phase branch
- END: PR from phase → audience, delete phase branch, advance state

**Prerequisites:**
- Pre-plan gate passed in state.yaml
- Active initiative with valid audiences

```
