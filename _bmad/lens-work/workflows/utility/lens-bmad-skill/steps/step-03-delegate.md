---
name: 'step-03-delegate'
description: 'Delegate to the downstream BMAD skill with Lens context injected'
---

# Step 3: Delegate To The BMAD Skill

**Goal:** Hand off to the downstream BMAD skill while preserving Lens governance, directory, and write-boundary context.

---

## EXECUTION SEQUENCE

### 1. Inject Lens Context Before Delegation

Before following the downstream skill:

- Treat `lens_context.domain`, `lens_context.service`, and `lens_context.feature_id` as the active feature scope when they are present.
- Treat `lens_context.target_repo_path` as the implementation root for code-changing skills.
- Treat `lens_context.output_path` as the preferred output path when the downstream skill asks for `output_path`, artifact location, or document destination.
- Treat `lens_context.constitutional_context` as the governance baseline for decisions that depend on review gates, required artifacts, or track restrictions.
- Respect `lens_context.write_scope` literally.
- Do not ask the user to repeat Lens context that is already resolved unless the downstream skill genuinely needs additional clarification.

### 2. Delegate

```yaml
read_and_follow: ${skill_entry.entryPath}
params:
  lens_context: ${lens_context}
  domain: ${lens_context.domain}
  service: ${lens_context.service}
  feature_id: ${lens_context.feature_id}
  output_path: ${lens_context.output_path}
  target_repo_path: ${lens_context.target_repo_path}
  governance_repo_path: ${lens_context.governance_repo_path}
  constitutional_context: ${lens_context.constitutional_context}
```

### 3. Close The Wrapper Cleanly

After the downstream skill completes, summarize the work in Lens terms:

- What skill ran
- What feature or repo context it used
- Where artifacts or code changes were written
- What the most natural next Lens action is