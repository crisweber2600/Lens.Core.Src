```prompt
---
description: Create new service-level initiative with service-only branch and folder scaffolding
---

Activate @lens agent and execute /new-service:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-service` command to create service initiative
3. The argument IS the service name (e.g., `/new-service Lens` → service = "Lens")
4. Router dispatches to `workflows/router/init-initiative/` workflow

**Context inheritance — service inherits from active domain:**
- Load `_bmad-output/lens-work/state.yaml` → `active_initiative`
- If `active_initiative` is set → load `initiatives/{active_initiative}/Domain.yaml`
- If `active_initiative` is null or doesn't point to a domain → **auto-discover:**
  - Scan `initiatives/*/Domain.yaml` for existing domains
  - If exactly 1 domain found → auto-select it and update `state.yaml`
  - If multiple domains found → prompt user to choose parent domain
  - If zero domains found → error: "Create a domain first with /new-domain"
- Inherit: `domain`, `domain_prefix`, `target_repos`, `question_mode`

**Minimal user input required:**
- Service name (the command argument)
- Confirm target repos (default: inherit all from Domain.yaml)
- That's it — everything else is derived

**Process mirrors /new-domain:**
1. Casey creates service branch ONLY (no audience/phase branches) and pushes immediately
2. Scaffold service folders under domain: `{domain}/{service}`
3. Create Service.yaml (service descriptor + initiative config)
4. Route to `/new-feature` within this service

Use `#think` before defining service boundaries or naming.

**Creates:**
- Branch: `{domain_prefix}-{service_prefix}` (single organizational branch — pushed immediately, no audience/phase topology)
- Service folders (nested under domain):
  - `_bmad-output/lens-work/initiatives/{domain_prefix}/{service_prefix}/` (initiative configs)
  - `TargetProjects/{domain_prefix}/{service_prefix}/` (target project repos)
  - `Docs/{domain_prefix}/{service_prefix}/` (service documentation)
- Service.yaml: `_bmad-output/lens-work/initiatives/{domain_prefix}/{service_prefix}/Service.yaml`
  - Serves as BOTH service descriptor AND initiative config (single source of truth)
  - Contains: folder locations, target_repos, docs, gates, blocks
- State file: `_bmad-output/lens-work/state.yaml` (active initiative = {domain_prefix}/{service_prefix})

**Service-layer identity:**
- `initiative_id` = `{domain_prefix}/{service_prefix}` (no random suffix generated)
- No separate `{initiative_id}.yaml` file — Service.yaml IS the initiative config

**In-Scope Repos:** Inherited from parent Domain.yaml (or subset if specified)

**Repo Onboarding:**
After service creation, instruct the user to clone each target repo into the service folder:
```
git clone <repo-url> TargetProjects/{domain_prefix}/{service_prefix}/{repo_name}
```
Repos must be cloned into the service's TargetProjects folder to be onboarded for discovery and planning.

**Note:** Service-layer does NOT create audience/phase branches.
Feature initiatives within this service will create their own branch topology.

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text IS the
service name. Use it exactly as given. Do NOT invent, substitute, or hallucinate
a different name. Example: `/new-service Auth` → service name = "Auth".

```
