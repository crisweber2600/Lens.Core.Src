---
name: 'step-03-render-report'
description: 'Render the approval status report to the user'
---

# Step 3: Render Approval Report

**Goal:** Present the PR approval state in a clear, actionable table.

---

## EXECUTION SEQUENCE

### 1. Handle Empty State

```yaml
if len(pr_entries) == 0:
  output: |
    ℹ️ **No open promotion PRs found.**
    All initiatives are either between milestones or have no pending promotions.
  STOP
```

### 2. Render Summary Table

```yaml
output: |
  ## 📋 Promotion PR Approval Status

  | Initiative | Milestone | PR | Status | Blocking | Action |
  |-----------|-----------|-----|--------|----------|--------|
  ${for entry in pr_entries:}
  | ${entry.initiative} | ${entry.milestone} | [#${entry.pr_number}](${entry.pr_url}) | ${entry.review_decision || "pending"} | ${entry.blocking} | ${entry.action} |
  ${end}
```

### 3. Render Details (If Single Initiative)

```yaml
if scope == "single" and len(pr_entries) > 0:
  for entry in pr_entries:
    output: |
      ### PR #${entry.pr_number}: ${entry.pr_title}

      - **Created:** ${entry.created_at}
      - **Updated:** ${entry.updated_at}
      - **Checks:** ${entry.checks_passed}/${entry.checks_total} passed
      - **Mergeable:** ${entry.mergeable ? "Yes" : "No"}
      - **Reviewers:** ${entry.reviewers | join(", ") || "None assigned"}
      - **Approved by:** ${entry.approved_by | join(", ") || "None yet"}

      **Next step:** ${entry.action}
```

---

## WORKFLOW COMPLETE
