---
name: migrate-lifecycle
description: Migrate initiative from legacy p1-p6 phase model to lifecycle contract v2 (named phases + tracks)
agent: "@lens/state-management"
trigger: "@lens migrate-lifecycle"
category: utility
depends_on: lifecycle.yaml
---

# Migrate Lifecycle Workflow

**Purpose:** Migrate existing initiatives from the legacy numbered-phase model (lifecycle_version: 1 or unset) to the named-phase lifecycle contract (lifecycle_version: 2). Transforms state files, initiative configs, and optionally renames branches.

> **Prerequisite:** The lifecycle contract (`lifecycle.yaml`) must be installed in the module.
> This workflow references the lifecycle-adapter.md translation tables for mapping.

---

## Migration Stages

This workflow has three stages that execute in order. Stage 1 (config migration) is always run. Stages 2-3 are optional and prompted.

| Stage | What It Does | Required? | Risk Level |
|-------|-------------|-----------|------------|
| 1. Config Migration | Transforms state.yaml + initiative config to v2 schema | Required | Low |
| 2. Branch Rename | Renames `p{N}` branches to named phases | Optional | Medium |
| 3. PR Retarget | Updates open PRs to reference renamed branches | Optional | Medium |

---

## Stage 1: Config Migration

### 0. Pre-flight Checks

```bash
# Ensure we're in BMAD control repo
if [ ! -d ".git" ] || [ ! -d "_bmad" ]; then
  error "Must run from BMAD control repo root"
  exit 1
fi

# Ensure clean working directory
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes detected. Commit or stash before migration."
  exit 1
fi

# Verify lifecycle.yaml is installed
if [ ! -f "_bmad/lens-work/lifecycle.yaml" ] && [ ! -f "_bmad/_config/custom/lens-work/lifecycle.yaml" ]; then
  error "lifecycle.yaml not found. Install the lifecycle contract first."
  exit 1
fi
```

### 1. Load and Detect Format

```yaml
state = load("_bmad-output/lens-work/state.yaml")

if state == null:
  output: "No state.yaml found. Nothing to migrate."
  exit: 0

if state.lifecycle_version == 2:
  output: "State is already lifecycle v2. No migration needed."
  exit: 0

# We have a v1 state — proceed with migration
initiative_id = state.active_initiative
if initiative_id == null:
  output: "No active initiative. Nothing to migrate."
  exit: 0

# Load initiative config
initiative = load_initiative(initiative_id)
if initiative == null:
  error: "Initiative config not found for ${initiative_id}"
  exit: 1

if initiative.lifecycle_version == 2:
  output: "Initiative ${initiative_id} is already lifecycle v2."
  # Still need to migrate state.yaml if it's v1
```

### 2. Map Legacy Phase to Current Position

```yaml
# Translate current_phase from v1 to v2
phase_map:
  "pre-plan": "preplan"
  "pre_plan": "preplan"
  "plan":     "businessplan"
  "spec":     "businessplan"
  "tech-plan": "techplan"
  "tech_plan": "techplan"
  "story-gen": "devproposal"
  "story_gen": "devproposal"
  "review":   "sprintplan"
  "dev":      null              # Dev phase moves to target project execution

current_phase_v2 = phase_map[state.current_phase]
if current_phase_v2 == null and state.current_phase != null:
  warn: "Current phase '${state.current_phase}' is 'dev' — this maps to target project execution in v2."
  current_phase_v2 = "sprintplan"  # Closest v2 equivalent: sprint planning done
```

### 3. Map Gate Status to Phase Status

```yaml
# Translate gate_status keys from v1 to v2
gate_key_map:
  pre_plan:  preplan
  plan:      businessplan
  tech_plan: techplan
  story_gen: devproposal
  review:    sprintplan

phase_status = {}
for legacy_key, v2_key in gate_key_map:
  legacy_value = initiative.gate_status[legacy_key]  # null|passed|blocked
  phase_status[v2_key] = legacy_value
```

### 4. Infer Track

```yaml
# Legacy initiatives didn't have tracks. Infer from what phases were active.
# Most legacy initiatives should default to "full".

if only_has_activity("pre_plan"):
  inferred_track = "spike"
elif only_has_activity("tech_plan") and no_activity("plan"):
  inferred_track = "tech-change"
else:
  inferred_track = "full"

# Derive active_phases from inferred track
active_phases = lifecycle.tracks[inferred_track].phases
audiences = lifecycle.tracks[inferred_track].audiences
```

### 5. Compute Initiative Root

```yaml
# v1 used "featureBranchRoot", v2 uses "initiative_root"
# The value is the same, just the field name changes
initiative_root = initiative.featureBranchRoot
if initiative_root == null:
  # Build from domain/service/id
  initiative_root = build_initiative_root(initiative)
```

### 6. Display Migration Plan

```
📋 Lifecycle Migration Plan for: ${initiative.name} (${initiative_id})

┌─────────────────┬──────────────────────┬──────────────────────┐
│ Field            │ Current (v1)         │ New (v2)             │
├─────────────────┼──────────────────────┼──────────────────────┤
│ lifecycle_version│ ${initiative.lifecycle_version || "unset"}  │ 2                    │
│ current_phase    │ ${state.current_phase}│ ${current_phase_v2} │
│ track            │ (none)               │ ${inferred_track}    │
│ active_phases    │ (from review_audience_map) │ ${active_phases} │
│ audiences        │ [small, medium, large]│ ${audiences}        │
│ initiative_root  │ ${initiative.featureBranchRoot}│ ${initiative_root} │
│ layer            │ ${initiative.layer}  │ ${initiative.layer}  │
│ scope            │ (none)               │ ${inferred_scope}    │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Phase Status Translation:                                      │
│ pre_plan: ${gate_status.pre_plan}    → preplan: ${phase_status.preplan}        │
│ plan: ${gate_status.plan}            → businessplan: ${phase_status.businessplan} │
│ tech_plan: ${gate_status.tech_plan}  → techplan: ${phase_status.techplan}      │
│ story_gen: ${gate_status.story_gen}  → devproposal: ${phase_status.devproposal}  │
│ review: ${gate_status.review}        → sprintplan: ${phase_status.sprintplan}    │
└─────────────────────────────────────────────────────────────────┘

⚠️  AUDIENCE CHANGES:
   businessplan (was p2): medium → small
   techplan (was p3): large → small
   These audience changes affect branch topology. See Stage 2 (Branch Rename).

Proceed with config migration? [Y/n]
```

### 7. Backup Current Files

```bash
# Backup state
cp "_bmad-output/lens-work/state.yaml" "_bmad-output/lens-work/state.yaml.v1.backup"

# Backup initiative config
cp "${initiative_config_path}" "${initiative_config_path}.v1.backup"

echo "Backups created: state.yaml.v1.backup, ${initiative_config_path}.v1.backup"
```

### 8. Write Updated State

Write to `_bmad-output/lens-work/state.yaml`:

```yaml
lifecycle_version: 2
lens_contract_version: "2.0"

active_initiative: ${initiative_id}
current_phase: ${current_phase_v2}
active_track: ${inferred_track}
workflow_status: ${state.workflow_status || "idle"}

phase_status:
  preplan: ${phase_status.preplan}
  businessplan: ${phase_status.businessplan}
  techplan: ${phase_status.techplan}
  devproposal: ${phase_status.devproposal}
  sprintplan: ${phase_status.sprintplan}

audience_status:
  small_to_medium: null
  medium_to_large: null
  large_to_base: null

checklist: ${state.checklist || {current_gate: null, items: [], gate_ready: false, gate_ready_pct: 0}}
background_errors: ${state.background_errors || []}
created_at: ${state.created_at}
last_activity: ${ISO_TIMESTAMP}

user:
  name: ${state.user.name}
  email: ${state.user.email}

personal_profile: "_bmad-output/personal/profile.yaml"
```

### 9. Write Updated Initiative Config

Write to `${initiative_config_path}`:

```yaml
lifecycle_version: 2

id: ${initiative.id}
name: "${initiative.name}"
layer: ${initiative.layer}
domain: ${initiative.domain}
domain_prefix: ${initiative.domain_prefix}
service: ${initiative.service}
service_prefix: ${initiative.service_prefix}

target_repos: ${initiative.target_repos}

initiative_root: ${initiative_root}

track: ${inferred_track}
active_phases: ${active_phases}

audiences: ${audiences}

phase_status:
  preplan: ${phase_status.preplan}
  businessplan: ${phase_status.businessplan}
  techplan: ${phase_status.techplan}
  devproposal: ${phase_status.devproposal}
  sprintplan: ${phase_status.sprintplan}

current_phase: ${current_phase_v2}

docs:
  path: ${initiative.docs.path}
  domain: ${initiative.docs.domain}
  service: ${initiative.docs.service}
  repo: ${initiative.docs.repo}

constitution_mode: ${initiative.constitution_mode || "advisory"}
question_mode: ${initiative.question_mode || "interactive"}
scope: ${inferred_scope}
coupling: none

created_at: ${initiative.created_at}
last_activity: ${ISO_TIMESTAMP}
```

### 10. Log Migration Event

Append to `_bmad-output/lens-work/event-log.jsonl`:

```json
{"ts":"${ISO_TIMESTAMP}","event":"lifecycle-migrated","initiative":"${initiative_id}","user":"${git_user}","details":{"from_version":"1","to_version":"2","inferred_track":"${inferred_track}","phase_mapping":{"pre_plan":"preplan","plan":"businessplan","tech_plan":"techplan","story_gen":"devproposal","review":"sprintplan"},"current_phase_before":"${state.current_phase}","current_phase_after":"${current_phase_v2}"}}
```

### 11. Stage 1 Complete

```
✅ Config Migration Complete

**Initiative:** ${initiative_id} (${initiative.name})
**Track:** ${inferred_track}
**Current Phase:** ${current_phase_v2} (was: ${state.current_phase})

**Files modified:**
├── 📄 state.yaml (rewritten to v2 — git-ignored)
├── 📄 ${initiative_config_path} (rewritten to v2 — commit this)
├── 📄 state.yaml.v1.backup (backup of old format)
├── 📄 ${initiative_config_path}.v1.backup (backup of old format)
└── 📄 event-log.jsonl (migration event appended)
```

---

## Stage 2: Branch Rename (Optional)

```
Would you like to rename branches from p{N} to named phases?

⚠️  This is optional. The lifecycle-adapter handles both naming conventions.
    Branch rename is cosmetic — it makes branch names consistent with v2 but
    isn't required for functionality.

⚠️  IMPORTANT: Audience levels have changed for some phases:
    - businessplan (p2): branches move from medium to small
    - techplan (p3): branches move from large to small
    This means some branches will change BOTH name AND audience segment.

[1] Rename branches now
[2] Skip — I'll rename later (or never)
```

### If User Chooses Rename

#### 2.1 Scan Existing Branches

```bash
# List all branches matching the initiative's featureBranchRoot
git branch -a --list "*${initiative.featureBranchRoot}*" | sort
```

#### 2.2 Compute Rename Plan

For each branch found, compute the new name:

```
RENAME PLAN:

  Current Branch                              → New Branch
  ─────────────────────────────────────────────────────────
  ${root}-small-p1                            → ${root}-small-preplan
  ${root}-small-p1-brainstorm                 → ${root}-small-preplan-brainstorm
  ${root}-medium-p2                           → ${root}-small-businessplan        ⚠️ audience change
  ${root}-medium-p2-prd                       → ${root}-small-businessplan-prd    ⚠️ audience change
  ${root}-large-p3                            → ${root}-small-techplan            ⚠️ audience change
  ${root}-large-p3-architecture               → ${root}-small-techplan-architecture ⚠️ audience change
  ${root}-large-p4                            → ${root}-medium-devproposal        ⚠️ audience change
  ${root}-large-p5                            → ${root}-large-sprintplan

  ⚠️  = audience level changed (branch will be recreated, not just renamed)

Proceed? [Y/n]
```

#### 2.3 Execute Renames

For branches where only the phase name changes (same audience):

```bash
git branch -m "${old_branch}" "${new_branch}"
git push origin ":${old_branch}" "${new_branch}"
```

For branches where the audience also changes (p2→small, p3→small):

```
⚠️  Branch ${root}-medium-p2 needs audience change: medium → small

This requires creating a new branch from the correct parent:
  1. Create ${root}-small-businessplan from ${root}-small (audience branch)
  2. Cherry-pick or merge content from ${root}-medium-p2
  3. Delete old branch ${root}-medium-p2

This is complex and may affect open PRs. Would you like to:
[1] Proceed with automatic branch restructure
[2] Skip this branch (handle manually later)
[3] Skip all audience-change branches
```

#### 2.4 Log Branch Renames

For each renamed branch, append to event-log.jsonl:

```json
{"ts":"${ISO_TIMESTAMP}","event":"branch-renamed","initiative":"${initiative_id}","user":"${git_user}","details":{"old_name":"${old_branch}","new_name":"${new_branch}","audience_changed":${audience_changed}}}
```

---

## Stage 3: PR Retarget (Optional)

Only relevant if Stage 2 was executed.

```
Would you like to update open PRs to reference the new branch names?

This will:
- Find PRs with base/head branches matching old names
- Update them to reference the new branch names
- Add a comment explaining the rename

[1] Retarget PRs now
[2] Skip — I'll handle PRs manually
```

### If User Chooses Retarget

```bash
# Derive API base URL from remote host
remote_url=$(git remote get-url origin)
remote_host=$(echo "$remote_url" | sed -E 's|https?://([^/]+)/.*|\1|')
org_repo=$(echo "$remote_url" | sed -E "s|https://${remote_host}/||; s|\.git$||")

if [[ "$remote_host" == "github.com" ]]; then
  api_base="https://api.github.com"
else
  api_base="https://${remote_host}/api/v3"
fi

# List open PRs for the initiative
curl -s "${api_base}/repos/${org_repo}/pulls?state=open" \
  -H "Authorization: token ${pat}" | \
  jq '[.[] | select(.head.ref | startswith("'"${root}"'")) | {number, title, headRefName: .head.ref, baseRefName: .base.ref}]'

# For each PR, if head or base matches a renamed branch:
curl -s -X PATCH "${api_base}/repos/${org_repo}/pulls/${pr_number}" \
  -H "Authorization: token ${pat}" \
  -H "Content-Type: application/json" \
  -d '{"base": "'"${new_base_branch}"'"}'

curl -s -X POST "${api_base}/repos/${org_repo}/issues/${pr_number}/comments" \
  -H "Authorization: token ${pat}" \
  -H "Content-Type: application/json" \
  -d '{"body": "Branch renamed as part of lifecycle v2 migration: '"${old_name}"' → '"${new_name}"'"}'
```

---

## Rollback

If migration fails or produces incorrect results:

### Stage 1 Rollback

```bash
# Restore old state
cp "_bmad-output/lens-work/state.yaml.v1.backup" "_bmad-output/lens-work/state.yaml"

# Restore old initiative config
cp "${initiative_config_path}.v1.backup" "${initiative_config_path}"
```

### Stage 2 Rollback

```bash
# Reverse each branch rename
git branch -m "${new_branch}" "${old_branch}"
git push origin ":${new_branch}" "${old_branch}"
```

---

## Post-Migration Verification

After migration, verify with:

```
@lens ST
```

Expected output should show:

```
📍 lens-work Status Report
Initiative: ${id} | Layer: ${layer}
Track: ${track}
Current Position: ${current_phase_v2} (${display_name})
Phase Status:
  ✅ preplan: ${status}
  ✅ businessplan: ${status}
  🔄 techplan: ${status}
  ⏳ devproposal: pending
  ⏳ sprintplan: pending
Audience Promotions:
  ⏳ small → medium (adversarial review)
  ⏳ medium → large (stakeholder approval)
  ⏳ large → base (constitution gate)
```

If the status report shows unexpected values, run `@lens FIX` to reconcile state from git reality.

---

## Batch Migration

To migrate all initiatives at once:

```bash
# Find all v1 initiative configs
for config in _bmad-output/lens-work/initiatives/*.yaml; do
  version=$(grep "lifecycle_version" "$config" | awk '{print $2}')
  if [ "$version" != "2" ]; then
    echo "Needs migration: $config"
  fi
done
```

Then run `@lens migrate-lifecycle` for each initiative using `@lens switch` to make it active first.

---

## Error Handling

| Error | Recovery |
|-------|----------|
| lifecycle.yaml not found | Install lifecycle contract first (Phase 0) |
| Already v2 | Output: "Already migrated." Exit cleanly. |
| No active initiative | Output: "No active initiative." Exit cleanly. |
| initiative config not found | Check initiatives/ directory, run @lens FIX |
| featureBranchRoot missing | Build from domain/service/id using naming convention |
| Branch rename conflicts with existing branch | Prompt user to resolve manually |
| PR retarget fails | Output error, continue with remaining PRs |
| Backup failed | Abort migration, do not overwrite files |

---

## Post-Conditions

- [ ] State.yaml updated to lifecycle_version: 2 with named phases
- [ ] Initiative config updated with track, active_phases, phase_status
- [ ] Legacy fields removed from active config (kept in .v1.backup)
- [ ] Migration event logged to event-log.jsonl
- [ ] Branches optionally renamed to named-phase convention
- [ ] Open PRs optionally retargeted to new branch names
- [ ] Status report (`@lens ST`) displays correctly with new format
