---
name: auto-commit
description: Auto-commit changes after each agent chat message that produces artifacts
agent: casey
trigger: Post-message hook — invoked after every agent chat interaction that modifies files
category: core
auto_triggered: true
---

# Auto-Commit (Post-Message Hook)

**Purpose:** After every chat message that produces or modifies artifacts (planning docs, state files, code), automatically stage and commit changes with a descriptive message. This ensures a granular commit history where each AI interaction is a discrete, reviewable commit.

**⚠️ CRITICAL:** This is a *fire-and-forget* hook. It MUST NOT block the user or prompt for input. If there's nothing to commit, it exits silently.

---

## Input Parameters

```yaml
agent_name: string         # Which agent produced the changes (e.g., "compass", "analyst")
action_summary: string     # Brief description of what the agent did (e.g., "brainstorm complete", "PRD section 3")
workflow_name: string      # Current workflow from state (optional — may be null in chat mode)
```

---

## Execution Sequence

### 0. Quick Dirty Check

```bash
# If nothing changed, exit immediately (zero-cost path)
if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi
```

### 1. Load Context

```yaml
state = load("_bmad-output/lens-work/state.yaml")
initiative_id = state.active_initiative or "no-initiative"
phase = state.current.phase or "setup"
workflow = workflow_name or state.current.workflow or "chat"
```

### 2. Stage All Changes

```bash
# Stage everything — artifacts, state, event log, planning docs
# The workflow branch is initiative-scoped so all changes belong
git add -A

# Get stats for commit message
files_changed=$(git diff --cached --numstat | wc -l)
insertions=$(git diff --cached --stat | tail -1 | grep -oP '\d+ insertion' | grep -oP '\d+' || echo "0")
deletions=$(git diff --cached --stat | tail -1 | grep -oP '\d+ deletion' | grep -oP '\d+' || echo "0")
```

### 3. Build Commit Message

```yaml
# Conventional commit format with agent attribution
# Pattern: {type}({scope}): {description} [agent:{name}]

# Map agent actions to commit types
type_map:
  brainstorm: "feat"
  research: "feat"
  product-brief: "docs"
  prd: "docs"
  ux-design: "docs"
  architecture: "docs"
  stories: "feat"
  sprint-planning: "chore"
  dev-story: "feat"
  code-review: "refactor"
  retro: "docs"
  default: "chore"

commit_type = type_map.get(workflow, type_map.default)
scope = "${initiative_id}"

# Build message
if action_summary != null and action_summary != "":
  commit_msg = "${commit_type}(${scope}): ${action_summary} [agent:${agent_name}]"
else:
  commit_msg = "${commit_type}(${scope}): ${workflow} update [agent:${agent_name}]"

# Add stats to body
commit_body = "${files_changed} file(s) | +${insertions} -${deletions}"
```

### 4. Commit

```bash
# Commit with message and body (non-interactive)
git commit -m "${commit_msg}" -m "${commit_body}" --no-verify

commit_hash=$(git rev-parse --short HEAD)
```

### 5. Log Event

```json
{"ts":"${ISO_TIMESTAMP}","event":"auto-commit","commit":"${commit_hash}","agent":"${agent_name}","workflow":"${workflow}","files_changed":${files_changed},"msg":"${commit_msg}"}
```

### 6. Output (Minimal)

```
📝 ${commit_hash} — ${commit_msg}
```

> Output is intentionally minimal — one line — to avoid disrupting the user's flow.

---

## Push Strategy

Auto-commit does NOT push. Pushing happens only at:
- **finish-workflow** — pushes all accumulated commits
- **Manual /sync-now** — user-initiated push
- **End of session** — if configured in preferences

This batches network operations and avoids rate-limiting issues with remote hosts.

---

## Exclusion Rules

The auto-commit hook should NOT fire when:

| Condition | Reason |
|-----------|--------|
| No files changed | Nothing to commit |
| Only `.git/` internal files changed | Git internals, not artifacts |
| User explicitly said "don't commit" | Respect user override |
| In middle of interactive rebase/merge | Git state is transitional |

```bash
# Check for rebase/merge in progress
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ] || [ -f ".git/MERGE_HEAD" ]; then
  echo "⚠️ Rebase/merge in progress — skipping auto-commit"
  exit 0
fi
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Nothing to commit | Exit silently (not an error) |
| Commit fails | Log warning, continue (don't block user) |
| State file missing | Use defaults for commit message scope |
| Rebase/merge in progress | Skip auto-commit, warn once |

---

## Integration Points

This workflow is triggered by Casey's `post-message` hook. All BMAD agents should emit a signal after completing artifact-producing actions:

```yaml
# Example: After analyst completes brainstorm output
signal:
  event: post-message
  params:
    agent_name: "analyst"
    action_summary: "brainstorm session complete"
    workflow_name: "brainstorm"
```

Casey intercepts this signal and invokes auto-commit.
