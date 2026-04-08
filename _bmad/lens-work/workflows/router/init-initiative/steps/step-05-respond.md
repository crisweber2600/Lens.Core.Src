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
    - Config: `${config_path}`
    - Commit: recorded on the current branch only

    ▶️ Run `/new-service` to create a service under this domain.

if scope == "service":
  output: |
    📂 Service: ${initiative_root}

    ✅ Service scaffold created successfully.
    - No lifecycle branch created — services are structural containers only
    - TargetProjects folder: `${target_projects_path}/${domain}/${service}/`
    - Config: `${config_path}`
    - Commit: recorded on the current branch only

    ▶️ Next: clone your service repos into `${target_projects_path}/${domain}/${service}/`, then run `/discover`.

if scope == "feature":
  output: |
    📂 Initiative: ${initiative_root}
    🧭 Root pattern: ${initiative_root_pattern}
    🏷️ Track: ${track}
    � Phases: ${track_config.phases.join(', ')}

    ✅ Feature initiative created successfully.
    - Code branch: `${initiative_root}`
    - Plan branch: `${initiative_root}-plan`
    - Config: `${config_path}`
    - Feature metadata: `{initiative_output_folder}/${domain}/${service}/${initiative_root}/feature.yaml` on `${initiative_root}`

    Visibility metadata on main (when feature registry is enabled):
    - `feature-index.yaml` entry for `${initiative_root}`
    - `summary.md` stub for `${initiative_root}`

    ▶️ Run `/${track_config.start_phase}` to begin the first phase.

  if track == "express":
    output_append: |

      💡 Express track selected — run `/expressplan` to generate all planning artifacts in a single session.
```