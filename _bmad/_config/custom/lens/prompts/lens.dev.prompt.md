```prompt
---
description: Launch Dev phase — implementation loop with guided coding, testing, PRs
---

Activate @lens agent and execute /Dev:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /Dev command to launch implementation loop
3. Skills invoked: state-management (read), constitution (validate review gate passed), git-orchestration (create/checkout workflow branch), checklist (track implementation)
4. Route to BMM development workflows (dev-story, code-review)
5. Manage implementation loop: code → test → PR → merge

**Branch lifecycle:**
- START: `{featureBranchRoot}-{audience}-p{N}-dev` workflow branch created
- WORK: Guided coding and testing
- END: PR from workflow → phase, repeat for each story

**Prerequisites:**
- Review gate passed in state.yaml

```
