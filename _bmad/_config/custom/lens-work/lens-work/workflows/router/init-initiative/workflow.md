---
name: init-initiative
description: Create domain, service, or feature initiatives with validated names, governance metadata scaffolding, and feature-only branch topology
agent: "@lens"
trigger: /new-initiative, /new-domain, /new-service, or /new-feature
category: router
phase_name: init
display_name: Init Initiative
entryStep: './steps/step-01-preflight.md'
inputs:
  command_name:
    description: One of /new-initiative, /new-domain, /new-service, or /new-feature
    required: true
  scope:
    description: Optional explicit scope for /new-initiative (domain, service, feature)
    required: false
    default: ""
  name:
    description: Primary command argument. For feature scope supports `<feature>`, `<service> <feature>`, or `<domain> <service> <feature>`.
    required: false
    default: ""
  domain:
    description: Optional domain context
    required: false
    default: ""
  service:
    description: Optional service context
    required: false
    default: ""
  track:
    description: Optional feature track
    required: false
    default: ""
---

# /new-initiative, /new-domain, /new-service, /new-feature - Init Initiative Workflow

**Goal:** Create a new initiative with the correct scope, validated slug-safe naming, governance-repo metadata, and feature-only git branch topology.

**Your Role:** Operate as the initiative bootstrap router. Collect only the inputs allowed for the selected scope, validate them against lifecycle and naming rules, then create governance metadata, local scaffolding, and feature topology without over-collecting data.

For `/new-feature`, explicit arguments override inferred context. A service created earlier in the same chat is reused once before the workflow falls back to git-branch context.

---

## PRE-INIT SCOPE EXPLAINER

If `inputs.command_name` is empty or the user typed a generic `/new` or `/create initiative` without specifying scope, display the scope explainer before proceeding:

```
📐 LENS uses a three-level hierarchy to organize work:

  Domain   — A broad capability area (e.g., "auth", "payments", "analytics")
             Creates: governance marker `features/{domain}/domain.yaml`
  Service  — A deployable unit within a domain (e.g., "auth-gateway", "payments-api")
             Creates: governance marker `features/{domain}/{service}/service.yaml`
  Feature  — A discrete piece of work within a service (e.g., "password-reset")
             Creates: `features/{domain}/{service}/{featureId}/feature.yaml`
             This is the only level that follows the full lifecycle (tracks, phases, milestones) and creates Lens-managed branches.

💡 Most users start with /new-feature and let LENS infer the domain and service.
   If the domain or service doesn't exist yet, LENS will create it as part of the flow.

Which would you like to create?
  [1] /new-domain   — Create a domain-level container
  [2] /new-service  — Create a service-level container
  [3] /new-feature  — Create a feature-level initiative (recommended)
```

Capture the selection and set `command_name` accordingly. If `command_name` is already set (user invoked a specific command), skip the explainer entirely.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Each step handles one stage of initiative creation: preflight, scope collection, validation, creation, and response.
- State persists through `command_name`, `scope`, `domain`, `service`, `feature`, `feature_display_name`, `feature_arg_mode`, `track`, `initiative_root`, `config_path`, `governance_repo_path`, `target_projects_path`, `track_config`, `sensing_matches`, `lifecycle`, `module_config`, `profile`, `current_context`, and `pending_container_context`.
- Domain and service scope remain lightweight governance containers; feature scope is the only path that creates lifecycle branches and reads lifecycle tracks and audiences.

### Feature Context Precedence

When the user runs `/new-feature`, resolve domain and service in this order:

1. Explicit command inputs or multi-argument feature forms
2. One-shot service context from the most recent successful `/new-service` in the same chat
3. The current initiative context derived from git

If a single `/new-feature` argument repeats the just-created service id, treat that as a follow-up cue and ask for the real feature name instead of reusing the token as the feature id.

---

## INITIALIZATION

### Configuration Loading

Load the lens-work session context already provided by `@lens` and resolve:

- `{user_name}`
- `{communication_language}`
- `{output_folder}`
- `{initiative_output_folder}`
- `{personal_output_folder}`

### Workflow References

- `preflight_include = ../../includes/preflight.md`
- `lifecycle_contract = ../../../lifecycle.yaml`
- `module_config = ../../../bmadconfig.yaml`

---

## EXECUTION

Read fully and follow: `{entryStep}`

### Step Map

1. `step-01-preflight.md` - Preflight and scope initialization
2. `step-02-collect-scope.md` - Scope-specific parameter collection and normalization
3. `step-03-validate-and-sense.md` - Slug validation, lifecycle and track checks, and overlap sensing
4. `step-04-create-initiative.md` - Governance metadata creation, local scaffolding, branch creation, commit, and push
5. `step-05-respond.md` - Final response with scope-specific next steps
