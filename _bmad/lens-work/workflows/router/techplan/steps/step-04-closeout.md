---
name: 'step-04-closeout'
description: 'Commit techplan artifacts, create the phase PR, update state, and report the next command'
promotionCheckInclude: '../../../includes/promotion-check.md'
createPrScript: '../../../../scripts/create-pr.ps1'
---

# Step 4: Close Out The TechPlan Phase

**Goal:** Commit the generated techplan artifacts, create the phase PR, update initiative state, and surface the next lifecycle command.

---

## EXECUTION SEQUENCE

### 1. Validate Artifacts, Commit, And Open The PR

```yaml
has_architecture = file_exists("${docs_path}/architecture.md")
has_decisions = file_exists("${docs_path}/tech-decisions.md")

if not has_architecture or not has_decisions:
  FAIL("❌ TechPlan phase incomplete. Required artifacts are missing from ${docs_path}.")

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}
  phase: TECHPLAN
  initiative: ${initiative.initiative_root}
  description: "techplan artifacts complete"

invoke: git-orchestration.push
params:
  branch: ${phase_branch}

pr_result = invoke: script
script: "{createPrScript}"
params:
  SourceBranch: ${phase_branch}
  TargetBranch: ${audience_branch}
  Title: "[PHASE] ${initiative.id || initiative.initiative_root} - TechPlan complete"
  Body: "TechPlan complete for ${initiative.initiative_root}. Review architecture, technical decisions, and any API contracts before merging."

invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id || initiative.initiative_root}
  updates:
    current_phase: "techplan"
    phase_status:
      techplan:
        status: "pr_pending"
        pr_url: ${pr_result.Url || pr_result.url || null}
        pr_number: ${pr_result.Number || pr_result.number || null}

invoke: include
path: "{promotionCheckInclude}"
params:
  current_phase: "techplan"
  initiative_root: ${initiative.initiative_root}
  current_audience: "small"
  lifecycle_contract: ${lifecycle}

output: |
  ✅ /techplan complete
  ├── Branch: ${phase_branch}
  ├── PR: ${pr_result.Url || pr_result.url || "manual creation required"}
  └── Next: Run `/devproposal` after the phase PR is merged.
```