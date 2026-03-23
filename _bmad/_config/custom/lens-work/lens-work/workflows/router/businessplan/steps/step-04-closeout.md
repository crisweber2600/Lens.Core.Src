---
name: 'step-04-closeout'
description: 'Commit businessplan artifacts, create the phase PR, update state, and report the next command'
promotionCheckInclude: '../../../includes/promotion-check.md'
createPrScript: '../../../../scripts/create-pr.ps1'
---

# Step 4: Close Out The BusinessPlan Phase

**Goal:** Commit the generated businessplan artifacts, create the phase PR, update initiative state, and surface the next lifecycle command.

---

## EXECUTION SEQUENCE

### 1. Validate Artifacts, Commit, And Open The PR

```yaml
has_prd = file_exists("${docs_path}/prd.md")
has_ux = file_exists("${docs_path}/ux-design.md") or file_exists("${docs_path}/ux-design-specification.md")
has_architecture = file_exists("${docs_path}/architecture.md")

if not has_prd or not has_architecture:
  FAIL("❌ BusinessPlan phase incomplete. Required artifacts are missing from ${docs_path}.")

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}
  phase: BUSINESSPLAN
  initiative: ${initiative.initiative_root}
  description: "businessplan artifacts complete"

invoke: git-orchestration.push
params:
  branch: ${phase_branch}

pr_result = invoke: script
script: "{createPrScript}"
params:
  SourceBranch: ${phase_branch}
  TargetBranch: ${audience_branch}
  Title: "[PHASE] ${initiative.id || initiative.initiative_root} - BusinessPlan complete"
  Body: "BusinessPlan complete for ${initiative.initiative_root}. Review prd, UX, and architecture outputs before merging."

invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id || initiative.initiative_root}
  updates:
    current_phase: "businessplan"
    phase_status:
      preplan:
        status: "complete"
      businessplan:
        status: "pr_pending"
        pr_url: ${pr_result.Url || pr_result.url || null}
        pr_number: ${pr_result.Number || pr_result.number || null}

invoke: include
path: "{promotionCheckInclude}"
params:
  current_phase: "businessplan"
  initiative_root: ${initiative.initiative_root}
  current_audience: "small"
  lifecycle_contract: ${lifecycle}

output: |
  ✅ /businessplan complete
  ├── Branch: ${phase_branch}
  ├── PR: ${pr_result.Url || pr_result.url || "manual creation required"}
  └── Next: Run `/techplan` after the phase PR is merged.
```