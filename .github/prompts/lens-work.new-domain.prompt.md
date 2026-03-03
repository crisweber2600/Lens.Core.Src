```prompt
---
description: Create new domain-level initiative with domain-only branch and folder scaffolding
---

Activate @lens agent and execute /new-domain:

**⚠️ PATH CONTEXT:** All `_bmad/` paths in this prompt are relative to the `bmad.lens.release` control repository (where this prompt file lives). Do NOT copy `_bmad/` into or resolve these paths against the user's main project repo. The agent, workflows, and skills all execute from within `bmad.lens.release/`. Only `_bmad-output/` paths are written to the user's working context.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-domain` command to create domain initiative
3. Router dispatches to `_bmad/lens-work/workflows/router/init-initiative/` workflow
4. Git-orchestration creates domain branch ONLY (no audience/phase branches) and pushes immediately
5. Scaffold domain folders and Domain.yaml
6. After domain creation, auto-execute `/new-service` within this domain (load and execute `lens-work.new-service.prompt.md`). Do NOT display "Run /new-service" — just execute it.

Use `#think` before defining domain boundaries or scope.

**Creates:**
- Branch: `{domain_prefix}` (single organizational branch — pushed immediately, no audience/phase topology)
- Domain folders:
  - `_bmad-output/lens-work/initiatives/{domain_prefix}/` (initiative configs)
  - `TargetProjects/{domain_prefix}/` (target project repos)
  - `Docs/{domain_prefix}/` (domain documentation)
- Domain.yaml: `_bmad-output/lens-work/initiatives/{domain_prefix}/Domain.yaml`
  - Serves as BOTH domain descriptor AND initiative config (single source of truth)
  - Contains: folder locations, target_repos, docs, gates, blocks
- State file: `_bmad-output/lens-work/state.yaml` (active initiative = domain_prefix)

**Domain-layer identity:**
- `initiative_id` = `domain_prefix` (no random suffix generated)
- No separate `{initiative_id}.yaml` file — Domain.yaml IS the initiative config

**In-Scope Repos:** All repos in domain (or prompt "all vs subset")

**Note:** Domain-layer does NOT create audience/phase branches.
Service and feature initiatives within this domain will create their own branch topology.

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text IS the
domain name. Use it exactly as given. Do NOT invent, substitute, or hallucinate
a different name. Example: `/new-domain BMAD` → domain name = "BMAD".

```
