---
name: 'step-05-respond'
description: 'Render the scope-specific creation summary and next-step guidance'
---

# Step 5: Respond

**Goal:** Confirm what was created, show the resulting branch topology, and direct the user to the correct next action for the chosen scope.

---

## EXECUTION SEQUENCE

### 1. Render Scope-Specific Success Output

```yaml
if scope == "domain":
  output: |
    📂 Domain: ${initiative_root}

    ✅ Domain created successfully.
    - Branch: `${initiative_root}`
    - TargetProjects folder: `${target_projects_path}/${domain}/`
    - Config: `${config_path}`

    ▶️ Run `/new-service` to create a service under this domain.

if scope == "service":
  output: |
    📂 Service: ${initiative_root}

    ✅ Service created successfully.
    - Branch: `${initiative_root}`
    - TargetProjects folder: `${target_projects_path}/${domain}/${service}/`
    - Config: `${config_path}`

    ▶️ Next: clone your service repos into `${target_projects_path}/${domain}/${service}/`, then run `/discover`.

if scope == "feature":
  output: |
    📂 Initiative: ${initiative_root}
    🏷️ Track: ${track}
    � Phases: ${track_config.phases.join(', ')}

    ✅ Feature initiative created successfully.
    - Branch: `${initiative_root}`
    - Config: `${config_path}`

    ▶️ Run `/${track_config.start_phase}` to begin the first phase.

  if track == "express":
    output_append: |

      💡 Express track selected — run `/expressplan` to generate all planning artifacts in a single session.
```