# Auto-Context Pull

Load relevant domain context for a feature — related summaries and full docs for dependencies.

## Outcome

After this process, the agent has loaded:

- Domain constitution rules (if present at `{governance-repo}/domains/{domain}/constitution.md`)
- Summaries for all other features in the same domain (from `feature-index.yaml` → `summary.md` files on `main`)
- Full feature docs for all `depends_on` and `blocks` entries (full `feature.yaml` plus any available mirrored governance docs)
- Optional governance context for explicitly named services referenced in the current conversation
- Retrospective insights from `{governance-repo}/retrospectives/{domain}/` if present

## Process

### Step 1: Fetch Feature Index Context

```bash
python3 ./scripts/init-feature-ops.py fetch-context \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --depth summaries
```

The output includes:

- `related` — list of featureIds in the same domain
- `depends_on` — list of featureIds in the feature's `depends_on` list
- `blocks` — list of featureIds in the feature's `blocks` list
- `context_paths` — filesystem paths to `summary.md` for same-domain context plus `feature.yaml` and mirrored governance docs for dependency features

### Step 2: Load Related Summaries

For each path in `context_paths` that points to a `summary.md`, read and incorporate the content into your working context. These summaries describe what adjacent features are doing, enabling coherent scoping and avoiding duplication.

### Step 3: Load Depends-On Full Docs

For features listed in `depends_on`, run with `--depth full` to get full feature.yaml paths:

```bash
python3 ./scripts/init-feature-ops.py fetch-context \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --depth full
```

Read and incorporate the full `feature.yaml` content and any mirrored governance docs for each `depends_on` or `blocks` feature. This ensures the new feature's planning respects the constraints and interfaces of its dependencies.

### Step 3b: Load Named Service Context When Referenced

If the user names other services in the request or chat history, ask which of those services should be grounded before drafting. Then run:

```bash
python3 ./scripts/init-feature-ops.py fetch-context \
  --governance-repo {governance_repo} \
  --feature-id {featureId} \
  --service-ref {service_name}
```

Use `service_context_paths` from the result to load matching governance service files, service docs, and child feature summaries for the selected service.

### Step 4: Load Domain Constitution

Check for domain-level governance rules:

```
{governance-repo}/domains/{domain}/constitution.md
```

If present, load and apply its constraints to all planning and scoping decisions for this feature.

### Step 5: Load Retrospective Insights

Check for retrospective artifacts:

```
{governance-repo}/retrospectives/{domain}/
```

If present, load the most recent retrospective (sort by filename date). Surface any recurring issues, anti-patterns, or lessons learned that apply to the current domain or service.

### Context Summary

After loading all context, present a brief summary:

- N related features in domain (list featureIds)
- N depends-on / blocks features (list featureIds)
- N named-service governance contexts loaded (list service names)
- Constitution loaded: yes/no
- Retrospective insights: yes/no (date of most recent)

This context remains active for the duration of the feature planning session.
