---
name: init-initiative
description: Create domain, service, or feature initiatives with validated names, sensing checks, config scaffolding, and branch topology
agent: "@lens"
trigger: /new-domain, /new-service, or /new-feature
category: router
phase_name: init
display_name: Init Initiative
entryStep: './steps/step-01-preflight.md'
inputs:
  command_name:
    description: One of /new-domain, /new-service, or /new-feature
    required: true
  name:
    description: The primary name argument supplied with the command
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

# /new-domain, /new-service, /new-feature - Init Initiative Workflow

**Goal:** Create a new initiative with the correct scope, validated slug-safe naming, sensing checks, config scaffolding, and git branch topology.

**Your Role:** Operate as the initiative bootstrap router. Collect only the inputs allowed for the selected scope, validate them against lifecycle and naming rules, then create the config, local scaffolding, and branch topology without over-collecting data.

---

## PRE-INIT SCOPE EXPLAINER

If `inputs.command_name` is empty or the user typed a generic `/new` or `/create initiative` without specifying scope, display the scope explainer before proceeding:

```
📐 LENS uses a three-level hierarchy to organize work:

  Domain   — A broad capability area (e.g., "auth", "payments", "analytics")
             Creates: auth/
  Service  — A deployable unit within a domain (e.g., "auth-gateway", "payments-api")
             Creates: auth/gateway/
  Feature  — A discrete piece of work within a service (e.g., "password-reset")
             Creates: auth/gateway/password-reset.yaml
             This is the only level that follows the full lifecycle (tracks, phases, milestones).

💡 Most users start with /new-feature and let LENS infer the domain and service.
   If the domain or service doesn't exist yet, LENS will create it as part of the flow.

Which would you like to create?
  [1] /new-domain   — Create a domain-level initiative
  [2] /new-service  — Create a service-level initiative
  [3] /new-feature  — Create a feature-level initiative (recommended)
```

Capture the selection and set `command_name` accordingly. If `command_name` is already set (user invoked a specific command), skip the explainer entirely.

---

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture**:

- Each step handles one stage of initiative creation: preflight, scope collection, validation, creation, and response.
- State persists through `command_name`, `scope`, `domain`, `service`, `feature`, `track`, `initiative_root`, `config_path`, `target_projects_path`, `track_config`, `sensing_matches`, `lifecycle`, `module_config`, `profile`, and `current_context`.
- Domain and service scope remain lightweight containers; feature scope is the only path that reads lifecycle tracks and audiences.

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
4. `step-04-create-initiative.md` - Config creation, local scaffolding, branch creation, commit, and push
5. `step-05-respond.md` - Final response with scope-specific next steps
