---
mode: agent
description: "Initialize a new service within a domain"
---

Load and follow the skill at: `lens.core/_bmad/lens-work/skills/bmad-lens-init-feature/SKILL.md`

The user wants to initialize a new **service** — not a feature. This means:
1. Create the service directory under `{governance_repo}/constitutions/{domain}/{service}/`
2. Create a service-level `constitution.md` inheriting from the domain constitution
3. Do NOT create feature branches or feature.yaml — service initialization is governance-only
