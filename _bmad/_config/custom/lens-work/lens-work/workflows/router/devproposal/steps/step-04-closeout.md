---
name: 'step-04-closeout'
description: 'Commit devproposal artifacts, create the phase PR, update state, and report the next command'
promotionCheckInclude: '../../../includes/promotion-check.md'
createPrScript: '../../../../scripts/create-pr.ps1'
---

# Step 4: Close Out The DevProposal Phase

**Goal:** Commit the generated devproposal artifacts, create the phase PR, update initiative state, and surface the next lifecycle command.

---

## EXECUTION SEQUENCE

### 1. Validate Artifacts, Commit, And Open The PR

```yaml
has_epics = file_exists("${docs_path}/epics.md")
has_stories = file_exists("${docs_path}/stories.md")
has_readiness = file_exists("${docs_path}/readiness-checklist.md")

if not has_epics or not has_stories:
  FAIL("❌ DevProposal phase incomplete. Required artifacts are missing from ${docs_path}.")

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}
  phase: DEVPROPOSAL
  initiative: ${initiative.initiative_root}
  description: "devproposal artifacts complete"

invoke: git-orchestration.push
params:
  branch: ${phase_branch}

pr_result = invoke: script
script: "{createPrScript}"
params:
  SourceBranch: ${phase_branch}
  TargetBranch: ${audience_branch}
  Title: "[PHASE] ${initiative.id || initiative.initiative_root} - DevProposal complete"
  Body: "DevProposal complete for ${initiative.initiative_root}. Review epics, stories, and readiness artifacts before merging."

invoke: state-management.update-initiative
params:
  initiative_id: ${initiative.id || initiative.initiative_root}
  updates:
    current_phase: "devproposal"
    audience_status:
      small_to_medium: "complete"
    phase_status:
      devproposal:
        status: "pr_pending"
        pr_url: ${pr_result.Url || pr_result.url || null}
        pr_number: ${pr_result.Number || pr_result.number || null}

invoke: include
path: "{promotionCheckInclude}"
params:
  current_phase: "devproposal"
  initiative_root: ${initiative.initiative_root}
  current_audience: "medium"
  lifecycle_contract: ${lifecycle}

output: |
  ✅ /devproposal complete
  ├── Branch: ${phase_branch}
  ├── PR: ${pr_result.Url || pr_result.url || "manual creation required"}
  └── Next: Run `/sprintplan` after the phase PR is merged.
```