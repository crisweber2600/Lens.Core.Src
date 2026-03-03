```prompt
---
description: Create new feature-level initiative with full branch topology
---

Activate @lens agent and execute /new-feature:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

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

**Minimal user input required (ask in single batch prompt):**

Present all questions together — use defaults for everything possible:
```
🚀 New Feature Setup

1. Feature name: {provided_or_prompt}
2. Work item ID {if_tracker_configured}:
   {Jira ticket ID (e.g., BMAD-123) OR Azure DevOps ID (e.g., 12345)}
   [Enter ID / Skip]
3. Branch changes needed?
   Current branches across repos:
   {list_repos_with_current_branches}
   [No changes / Specify: repo=branch]

Enter as: "feature-name | BMAD-123 | no"
```

Target repos are inherited from the parent (service or domain) by default.
Do NOT ask the user to confirm inherited repos — use them as-is.

**No-Confirm — Show & Go:**
After receiving input, display a brief summary and proceed immediately.
Do NOT ask "Confirm?" or wait for approval.
```
📋 Creating feature: {feature_name}
   Parent: {domain}/{service} | Repos: {inherited_repo_list}
   Tracker: {tracker_id or "none"} | Branches: {changes or "no changes"}
   Proceeding... (reply "edit" to change choices)
```
If the user replies "edit", pause and let them adjust specific fields, then resume.
Otherwise continue executing without waiting.

Parse user response and proceed with initiative creation.

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
- NOTE: No phase branches at init. Phase branches (e.g., `-small-preplan`) created by phase routers.
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

**Post-Creation Branch Management (if changes requested in setup):**

If user specified branch changes during setup, apply them now:

Service-level features use: `TargetProjects/{domain_prefix}/{service_prefix}/{TARGET_REPO}`
Repo-level features use: `TargetProjects/{domain_prefix}/{TARGET_REPO}`

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

**Auto-Advance:** After feature creation completes (branches pushed, state updated),
automatically execute `/start` to run preflight and begin the first lifecycle phase.
Load and execute `lens-work.start.prompt.md`. Do NOT display "Run /start" or
"Run /next" — just execute it.

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text IS the
feature name. Use it exactly as given. Do NOT invent, substitute, or hallucinate
a different name. Example: `/new-feature Rate Limiting` → feature name = "Rate Limiting".

```
