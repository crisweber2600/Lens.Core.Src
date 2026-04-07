---
name: 'step-01-gather'
description: 'Collect problems, PR review comments, commit markers, and user observations for the retrospective'
nextStepFile: './step-02-analyze.md'
preflightInclude: '../../../includes/preflight.md'
lifecycleContract: '../../../../lifecycle.yaml'
---

# Step 1: Gather Evidence

**Goal:** Load the initiative context, read problems.md if it exists, scan git history for relevant commit markers and PR comments, and collect additional observations from the user.

---

## EXECUTION SEQUENCE

### 1. Preflight and Load Initiative Context

```yaml
invoke: include
path: "{preflightInclude}"
params:
  skip_constitution: false

invoke: git-orchestration.verify-clean-state

initiative_state = invoke: git-state.current-initiative
initiative = load(initiative_state.config_path)
lifecycle = load("{lifecycleContract}")

initiative_root = initiative.initiative_root
docs_path = initiative.docs.path || "{output_folder}/planning-artifacts"

problem_log_path = lifecycle.problem_logging.file_pattern
  .replace("{domain}", initiative.domain || "default")
  .replace("{service}", initiative.service || "default")
```

### 2. Collect Problem Logs

```yaml
# Read problems.md if it exists
problems = []
if file_exists(problem_log_path):
  problems = parse_problems(problem_log_path)
  # Each problem has: severity, title, phase, date, description, status
```

### 3. Scan Commit History for Markers

```yaml
# Scan commits on the initiative root branch for structured markers
commit_markers = invoke_command("git log --all --grep='PHASE:' --grep='GATE:' --grep='REVIEW:' --format='%h|%s|%ai' --since='6 months ago' | head -100")

# Parse phase transitions, gate results, and review outcomes
phase_transitions = extract_phase_markers(commit_markers)
gate_results = extract_gate_markers(commit_markers)
review_outcomes = extract_review_markers(commit_markers)
```

### 4. Collect User Observations

```
📋 Evidence Gathered So Far
━━━━━━━━━━━━━━━━━━━━━━━━━━
Initiative:       ${initiative_root}
Track:            ${initiative.track}
Problems logged:  ${problems.length}
Phase transitions: ${phase_transitions.length}
Gate results:     ${gate_results.length}
```

Present to user and ask:

> I've gathered automated evidence from the initiative. Before we analyze, I'd like to collect any observations you have. Consider:
>
> 1. **What went well?** — processes, tools, or decisions that helped
> 2. **What was frustrating?** — bottlenecks, confusion, or unnecessary friction
> 3. **What would you change?** — specific improvements for next time
> 4. **Any surprises?** — unexpected discoveries or outcomes
>
> Share as much or as little as you'd like. Type "skip" to proceed with automated evidence only.

```yaml
user_observations = collect_user_input()

session.problems = problems
session.phase_transitions = phase_transitions
session.gate_results = gate_results
session.review_outcomes = review_outcomes
session.user_observations = user_observations
session.initiative_root = initiative_root
session.initiative = initiative
session.docs_path = docs_path
```

---

## NEXT STEP DIRECTIVE

After collecting all evidence, proceed to: `{nextStepFile}`
