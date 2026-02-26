```prompt
---
description: Create new feature-level initiative with full branch topology
---

Activate @lens agent and execute /new-feature:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-feature` command to create feature initiative
3. The argument IS the feature name (e.g., `/new-feature Rate Limiting` → feature = "Rate Limiting")
4. Router dispatches to `workflows/router/init-initiative/` workflow

**Context inheritance — feature inherits from active parent (service OR domain):**
- Load `_bmad-output/lens-work/state.yaml` → `active_initiative`
- If `active_initiative` is set → check for `Service.yaml` first, then `Domain.yaml`
- If `active_initiative` is null or doesn't point to a valid parent → **auto-discover:**
  - Scan `initiatives/*/*/Service.yaml` and `initiatives/*/Domain.yaml`
  - If exactly 1 parent found → auto-select and update `state.yaml`
  - If multiple parents found → prompt user to choose (shows [service] and [domain] options)
  - If zero parents found → error: "Create a domain (/new-domain) or service (/new-service) first"
- Inherit: `domain`, `domain_prefix`, `target_repos`, `question_mode`
- If parent is service: also inherit `service`, `service_prefix`
- If parent is domain (repo-level): `service` = null

**Feature can run at two levels:**
- **Service-level:** Parent is a service → inherits service context + domain context
- **Repo-level:** Parent is a domain → inherits domain context only, no service

**Minimal user input required:**
- Feature name (the command argument)
- Confirm target repos (default: inherit all from parent)
- That's it — everything else is derived

**Work Item Tracking:**
- Reads user's tracker preference from `personal/profile.yaml` (set during onboarding)
- If tracker is configured (`jira` or `azure-devops`), prompts for work item ID:
  - Jira: "Jira ticket ID (e.g., BMAD-123):"
  - Azure DevOps: "Azure DevOps work item ID (e.g., 12345 or AB#12345):"
- If tracker is `none`, no prompt — uses feature name directly

**Creates:**
- Initiative ID:
  - With tracker ID: `{tracker_id}-{sanitized_name}` (e.g., `BMAD-123-rate-limiting` or `12345-rate-limiting`)
  - Without tracker ID: `{sanitized_name}` (e.g., `rate-limiting`)
- Feature branch root (`{featureBranchRoot}`) computed from parent context:
  - Service parent: `{domain_prefix}-{service_prefix}-{initiative_id}`
  - Service parent + multi-repo: `{domain_prefix}-{service_prefix}-{repo}-{initiative_id}`
  - Domain parent: `{domain_prefix}-{initiative_id}`
- Branch topology (4 branches, ALL pushed immediately):
  - `{featureBranchRoot}` (initiative root — final merge target)
  - `{featureBranchRoot}-small` AKA `{smallGroupBranchRoot}` (review audience: small)
  - `{featureBranchRoot}-medium` AKA `{mediumGroupBranchRoot}` (review audience: medium)
  - `{featureBranchRoot}-large` AKA `{largeGroupBranchRoot}` (review audience: large)
- NOTE: No phase branches at init. Phase branches (e.g., `-small-p1`) created by phase routers.
- Two-file state:
  - `_bmad-output/lens-work/state.yaml` (active initiative = initiative_id)
  - `_bmad-output/lens-work/initiatives/{initiative_id}.yaml` (initiative config with parent lineage and tracker_id)

**Feature-layer identity:**
- `initiative_id` = `{tracker_id}-{sanitized_name}` (if tracker ID provided) OR `{sanitized_name}` (if no tracker)
- Initiative config records:
  - `domain`, `domain_prefix`, `service`, `service_prefix` from parent
  - `tracker_id` = work item ID (e.g., "BMAD-123" or "12345") or "" if none provided
  - `service` is null for repo-level features (domain parent)

**In-Scope Repos:** Inherited from parent (service or domain)

**Review audience progression:**
- p1 (Analysis) → small | p2 (Planning) → medium | p3/p4 (Solutioning/Implementation) → large

Use `#think` before defining feature scope or dependencies.

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text IS the
feature name. Use it exactly as given. Do NOT invent, substitute, or hallucinate
a different name. Example: `/new-feature Rate Limiting` → feature name = "Rate Limiting".

```
