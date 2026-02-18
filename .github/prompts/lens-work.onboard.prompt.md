```prompt
---
description: Create user profile and bootstrap TargetProjects for new team members
---

Activate Scout agent and execute onboard:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `onboard` command to create profile and setup
3. Run discovery, reconcile, and documentation
4. Confirm readiness for lens-work

**Workflow:**
1. Create user profile (git identity or manual)
2. Verify TargetProjects path
3. Run repo-discover
4. Run repo-reconcile (clone missing repos)
5. Run repo-document (generate canonical docs)
6. Confirm setup complete

**Output:**
- User profile in `_bmad-output/lens-work/profiles/`
- Repos cloned to TargetProjects
- Canonical docs in `Docs/{domain}/{service}/{repo}/`

```
