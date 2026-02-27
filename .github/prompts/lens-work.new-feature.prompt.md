```prompt
---
description: Create new feature-level initiative with full branch topology
---

Activate @lens agent and execute /new-feature:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-feature` command to create feature initiative
3. The argument IS the feature name (e.g., `/new-feature Rate Limiting` → feature = "Rate Limiting")
4. Router dispatches to `_bmad/lens-work/workflows/router/init-initiative/` workflow

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

**Branch Review (Required at Feature Start):**
After the feature initiative is created, check the current branches in each target repo and ask if any need to change.

Service-level feature (parent is a service):
```bash
for target_repo in {target_repos}; do
  repo_path="TargetProjects/{domain_prefix}/{service_prefix}/${target_repo}"
  if [ -d "$repo_path" ]; then
    echo "📦 Repository: $target_repo"
    echo "   Current branch:"
    git -C "$repo_path" branch --show-current
    echo ""
    echo "   Available branches (remote):"
    git -C "$repo_path" branch -r
    echo ""
  fi

```

Repo-level feature (parent is a domain):
```bash
for target_repo in {target_repos}; do
  repo_path="TargetProjects/{domain_prefix}/${target_repo}"
  if [ -d "$repo_path" ]; then
    echo "📦 Repository: $target_repo"
    echo "   Current branch:"
    git -C "$repo_path" branch --show-current
    echo ""
    echo "   Available branches (remote):"
    git -C "$repo_path" branch -r
    echo ""
  fi
**Review audience progression:**
```

**Question:** Do any of these branches need to be changed?

- If **NO**: Continue with the feature workflow.
- If **YES**: Provide the target repo name and desired branch, then use one of the options below.

Repo-level features should use `TargetProjects/{domain_prefix}/{TARGET_REPO}` in the commands below.

Option A: Switch to a specific remote branch
```bash
repo_path="TargetProjects/{domain_prefix}/{service_prefix}/{TARGET_REPO}"
git -C "$repo_path" checkout -b ${NEW_BRANCH_NAME} origin/${NEW_BRANCH_NAME}
git -C "$repo_path" branch --show-current
```

Option B: Switch to the most recently updated remote branch
```bash
repo_path="TargetProjects/{domain_prefix}/{service_prefix}/{TARGET_REPO}"
MOST_RECENT=$(git -C "$repo_path" for-each-ref \
  --sort=-committerdate \
  --format='%(refname:short)' \
  refs/remotes/origin | head -1 | sed 's|origin/||')

echo "📌 Most recent branch: $MOST_RECENT"
git -C "$repo_path" checkout -b "$MOST_RECENT" "origin/$MOST_RECENT"
```

Option C: Create a new branch from main
```bash
repo_path="TargetProjects/{domain_prefix}/{service_prefix}/{TARGET_REPO}"
git -C "$repo_path" checkout -b ${NEW_BRANCH_NAME} main
```
- p1 (Analysis) → small | p2 (Planning) → medium | p3/p4 (Solutioning/Implementation) → large

Use `#think` before defining feature scope or dependencies.

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text IS the
feature name. Use it exactly as given. Do NOT invent, substitute, or hallucinate
a different name. Example: `/new-feature Rate Limiting` → feature name = "Rate Limiting".

```
