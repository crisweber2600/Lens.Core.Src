````prompt
```prompt
---
description: Create a new initiative — cascades through domain → service → docs → feature in one session with a single batch prompt
---

Activate @lens agent and execute /new-initiative:

**⚠️ PATH CONTEXT — TWO DIRECTORIES:** This prompt operates across two directories:
- **`_bmad/` paths** → resolve inside the `bmad.lens.release/` subdirectory (read-only source of workflows, skills, agents)
- **`_bmad-output/` paths, git branches, commits, and state files** → resolve in the **control repo root** (the parent directory that CONTAINS `bmad.lens.release/`). ALL git operations (checkout, branch, commit, push) happen here — NEVER inside `bmad.lens.release/`.

1. Load `@lens` agent: `_bmad/_config/custom/lens-work/lens.agent.yaml`
2. Execute `/new-initiative` command to begin initiative creation
3. Load `_bmad-output/lens-work/state.yaml` to detect existing initiative context
4. Scan `_bmad-output/lens-work/initiatives/` to discover existing domains and services
5. Determine the FIRST missing layer and cascade through ALL subsequent layers

Use `#think` before determining the correct initiative layer.

---

## Layer Detection Logic

Scan existing state to determine which layers already exist:

1. **No domains exist** → Start cascade at `/new-domain`
   - No `Domain.yaml` files found anywhere under `initiatives/`

2. **Domain exists, no services under it** → Start cascade at `/new-service`
   - One or more `Domain.yaml` files exist but no `Service.yaml` under the active domain

3. **Domain + service exist, no docs** → Start cascade at auto-documentation
   - Both `Domain.yaml` and `Service.yaml` exist, but `docs/{domain_prefix}/{service_prefix}/` is empty or missing project-context.md

4. **Domain + service + docs exist** → Start cascade at `/new-feature`
   - Default path for ongoing work

5. **User explicitly specifies layer** → Route directly to that layer (no cascade):
   - User says "new domain" → `/new-domain` only
   - User says "new service" → `/new-service` only
   - User says "new feature" → `/new-feature` only

## State Resolution (in priority order)

- Check `state.yaml` → `active_initiative` for current context
- If active_initiative points to a service → use that as parent
- If active_initiative points to a domain → use that as parent
- If active_initiative is null → full discovery scan

**Discovery scan:**
- Scan `initiatives/*/*/Service.yaml` → list services
- Scan `initiatives/*/Domain.yaml` → list domains
- If exactly 1 parent found → auto-select and confirm with user
- If multiple found → present numbered list, prompt user to choose
- If 0 found → start cascade from `/new-domain`

---

## Cascade Mode (default behavior)

When `/new-initiative` detects missing layers, it cascades through ALL of them in
a single session. The user provides all input up front in ONE batch prompt, then
the system executes each layer sequentially without pausing for manual commands.

**Batch Prompt — collect all info up front:**

Present a single batch prompt that covers all layers the cascade will touch.
Only include questions for layers that need to be created:

```
🚀 New Initiative Setup

{if domain needed}
1. Domain name: {user_provided_text OR prompt}

{if service needed}
2. Service name: {derived from target repo OR prompt}
3. Target repo URL or path: {prompt — e.g., https://github.com/org/repo OR TargetProjects/path}

{if docs needed — always when service is new}
4. Doc scan depth: [Quick / **Deep** (default) / Exhaustive]

{always — feature is always the final layer}
5. Feature name: {user_provided_text OR prompt — e.g., "Baseline"}
6. Work item ID (optional): {Jira/ADO ID or Skip}

Enter as: "domain-name service-name repo-url deep feature-name skip"
```

Adapt the prompt to only show questions for missing layers. If domain already
exists, skip questions 1-2. If service exists, skip questions 2-4. Etc.

**No-Confirm — Show & Go:**
After receiving batch input, display a brief summary of resolved choices and
proceed immediately. Do NOT ask "Confirm?" or wait for approval.
```
📋 Creating: domain={X} → service={Y} → docs(deep) → feature={Z}
   Repos: {repo_list}
   Proceeding... (reply "edit" to change choices)
```
If the user replies "edit", pause and let them adjust specific fields, then resume.
Otherwise continue executing without waiting.

**Cascade Execution Sequence:**

After receiving batch input, execute each layer in order. Do NOT pause between
layers or ask the user to run a separate command.

### Step 1: Domain (if needed)
- Execute `/new-domain` logic inline (from `lens-work.new-domain.prompt.md`)
- Create domain branch, Domain.yaml, scaffold folders
- Proceed immediately to Step 2

### Step 2: Service (if needed)
- Execute `/new-service` logic inline (from `lens-work.new-service.prompt.md`)
- Inherit from domain, create service branch, Service.yaml, scaffold folders
- Clone target repo if not already present in `TargetProjects/{domain_prefix}/{service_prefix}/`
- Proceed immediately to Step 3

### Step 3: Auto-Documentation (if needed)
- Check `docs/{domain_prefix}/{service_prefix}/` for existing `project-context.md`
- If missing or empty → execute auto-documentation:
  1. Load and follow `_bmad/bmm/workflows/document-project/instructions.md`
     - Use the scan depth selected by user (default: **deep**)
     - Project root = `TargetProjects/{domain_prefix}/{service_prefix}/{repo_name}`
     - Output to = `docs/{domain_prefix}/{service_prefix}/`
  2. Load and follow `_bmad/bmm/workflows/generate-project-context/workflow.md`
     - Output `project-context.md` to `docs/{domain_prefix}/{service_prefix}/`
- If docs already exist → skip (offer re-scan only if user explicitly asks)
- Proceed immediately to Step 4

### Step 4: Feature (always)
- Execute `/new-feature` logic inline (from `lens-work.new-feature.prompt.md`)
- Inherit from service (or domain), create branch topology, initiative config
- After feature creation → **auto-execute `/start`** to begin first phase

---

## Cascade Routing Table

| Starting State | Cascade Steps | Creates |
|----------------|---------------|---------|
| No domains | domain → service → docs → feature → start | Full hierarchy |
| Domain exists, no service | service → docs → feature → start | Service + feature |
| Domain + service, no docs | docs → feature → start | Docs + feature |
| Domain + service + docs | feature → start | Feature only |
| User specifies single layer | That layer only (no cascade) | Per target layer |

---

## Non-Cascade Mode (explicit layer)

When the user explicitly specifies a layer (e.g., "new domain", "new service",
"new feature"), execute ONLY that layer's prompt — do not cascade.

- Load the target prompt and execute it fully
- The individual prompt's own auto-advance behavior applies
  (e.g., `/new-domain` auto-advances to `/new-service`)

---

## Auto-Advance Convention

After the cascade completes (or after a single-layer execution), the final
step auto-executes `/start` to run preflight and begin the first lifecycle
phase. Do NOT display "Run /start" or "Run /next" — just execute it.

Exception: If the user only created a domain or service (no feature), do NOT
auto-start phases — instead auto-advance to the next missing layer.

---

**CRITICAL — User Input Anchoring:**
If the user provided text alongside this prompt invocation, that text is the name
of the initiative. Pass it through unchanged to the appropriate layer. The text
becomes the domain name (if domain is the first layer) or the feature name (if
domain/service already exist). Do NOT invent or substitute a different name.
Example: `/new-initiative Rate Limiting` → feature name = "Rate Limiting".
```

````
