---
name: review
description: Implementation readiness checks and quality gates
agent: lens
trigger: /Review command
category: phase
phase: 5
phase_name: Review
---

# /Review — Implementation Readiness Review

**Purpose:** Run Lens-native readiness checks — this is the gate between planning and implementation.

**Key Differentiator:** Unlike other phase commands that route to external module workflows, `/Review` is a **Lens-native workflow**. It validates all prior phases using checklist, constitution, and git-orchestration skills together.

---

## Prerequisites

- [x] Story-gen gate passed
- [x] All planning artifacts exist

---

## Execution Sequence

### 0. Git Discipline

```yaml
skill: git-orchestration.verify-clean-state

state = load("_bmad-output/lens/state.yaml")
initiative = load("_bmad-output/lens/initiatives/${state.active_initiative.id}.yaml")

audience = initiative.review_audience_map.p5    # "large"
featureBranchRoot = initiative.feature_branch_root
audience_branch = "${featureBranchRoot}-${audience}"
phase_branch = "${featureBranchRoot}-${audience}-p5"

docs_path = initiative.docs_path || "_bmad-output/planning-artifacts/"
impl_path = "_bmad-output/implementation-artifacts/"
```

### 1. Validate State & Gate

```yaml
if state.active_initiative.gate_status.story-gen != "passed":
  error: "Story-gen gate not passed. Run /Story-Gen first."

skill: constitution.validate-initiative(initiative)
skill: state-management.update({workflow_status: "running", current_phase: "p5"})
skill: state-management.log-event("workflow_start", {phase: "p5", workflow: "review"})
```

### 2. Start Phase Branch

```yaml
if not branch_exists(phase_branch):
  skill: git-orchestration.start-phase
  params:
    phase_number: 5
    phase_name: "Review"
    initiative_id: ${initiative.id}
    audience: ${audience}
    featureBranchRoot: ${featureBranchRoot}
    parent_branch: ${audience_branch}

  skill: git-orchestration.checkout-branch(phase_branch)
```

### 3. Full Checklist Validation

```yaml
# Expand all phase checklists and validate
checklist_result = skill: checklist.full-validation
params:
  phases: ["pre-plan", "plan", "tech-plan", "story-gen"]
  initiative: ${initiative}
  docs_path: ${docs_path}
  impl_path: ${impl_path}

output: |
  📋 Checklist Validation
  ═══════════════════════════════════════════════════
  ${checklist_result.formatted_output}
  ═══════════════════════════════════════════════════
```

### 4. Artifact Completeness Check

```yaml
# Validate all required artifacts exist across all phases
include: artifact-validator
params:
  phase: "review"                # checks ALL phases
  docs_path: ${docs_path}
  impl_path: ${impl_path}
  mode: "comprehensive"          # not just current phase

artifact_report = artifact-validator.results

output: |
  📄 Artifact Completeness
  ═══════════════════════════════════════════════════
  Pre-Plan:  ${artifact_report.pre-plan.status}
  Plan:      ${artifact_report.plan.status}
  Tech Plan: ${artifact_report.tech-plan.status}
  Story Gen: ${artifact_report.story-gen.status}
  ═══════════════════════════════════════════════════
```

### 5. Constitution Compliance Scan

```yaml
# Full governance compliance check across all phases
compliance_result = skill: constitution.full-compliance-scan
params:
  initiative: ${initiative}
  phases: ["pre-plan", "plan", "tech-plan", "story-gen"]
  mode: "enforced"              # Review uses enforced mode

output: |
  ⚖️ Constitution Compliance
  ═══════════════════════════════════════════════════
  ${compliance_result.formatted_output}
  ═══════════════════════════════════════════════════
```

### 6. Branch Topology Verification

```yaml
# Verify all expected branches exist and are in correct state
topology_result = skill: git-orchestration.verify-topology
params:
  featureBranchRoot: ${featureBranchRoot}
  expected_audiences: ${initiative.audiences}

output: |
  🌿 Branch Topology
  ═══════════════════════════════════════════════════
  ${topology_result.formatted_output}
  ═══════════════════════════════════════════════════
```

### 7. Optional: TEA Quality Gate

```yaml
# Route to TEA for additional quality checks if installed
if module_installed("tea"):
  route: tea.quality-gate
  params:
    initiative: ${initiative}
    artifacts: ${artifact_report}
```

### 8. Readiness Report

```yaml
# Aggregate all results into readiness report
readiness = {
  checklist: ${checklist_result.status},        # pass | fail | warn
  artifacts: ${artifact_report.status},
  compliance: ${compliance_result.status},
  topology: ${topology_result.status}
}

overall = all_passed(readiness) ? "PASS" : "FAIL"

# Write readiness report
write_file("_bmad-output/lens/readiness-report-${initiative.id}.md", readiness_report)

output: |
  🔭 Implementation Readiness Report
  ═══════════════════════════════════════════════════
  
  Initiative: ${initiative.name} (${initiative.id})
  Overall: ${overall}
  
  ├── 📋 Checklist:    ${checklist_result.status}
  ├── 📄 Artifacts:    ${artifact_report.status}
  ├── ⚖️ Compliance:   ${compliance_result.status}
  └── 🌿 Topology:     ${topology_result.status}
  
  ═══════════════════════════════════════════════════
```

### 9. Gate Decision

```yaml
if overall == "PASS":
  output: |
    ✅ Readiness gate PASSED
    └── Run /Dev to begin implementation

  skill: state-management.update({gate_status.review: "passed"})
  skill: state-management.log-event("gate_opened", {phase: "p5", gate: "review"})

else:
  blockers = get_blockers(readiness)
  output: |
    🚫 Readiness gate BLOCKED
    ├── Blockers:
    ${blockers.formatted_list}
    └── Fix blockers and run /Review again

  skill: state-management.log-event("gate_blocked", {phase: "p5", blockers: ${blockers}})
```

### 10. Phase Completion (if passed)

```yaml
if overall == "PASS":
  skill: git-orchestration.commit-and-push({branch: ${phase_branch}, message: "finish-phase(p5): Review passed — ${initiative.id}"})

  pr_result = skill: git-orchestration.create-pr
  params:
    source: ${phase_branch}
    target: ${audience_branch}
    title: "P5 Review: ${initiative.name} — PASSED"
    body: |
      ## Readiness Review Summary
      **Result:** ✅ PASSED
      **Checklist:** ${checklist_result.status}
      **Artifacts:** ${artifact_report.status}
      **Compliance:** ${compliance_result.status}
      **Topology:** ${topology_result.status}

  skill: git-orchestration.delete-local-branch(phase_branch)
  skill: git-orchestration.checkout-branch(audience_branch)

  skill: state-management.update({workflow_status: "idle", active_branch: ${audience_branch}})
  skill: git-orchestration.commit-and-push
  params:
    paths: ["_bmad-output/lens/"]
    message: "[lens] /Review: Phase 5 — ${initiative.id} — PASSED"
    branch: ${audience_branch}
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Story-gen gate not passed | Run /Story-Gen first |
| Missing artifacts | Show specific missing items, don't block — include in report |
| Constitution violation | Show cited rules and remediation |
| Topology drift | Show expected vs actual branches |

## Post-Conditions

- [ ] Readiness report generated
- [ ] If passed: PR created, review gate opened, ready for /Dev
- [ ] If failed: blockers identified, gate remains closed
