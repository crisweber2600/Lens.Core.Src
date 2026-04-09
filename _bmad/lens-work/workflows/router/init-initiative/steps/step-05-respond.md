---
name: 'step-05-respond'
description: 'Render the scope-specific creation summary and next-step guidance'
---

# Step 5: Respond

**Goal:** Confirm what was created, show the resulting scaffold or feature topology, and direct the user to the correct next action for the chosen scope.

---

## EXECUTION SEQUENCE

### 1. Render Scope-Specific Success Output

```yaml
if scope == "domain":
  output: |
    📂 Domain: ${initiative_root}

    ✅ Domain scaffold created successfully.
    - No lifecycle branch created — domains are structural containers only
    - TargetProjects folder: `${target_projects_path}/${domain}/`
    - Governance marker: `${config_path}`
    - Governance commit: recorded on `main` in `${governance_repo_path}`

    ▶️ Run `/new-service` to create a service under this domain.

if scope == "service":
  output: |
    📂 Service: ${initiative_root}

    ✅ Service scaffold created successfully.
    - No lifecycle branch created — services are structural containers only
    - TargetProjects folder: `${target_projects_path}/${domain}/${service}/`
    - Governance marker: `${config_path}`
    - Governance commit: recorded on `main` in `${governance_repo_path}`

    ▶️ Next: clone your service repos into `${target_projects_path}/${domain}/${service}/`, then run `/discover`.

if scope == "feature":
  output: |
    📂 Initiative: ${initiative_root}
    🧭 Root pattern: ${initiative_root_pattern}
    🏷️ Track: ${track}
    📋 Phases: ${track_config.phases.join(', ')}

    ✅ Feature initiative created successfully.
    - Code branch: `${initiative_root}` (control repo)
    - Plan branch: `${initiative_root}-plan` (control repo)
    - Planning PR: ${track == "express" ? 'deferred until planning artifacts exist on the plan branch' : 'created from `${initiative_root}-plan` to `${initiative_root}`'}
    - Feature metadata: `${config_path}`
    - Governance repo: all artifacts committed to `main` (no branches)

    Visibility metadata on governance main:
    - `feature-index.yaml` entry for `${initiative_root}`
    - `summary.md` stub for `${initiative_root}`
    - Parent container markers created when missing

    ▶️ Run `/${track_config.start_phase}` to begin the first phase.

  if track == "express":
    output_append: |

      💡 Express track selected — run `/expressplan` to generate the first planning artifacts before opening any planning PR.
```