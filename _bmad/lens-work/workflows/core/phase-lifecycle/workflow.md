---
name: phase-lifecycle
description: Start and finish phase operations (v2 — named phases)
agent: "@lens/git-orchestration"
trigger: Phase transitions via @lens
category: core
auto_triggered: true
imports: lifecycle.yaml
---

# Phase Lifecycle Workflows (v2 — Lifecycle Contract)

---

## Start Phase

**Purpose:** Create named phase branch from audience branch when first workflow of phase begins.

### Input

```yaml
phase_name: string         # preplan|businessplan|techplan|devproposal|sprintplan
initiative_id: string
# audience is derived from lifecycle.yaml phases[phase_name].audience
# e.g., preplan → small, devproposal → medium, sprintplan → large
```

### Sequence

0. **Verify Git State**
   ```bash
   # Ensure clean working tree in BMAD control repo
   if ! git diff-index --quiet HEAD --; then
     echo "Uncommitted changes detected. Commit or stash before starting a phase."
     exit 1
   fi

   git fetch origin
   ```

1. **Validate Previous Phase**
   ```yaml
   # Load lifecycle contract to determine phase ordering
   lifecycle = load("_bmad/_config/custom/lens-work/lifecycle.yaml")
   initiative = load("_bmad-output/lens-work/initiatives/${initiative_id}.yaml")
   track = initiative.track  # e.g., "full"
   active_phases = lifecycle.tracks[track].phases  # e.g., [preplan, businessplan, techplan, devproposal, sprintplan]

   # Find index of requested phase in track's active phases
   phase_index = active_phases.index(phase_name)

   if phase_index > 0:
     prev_phase = active_phases[phase_index - 1]
     prev_audience = lifecycle.phases[prev_phase].audience

     # Check: if prev_phase is in the same audience, it must be complete (PR merged)
     if prev_audience == lifecycle.phases[phase_name].audience:
       if initiative.phase_status[prev_phase] != "passed":
         echo "⚠️ Phase ${prev_phase} not complete. Finish it before starting ${phase_name}."
         exit 1
       fi

     # Check: if prev_phase is in a different audience, audience promotion must be complete
     else:
       # Audience promotion gate must have been passed
       promotion_key = "${prev_audience}_to_${current_audience}"
       if state.audience_status[promotion_key] != "passed":
         echo "⚠️ Audience promotion ${prev_audience} → ${current_audience} not complete."
         echo "└── Complete audience promotion before starting ${phase_name}."
         exit 1
       fi
   ```

2. **Create Phase Branch**
   ```bash
   # Derive audience from lifecycle.yaml
   # phases.preplan.audience = small, phases.devproposal.audience = medium, etc.
   audience=$(get_phase_audience ${phase_name})  # e.g., "small" for preplan

   # Phase branch created from audience branch
   git checkout "${initiative_root}-${audience}"
   git pull origin "${initiative_root}-${audience}"
   git checkout -b "${initiative_root}-${audience}-${phase_name}"
   git push -u origin "${initiative_root}-${audience}-${phase_name}"
   ```

3. **Update State**
   ```yaml
   # state.yaml
   current_phase: "${phase_name}"
   workflow_status: running

   # Dual-write to initiative config
   initiative.current_phase: "${phase_name}"
   ```

4. **Log Event**
   ```json
   {"ts":"${ISO_TIMESTAMP}","event":"start-phase","phase":"${phase_name}","audience":"${audience}","track":"${track}"}
   ```

5. **Commit Phase Start**
    ```bash
    # Ensure we're on the new phase branch
    git checkout "${initiative_root}-${audience}-${phase_name}"

    # Stage state + event log
    git add _bmad-output/lens-work/state.yaml _bmad-output/lens-work/event-log.jsonl

    # Commit only if there are changes
    if ! git diff-index --quiet HEAD --; then
       git commit -m "phase(${phase_name}): Start ${phase_name} (${initiative_id})"
       git push origin "${initiative_root}-${audience}-${phase_name}"
    else
       echo "No phase-start changes to commit."
    fi
    ```

---

## Finish Phase

**Purpose:** Push phase branch and create PR to audience branch after all workflows complete.

### Sequence

0. **Verify Git State**
   ```bash
   # Ensure clean working tree in BMAD control repo
   if ! git diff-index --quiet HEAD --; then
     echo "Uncommitted changes detected. Commit or stash before finishing a phase."
     exit 1
   fi

   git fetch origin
   ```

1. **Validate All Workflows Complete**
   ```bash
   if ! all_workflows_merged ${phase_name}; then
     echo "⚠️ Not all workflows merged. Complete remaining workflows."
     exit 1
   fi
   ```

2. **Push Phase Branch**
   ```bash
   audience=$(get_phase_audience ${phase_name})
   git push origin "${initiative_root}-${audience}-${phase_name}"
   ```

3. **Load PAT & Create PR (HARD GATE)**
   ```yaml
   # Load user profile for git credentials
   profile = load("_bmad-output/personal/profile.yaml")

   # Determine which host PAT to use by matching remote URL
   remote_url = shell("git remote get-url origin")
   remote_host = extract_hostname(remote_url)

   pat = null
   if profile.git_credentials != null:
     for cred in profile.git_credentials:
       if cred.host == remote_host:
         pat = cred.pat
         break

   if pat == null:
     error: |
       ⚠️ HARD GATE: No PAT found for host '${remote_host}'
       ├── Run @lens onboard to configure git credentials
       └── Then re-run finish-phase
     exit: 1
   ```

   ```bash
   # Create PR: phase branch → audience branch
   source_branch="${initiative_root}-${audience}-${phase_name}"
   target_branch="${initiative_root}-${audience}"
   pr_title="phase(${phase_name}): Complete ${phase_name} for ${initiative_id} [${audience} audience]"

   if [[ "$remote_url" == *"github.com"* ]]; then
     org_repo=$(echo "$remote_url" | sed -E 's|https://github\.com/||; s|\.git$||')
     export GH_TOKEN="${pat}"

     pr_result=$(gh pr create \
       --repo "${org_repo}" \
       --base "${target_branch}" \
       --head "${source_branch}" \
       --title "${pr_title}" \
       --body "## Phase Complete: ${phase_name}

   **Initiative:** ${initiative_id}
   **Phase:** ${phase_name}
   **Audience:** ${audience}
   **Track:** ${track}

   All workflows in this phase have been completed and merged.

   ---
   *Created automatically by lens-work phase-lifecycle*" 2>&1)

     pr_exit_code=$?
     if [ $pr_exit_code -ne 0 ]; then
       if echo "$pr_result" | grep -q "already exists"; then
         echo "ℹ️ PR already exists for this phase"
         pr_url=$(gh pr view "${source_branch}" --repo "${org_repo}" --json url -q '.url' 2>/dev/null)
       else
         echo "❌ HARD GATE: PR creation failed"
         echo "├── Error: ${pr_result}"
         echo "└── Fix the issue and re-run finish-phase"
         exit 1
       fi
     else
       pr_url="${pr_result}"
     fi

   elif [[ "$remote_url" == *"gitlab.com"* ]]; then
     org_repo=$(echo "$remote_url" | sed -E 's|https://gitlab\.com/||; s|\.git$||')
     encoded_repo=$(echo "$org_repo" | sed 's|/|%2F|g')
     pr_result=$(curl -s -X POST \
       "https://gitlab.com/api/v4/projects/${encoded_repo}/merge_requests" \
       -H "PRIVATE-TOKEN: ${pat}" \
       -d "source_branch=${source_branch}" \
       -d "target_branch=${target_branch}" \
       -d "title=${pr_title}")
     pr_url=$(echo "$pr_result" | jq -r '.web_url // empty')
     if [ -z "$pr_url" ]; then
       echo "❌ HARD GATE: MR creation failed"
       exit 1
     fi

   elif [[ "$remote_url" == *"dev.azure.com"* ]]; then
     ado_org=$(echo "$remote_url" | sed -E 's|https://dev\.azure\.com/([^/]+)/.*|\1|')
     ado_project=$(echo "$remote_url" | sed -E 's|https://dev\.azure\.com/[^/]+/([^/]+)/.*|\1|')
     ado_repo=$(echo "$remote_url" | sed -E 's|.*/_git/([^/]+)(\.git)?$|\1|')
     pr_result=$(curl -s -X POST \
       "https://dev.azure.com/${ado_org}/${ado_project}/_apis/git/repositories/${ado_repo}/pullrequests?api-version=7.0" \
       -H "Authorization: Basic $(echo -n ":${pat}" | base64)" \
       -H "Content-Type: application/json" \
       -d "{\"sourceRefName\":\"refs/heads/${source_branch}\",\"targetRefName\":\"refs/heads/${target_branch}\",\"title\":\"${pr_title}\"}")
     pr_url=$(echo "$pr_result" | jq -r '.url // empty')
     if [ -z "$pr_url" ]; then
       echo "❌ HARD GATE: PR creation failed"
       exit 1
     fi

   else
     echo "⚠️ Unknown remote type. Create PR manually: ${source_branch} → ${target_branch}"
     pr_url="manual"
   fi

   echo "✅ Phase PR created: ${pr_url}"
   ```

4. **Update Phase Status**
   ```yaml
   # Dual-write: state.yaml + initiative config
   state.phase_status.${phase_name}: "passed"
   initiative.phase_status.${phase_name}: "passed"
   ```

5. **Log Event**
   ```json
   {"ts":"${ISO_TIMESTAMP}","event":"finish-phase","phase":"${phase_name}","audience":"${audience}","pr_url":"${pr_url}"}
   ```

6. **Commit Phase Finish**
   ```bash
   # Ensure we're on the phase branch
   git checkout "${initiative_root}-${audience}-${phase_name}"

   # Stage state + event log + initiative config
   git add _bmad-output/lens-work/state.yaml _bmad-output/lens-work/event-log.jsonl
   git add _bmad-output/lens-work/initiatives/

   # Commit only if there are changes
   if ! git diff-index --quiet HEAD --; then
     git commit -m "phase(${phase_name}): Finish ${initiative_id} [${audience} audience]"
     git push origin "${initiative_root}-${audience}-${phase_name}"
   else
     echo "No phase-finish changes to commit."
   fi
   ```

7. **Output**
   ```
   ✅ Phase ${phase_name} complete
   ├── All workflows merged
   ├── Audience: ${audience}
   ├── PR Created: ${pr_url}
   ├── HARD GATE: PR must be merged before next phase can proceed
   └── Ready for next phase (after PR merge)
   ```

---

## Audience Promotion

When all phases within an audience are complete, content flows up through the promotion chain:

```
small (preplan + businessplan + techplan complete) → medium via adversarial review (party mode)
medium (devproposal complete) → large via stakeholder approval
large (sprintplan complete) → base (initiative root) via constitution gate (constitution skill)
```

### Promotion Trigger Check

```yaml
# After finishing a phase, check if all phases in this audience are complete
audience = lifecycle.phases[phase_name].audience
audience_phases = lifecycle.audiences[audience].phases

all_complete = true
for p in audience_phases:
  if initiative.phase_status[p] != "passed":
    all_complete = false
    break

if all_complete:
  # Determine next audience and gate type
  promotion = get_next_promotion(audience, initiative.track)
  if promotion != null:
    output: |
      📋 All ${audience} phases complete!
      ├── Promotion available: ${audience} → ${promotion.target}
      ├── Gate required: ${promotion.gate_type}
      └── Run audience-promotion to proceed
```

### Open Final Review (large → base)

**Trigger:** All large phases complete (sprintplan merged)

**Purpose:** Open PR from large → initiative root (base) for constitution-gated review.

```bash
# Validate all large phases complete
if all_audience_phases_complete "large"; then
  pr_link="${remote}/compare/${initiative_root}...${initiative_root}-large"
  echo "📋 Final Review Ready (Constitution Gate)"
  echo "├── PR: ${pr_link}"
  echo "├── All phases complete across all audiences"
  echo "├── Gate: Constitution skill validation required"
  echo "└── Ready for final promotion to base"
fi
```
