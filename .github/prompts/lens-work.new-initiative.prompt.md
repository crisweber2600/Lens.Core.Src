```prompt
---
description: Create a new initiative — intelligently routes to /new-domain, /new-service, or /new-feature based on context
---

Activate @lens agent and execute /new-initiative:

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-initiative` command to begin initiative creation
3. Load `_bmad-output/lens-work/state.yaml` to detect existing initiative context
4. Scan `_bmad-output/lens-work/initiatives/` to discover existing domains and services
5. Determine initiative layer based on context and user input, then route accordingly

Use `#think` before determining the correct initiative layer.

**Layer detection logic:**

1. **No domains exist** → Route to `/new-domain`
   - No `Domain.yaml` files found anywhere under `initiatives/`
   - Prompt: "No domains found. Let's create a domain first."

2. **Domain exists, no services under it** → Route to `/new-service`
   - One or more `Domain.yaml` files exist but no `Service.yaml` under the active domain
   - Prompt: "Domain found. Create a service within it?"

3. **Domain + service exist** → Route to `/new-feature`
   - Both `Domain.yaml` and `Service.yaml` exist in active or discoverable parent
   - Default path for ongoing work

4. **User explicitly specifies layer** → Route directly:
   - User says "new domain" → `/new-domain`
   - User says "new service" → `/new-service`
   - User says "new feature" → `/new-feature`

**State resolution (in priority order):**
- Check `state.yaml` → `active_initiative` for current context
- If active_initiative points to a service → use that service as parent for `/new-feature`
- If active_initiative points to a domain → prompt: service or feature?
- If active_initiative is null → full discovery scan

**Discovery scan:**
- Scan `initiatives/*/*/Service.yaml` → list services
- Scan `initiatives/*/Domain.yaml` → list domains
- If exactly 1 parent found → auto-select and confirm with user
- If multiple found → present numbered list, prompt user to choose
- If 0 found → route to `/new-domain`

**Routes to:**
| Condition | Route | Creates |
|-----------|-------|---------|
| No domains | `/new-domain` | Domain branch + Domain.yaml |
| Domain, no service | `/new-service` | Service branch + Service.yaml |
| Domain + service | `/new-feature` | Full audience branch topology |
| User specifies layer | Direct route | Per target layer |

**After routing:**
- Load the target prompt and execute it fully
- Do NOT return to this prompt after routing — the target workflow runs to completion

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text is the name
of the initiative. Pass it through unchanged to the target prompt (`/new-domain`,
`/new-service`, or `/new-feature`). Do NOT invent or substitute a different name.
Example: `/new-initiative Rate Limiting` → feature name = "Rate Limiting".
```
