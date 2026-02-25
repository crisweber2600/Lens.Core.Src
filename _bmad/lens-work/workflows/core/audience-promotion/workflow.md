---
name: audience-promotion
description: Promote initiative from one audience level to the next with gate validation
agent: "@lens"
trigger: audience promotion boundary (small→medium, medium→large, large→base)
category: core
imports: lifecycle.yaml
---

# Audience Promotion Workflow

**Purpose:** Handle promotion between audience levels. Each promotion is a review gate that validates all phases in the source audience are complete, runs the appropriate gate check, and merges artifacts forward.

**Lifecycle:** Audience promotions are the primary progression axis in lens-work v2. Phases happen WITHIN audiences; promotions happen BETWEEN audiences.

---

## Promotion Chain

```
small → medium    (gate: adversarial-review, mode: party)
medium → large    (gate: stakeholder-approval)
large → base      (gate: constitution-gate, enforcer: constitution skill)
```

---

## Input Parameters

```yaml
params:
  initiative_id: string      # Required — initiative to promote
  source_audience: string    # Required — "small", "medium", or "large"
  target_audience: string    # Required — "medium", "large", or "base"
  # Derived from lifecycle.yaml:
  #   small→medium: adversarial-review (party mode)
  #   medium→large: stakeholder-approval
  #   large→base: constitution-gate
```

---

## Execution Sequence

### 0. Pre-Flight

```yaml
# Load state and initiative
state = load("_bmad-output/lens-work/state.yaml")
initiative = load("_bmad-output/lens-work/initiatives/${initiative_id}.yaml")
lifecycle = load("lifecycle.yaml")

# Verify working directory is clean
invoke: git-orchestration.verify-clean-state

# Derive promotion details from lifecycle contract
initiative_root = initiative.initiative_root
source_branch = "${initiative_root}-${source_audience}"
target_branch = "${initiative_root}-${target_audience}"

# Determine gate type from lifecycle.yaml
gate_type = lifecycle.audiences[target_audience].entry_gate
gate_mode = lifecycle.audiences[target_audience].entry_gate_mode || null

# Validate promotion is valid
valid_promotions = ["small→medium", "medium→large", "large→base"]
promotion_key = "${source_audience}→${target_audience}"
if promotion_key not in valid_promotions:
  FAIL("❌ Invalid promotion: ${promotion_key}. Valid promotions: ${valid_promotions}")

# Validate track allows this promotion
track = initiative.track
track_audiences = lifecycle.tracks[track].audiences
if target_audience not in track_audiences:
  FAIL("❌ Track '${track}' does not include audience '${target_audience}'. Audiences: ${track_audiences}")

output: |
  🔄 Audience Promotion: ${source_audience} → ${target_audience}
  ├── Initiative: ${initiative.name} (${initiative_id})
  ├── Track: ${track}
  ├── Gate: ${gate_type}
  ├── Source: ${source_branch}
  └── Target: ${target_branch}
```

### 1. Validate Source Audience Phases Complete

```yaml
# All phases in the source audience must be complete before promotion
source_phases = lifecycle.audiences[source_audience].phases
track_phases = lifecycle.tracks[track].phases

# Only check phases that are in BOTH the audience and the track
required_phases = intersection(source_phases, track_phases)

incomplete_phases = []
for phase_name in required_phases:
  phase_status = initiative.phase_status[phase_name]
  if phase_status == null or phase_status.status not in ["complete", "pr_pending"]:
    incomplete_phases.append(phase_name)

  # For pr_pending phases, verify the PR was actually merged
  if phase_status != null and phase_status.status == "pr_pending":
    phase_branch = "${initiative_root}-${source_audience}-${phase_name}"
    result = git-orchestration.exec("git merge-base --is-ancestor origin/${phase_branch} origin/${source_branch}")
    if result.exit_code != 0:
      incomplete_phases.append("${phase_name} (PR not merged)")

if incomplete_phases.length > 0:
  output: |
    ❌ Cannot promote ${source_audience} → ${target_audience}
    ├── Incomplete phases in ${source_audience}:
    ${incomplete_phases.map(p => "│   - " + p).join("\n")}
    └── Complete all ${source_audience} phases before promoting
  exit: 1

output: "✅ All ${source_audience} phases complete: ${required_phases.join(', ')}"
```

### 2. Run Promotion Gate

```yaml
# Each promotion has a specific gate type from lifecycle.yaml

if gate_type == "adversarial-review":
  # === Small → Medium: Adversarial Review (Party Mode) ===
  output: |
    🎭 Running adversarial review (party mode)
    ├── This is the lead review gate
    └── Multi-agent group discussion will challenge all artifacts

  # Collect all artifacts from small-audience phases
  artifacts_to_review = []
  for phase_name in required_phases:
    phase_artifacts = lifecycle.phases[phase_name].artifacts
    for artifact_name in phase_artifacts:
      artifact_path = "${docs_path}/${artifact_name}.md"
      if file_exists(artifact_path):
        artifacts_to_review.append(artifact_path)

  # Run party mode review for each major artifact
  for artifact_path in artifacts_to_review:
    invoke: core.party-mode
    params:
      input_file: ${artifact_path}
      artifacts_path: ${docs_path}
      output_file: "${docs_path}/reviews/promotion-${source_audience}-to-${target_audience}-${artifact_name}-review.md"
      constitutional_context: ${constitutional_context}

    if party_mode.status not in ["pass", "complete"]:
      output: |
        ❌ Adversarial review failed for ${artifact_path}
        └── Address findings in review file and re-run promotion
      exit: 1

  output: "✅ Adversarial review gate passed"

elif gate_type == "stakeholder-approval":
  # === Medium → Large: Stakeholder Approval ===
  output: |
    👥 Stakeholder approval required
    ├── Review the implementation proposal (epics, stories)
    └── Confirm stakeholder sign-off

  # Present summary for stakeholder review
  epics = load_if_exists("${docs_path}/epics.md")
  stories = load_if_exists("${docs_path}/stories.md")
  readiness = load_if_exists("${docs_path}/readiness-checklist.md")

  output: |
    📋 Stakeholder Review Package:
    ├── Epics: ${docs_path}/epics.md
    ├── Stories: ${docs_path}/stories.md
    └── Readiness: ${docs_path}/readiness-checklist.md

  ask: "Has stakeholder approved? [Y]es / [N]o"
  if no:
    output: "⏸️ Promotion paused — awaiting stakeholder approval"
    exit: 0

  output: "✅ Stakeholder approval gate passed"

elif gate_type == "constitution-gate":
  # === Large → Base: Constitution Gate ===
  output: |
    📜 Constitution gate — constitution skill validates compliance
    ├── All planning artifacts checked against constitutional rules
    └── 4-level inheritance: org → domain → service → repo

  # Resolve constitutional context
  constitutional_context = invoke("constitution.resolve-context")

  # Run full compliance check
  compliance_result = invoke("constitution.full-compliance-check")
  params:
    initiative_id: ${initiative_id}
    docs_path: ${docs_path}
    constitutional_context: ${constitutional_context}

  if compliance_result.fail_count > 0:
    output: |
      ❌ Constitution gate FAILED
      ├── Failures: ${compliance_result.fail_count}
      ├── Warnings: ${compliance_result.warn_count}
      └── Resolve constitutional violations before promoting to base
    exit: 1

  output: "✅ Constitution gate passed (${compliance_result.warn_count} warnings)"
```

### 3. Create Promotion PR

```yaml
# Merge source audience branch into target audience branch via PR
invoke: git-orchestration.create-pr
params:
  head: ${source_branch}
  base: ${target_branch}
  title: "[promotion] ${source_audience} → ${target_audience}: ${initiative.name}"
  body: |
    Audience promotion for ${initiative_id}.

    **Source:** ${source_branch} (${source_audience})
    **Target:** ${target_branch} (${target_audience})
    **Gate:** ${gate_type} — PASSED

    **Phases included:**
    ${required_phases.map(p => "- " + p).join("\n")}

    **Artifacts:**
    ${artifacts_to_review.map(a => "- " + a).join("\n")}
capture: pr_result
```

### 4. Update State

```yaml
# Update audience_status in initiative config
promotion_key = "${source_audience}_to_${target_audience}"

invoke: state-management.update-initiative
params:
  initiative_id: ${initiative_id}
  updates:
    audience_status:
      ${promotion_key}: "pr_pending"
      ${promotion_key}_pr_url: "${pr_result.url}"
      ${promotion_key}_pr_number: ${pr_result.number}
      ${promotion_key}_gate: "${gate_type}"
      ${promotion_key}_gate_status: "passed"
      ${promotion_key}_gate_at: "${ISO_TIMESTAMP}"

# Update state.yaml
invoke: state-management.update-state
params:
  updates:
    last_promotion: "${promotion_key}"
    workflow_status: "promotion_pr_pending"
```

### 5. Log Event

```yaml
events:
  - {"ts":"${ISO_TIMESTAMP}","event":"audience_promotion","id":"${initiative_id}","source":"${source_audience}","target":"${target_audience}","gate":"${gate_type}","gate_status":"passed"}
  - {"ts":"${ISO_TIMESTAMP}","event":"promotion_pr_created","id":"${initiative_id}","pr_url":"${pr_result.url}","source":"${source_branch}","target":"${target_branch}"}

invoke: state-management.append-events
params:
  events: ${events}
```

### 6. Output

```
✅ Audience Promotion: ${source_audience} → ${target_audience}

**Initiative:** ${initiative.name} (${initiative_id})
**Gate:** ${gate_type} — PASSED
**PR:** ${pr_result.url}
**Status:** pr_pending (awaiting merge)

**Files included:**
├── Source: ${source_branch}
├── Target: ${target_branch}
└── Phases: ${required_phases.join(', ')}

**Next steps:**
${if target_audience == "medium"}
  1. Merge promotion PR
  2. Run /devproposal to create implementation proposal
${elif target_audience == "large"}
  1. Merge promotion PR
  2. Run /sprintplan for sprint planning and dev handoff
${elif target_audience == "base"}
  1. Merge promotion PR
  2. Initiative is ready for execution — run /dev
${endif}
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Incomplete phases in source audience | List incomplete phases, block promotion |
| Adversarial review failed | Show findings, require resolution |
| Stakeholder declined | Pause promotion, allow later resume |
| Constitution gate failed | Show violations, require resolution |
| PR creation failed | Output manual PR instructions |
| Track doesn't include target audience | Error with track info |
| Invalid promotion direction | Error with valid promotions list |

---

## Post-Conditions

- [ ] All source audience phases verified complete
- [ ] Promotion gate passed (adversarial-review / stakeholder-approval / constitution-gate)
- [ ] PR created: source audience branch → target audience branch
- [ ] audience_status updated with promotion status
- [ ] Event logged to event-log.jsonl
- [ ] User informed of next steps
