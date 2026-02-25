---
name: fix-story
description: Quick correction loop (Quick-Spec → Adversarial Review → Quick-Dev)
agent: "@lens"
trigger: "#fix-story <initiative_id>"
category: utility
---

# Fix Story Workflow

**Purpose:** Fast correction loop for post-merge bug fixes.

---

## Execution Sequence

### 1. Parse Input

```yaml
# Extract initiative ID from command
# Example: #fix-story rate-limit-x7k2m9
initiative_id = parse_initiative_id(command)

if initiative_id == null:
  output: "Usage: #fix-story <initiative_id>"
  exit: 1
```

### 2. Load Context

```yaml
# Check if initiative exists (may be archived)
state = load("_bmad-output/lens-work/state.yaml")
archive = load("_bmad-output/lens-work/archive/${initiative_id}/state.yaml")

context = state.initiative.id == initiative_id ? state : archive

if context == null:
  output: "Initiative ${initiative_id} not found."
  exit: 1
```

### 3. Create Fix Branch

```yaml
fix_id = generate_short_id()  # e.g., "fx-a3b2"
fix_branch = "lens/${initiative_id}/fix/${fix_id}"

# Create branch from current main
git checkout main
git pull origin main
git checkout -b ${fix_branch}
```

### 4. Describe the Fix

```yaml
output: |
  🔧 Fix Story: ${initiative_id}
  
  Describe the bug/issue to fix:

description = prompt_user()
```

### 5. Quick-Spec (Minimal)

```yaml
invoke: bmm.quick-spec
params:
  mode: "minimal"
  context: context
  description: description
  output_path: "_bmad-output/lens-work/fixes/${fix_id}/"

output: |
  📋 Quick-Spec Complete
  ├── Issue: ${description}
  ├── Impact: ${quick_spec.impact}
  └── Proposed fix: ${quick_spec.solution}
```

### 6. Adversarial Review

```yaml
invoke: core.adversarial-review
params:
  artifact: "_bmad-output/lens-work/fixes/${fix_id}/quick-spec.md"
  mode: "fast"  # Abbreviated review

output: |
  🔍 Adversarial Review
  ├── Risks: ${review.risks}
  ├── Edge cases: ${review.edge_cases}
  └── Recommendation: ${review.recommendation}

if review.recommendation == "reject":
  output: "⚠️ Review flagged issues. Address before proceeding."
  exit: 1
```

### 7. Quick-Dev (Implementation)

```yaml
invoke: bmm.quick-dev
params:
  spec: "_bmad-output/lens-work/fixes/${fix_id}/quick-spec.md"
  target_repo: context.initiative.target_repo

output: |
  🔧 Implementing fix...
  
  Target: ${target_repo}
  Branch: feature/fix-${fix_id}
```

### 8. Code Review

```yaml
invoke: bmm.code-review
params:
  mode: "expedited"
```

### 9. Merge Fix

```yaml
# Commit and push
git add -A
git commit -m "[lens-work] Fix: ${description}"
git push -u origin ${fix_branch}

# Generate PR link
pr_link = generate_pr_link(fix_branch, "main")

output: |
  ✅ Fix Ready for Merge
  
  Branch: ${fix_branch}
  PR: ${pr_link}
  
  Review and merge the PR to complete the fix.
```

### 10. Log Fix

```yaml
append_event({
  ts: now(),
  event: "fix-story",
  initiative_id: initiative_id,
  fix_id: fix_id,
  description: description,
  duration: duration
})
```

---

## Estimated Timeline

| Step | Time |
|------|------|
| Describe | 5 min |
| Quick-Spec | 10 min |
| Adversarial Review | 10 min |
| Quick-Dev | 15 min |
| Code Review | 5 min |
| **Total** | **~45 min** |
