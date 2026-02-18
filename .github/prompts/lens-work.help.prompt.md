```prompt
---
description: Display command menu with current context and suggested next step
---

Activate Compass agent and execute /help:

1. Load agent: `_bmad/lens-work/agents/compass.agent.yaml`
2. Execute help command
3. Display available commands grouped by category:

**Phase Commands:**
- `/pre-plan` — Launch Analysis phase (brainstorm/research/product brief)
- `/plan` or `/spec` — Launch Planning phase (PRD/UX/Architecture)
- `/tech-plan` — Launch Technical Planning phase (Architecture/API Contracts)
- `/story-gen` — Launch Story Generation phase (Stories/Estimates)
- `/review` — Implementation gate (readiness/sprint planning)
- `/dev` — Implementation loop (dev-story/code-review/retro)

**Initiative Commands:**
- `/new-domain` — Create domain-level initiative
- `/new-service` — Create service-level initiative
- `/new-feature` — Create feature-level initiative

**Context Commands:**
- `/switch` — Switch active initiative
- `/context` — Display current context
- `/lens` — Show/change lens focus
- `?` or `/status` — Quick status check

**Recovery Commands:**
- `/sync` — Sync state with git reality
- `/fix` — Fix state inconsistencies
- `/override` — Override state fields (requires reason)
- `/resume` — Resume interrupted workflow

**Governance:**
- `/constitution` — View/edit constitutions
- `/compliance` — Check artifact compliance
- `/ancestry` — View constitution inheritance chain

**Discovery:**
- `/onboard` — Full onboarding (profile + credentials + repo setup)
- `/discover` — Run repo discovery
- `/domain-map` — View domain architecture map

4. Show current context summary (active initiative, phase, branch)
5. Suggest next step based on current state
```
