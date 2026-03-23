---
name: 'step-04-closeout'
description: 'Commit preplan artifacts, create the phase PR, update state, and report the next command'
promotionCheckInclude: '../../../includes/promotion-check.md'
createPrScript: '../../../../scripts/create-pr.ps1'
---

# Step 4: Close Out The PrePlan Phase

**Goal:** Commit the generated preplan artifacts, create the phase PR, update initiative state, and surface the next lifecycle command.

---

## EXECUTION SEQUENCE

### 1. Commit, PR, And State Update

```yaml
invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${output_path}
  phase: PREPLAN
  initiative: ${initiative.initiative_root}
  description: "preplan artifacts complete"

invoke: git-orchestration.push
params:
  branch: ${phase_branch}

pr_result = invoke: script
script: "{createPrScript}"
params:
  SourceBranch: ${phase_branch}
  TargetBranch: ${audience_branch}
  Title: "[PHASE] ${initiative.initiative_root} - PrePlan complete"
  Body: "PrePlan complete for ${initiative.initiative_root}. Review the generated product brief and any optional brainstorm/research artifacts."

invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id || initiative.initiative_root}
  updates:
    current_phase: "preplan"
    phase_status:
      preplan:
        status: "pr_pending"
        pr_url: ${pr_result.Url || pr_result.url || null}
        pr_number: ${pr_result.Number || pr_result.number || null}

invoke: include
path: "{promotionCheckInclude}"
params:
  current_phase: "preplan"
  initiative_root: ${initiative.initiative_root}
  current_audience: "small"
  lifecycle_contract: ${lifecycle}

output: |
  ✅ /preplan complete
  ├── Branch: ${phase_branch}
  ├── PR: ${pr_result.Url || pr_result.url || "manual creation required"}
  └── Next: Run `/businessplan` after the phase PR is merged.
```