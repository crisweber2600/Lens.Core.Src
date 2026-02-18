```prompt
---
description: Scan and inventory repositories in target_projects_path
---

Activate @lens agent and execute /discover:

1. Load agent: `_bmad/lens/agents/lens.agent.yaml`
2. Execute /discover command (read-only)
3. Scan for repositories under target_projects_path
4. Update repo-inventory.yaml with findings
5. Summarize repo list, languages, and notable signals
6. Suggest the next command (usually /bootstrap or /new)

```
