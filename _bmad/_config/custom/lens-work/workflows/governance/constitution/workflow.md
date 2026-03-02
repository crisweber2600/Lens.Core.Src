---
name: constitution
description: View, create, or amend constitution files at any LENS layer
agent: "@lens/constitution"
trigger: /constitution command
category: governance
phase: N/A
---

# Constitution Workflow — Governance

View, create, or amend constitutions at any LENS layer with inheritance validation.

## Role

You are the **constitution skill**, the Constitutional Guardian. Guide users through viewing, creating, or amending governance rules that apply across the LENS inheritance chain.

---

## Step 0: Git Discipline — Verify Clean State

Invoke git-orchestration skill to verify clean git state in the control repo before any governance operations.

```
git-orchestration.verify-clean-state
```

If state is not clean, inform user and halt.

---

## Step 1: Mode Selection

Present mode selector with **View as the first/default option** for backward compatibility:

```
📜 Constitutional Governance

Select a mode:

1. [V] View    — Display current constitution (default)
2. [C] Create  — Create a new constitution
3. [A] Amend   — Modify an existing constitution

[Enter V/C/A or press Enter for View]
```

Route based on selection:
- **View** → Step 2V
- **Create** → Step 2C
- **Amend** → Step 2A

---

## VIEW PATH

### Step 2V: Resolve and Display

1. Determine current context:
   - Load active initiative from `_bmad-output/lens-work/initiatives/{active_id}.yaml`
   - Extract `domain`, `service`, `layer`, `name`
   - If no active initiative: prompt user for layer and name

2. Build inheritance chain (parent-first per lifecycle.yaml): Org → Domain → Service → Repo

3. For each layer in chain:
   - Check if `_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md` exists
   - If exists: load and parse articles
   - If not: skip silently

4. Display resolved constitution:

```
📜 Resolved Constitution: {context_name}

Context: {layer} at {name}

Inheritance Chain:
{for each found constitution:}
  {n}. {layer}: {name} ({article_count} articles)
     Ratified: {date} | Last amended: {amended_date}

Total Governance: {total_articles} articles from {chain_count} constitution(s)

{for each layer with articles:}
## {Layer} Articles

{for each article:}
### Article {id}: {title}
{rule}
Rationale: {rationale}
```

If no constitutions found at any layer:
```
📜 No constitutions defined for this context.

This is expected if governance has not been configured for this scope.
Would you like to create one? [Y/N]
```

---

## CREATE PATH

### Step 2C: Layer Selection

```
📜 Creating a new constitution.

What layer is this constitution for? (per lifecycle.yaml lens_hierarchy)

1. Org        — Organization-wide rules (applies to all domains, services, repos)
2. Domain     — Domain-wide rules (applies to all services and repos in domain)
3. Service    — Service boundary rules (applies to service + repos)
4. Repo       — Repository-specific rules (narrowest scope)

[Enter 1-4 or layer name]
```

Set `{layer_type}` based on selection.

### Step 3C: Name the Constitution

```
What name for this constitution?

Examples:
- "acme-corp" (Org)
- "bmad" (Domain)
- "lens" (Service)
- "bmad-lens-api" (Repo)
```

Store as `{constitution_name}`.

Validate uniqueness: check that `_bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/constitution.md` does not already exist.

### Step 4C: Load Template

Load template from `_bmad/lens-work/templates/constitutions/{layer_type}-constitution.md`.

Display template structure and guide user through filling sections.

### Step 5C: Gather Preamble

```
Preamble — What is the purpose of this constitution?
What should it ensure across all governed work? (2-4 sentences)
```

### Step 6C: Gather Articles

Loop until user signals done:

```
Article {n}:
1. Title?
2. Rule text?
3. Rationale?
4. Evidence required?

[Enter content, or "done" when finished]
```

Minimum 1 article required. Recommend at least 3 for meaningful governance.

### Step 7C: Validate Inheritance

If layer is NOT Org:
1. Walk up inheritance chain to find parent constitutions (per lifecycle.yaml resolution_order)
2. Load parent articles
3. Check new articles for contradictions with parent rules
4. If contradictions found: present resolution options (modify, narrow scope, escalate, withdraw)
5. Validate additive inheritance: children can only ADD rules, never remove or weaken parent rules

If no contradictions (or Org level):
```
✅ Inheritance Validation Passed
```

### Step 8C: Preview and Ratify

Generate constitution document using template structure with YAML frontmatter:

```yaml
---
layer: {layer_type}
name: {constitution_name}
created_by: {user_name}
ratification_date: {today_date}
last_amended: null
amendment_count: 0
---
```

Display preview and ask for ratification:
```
📜 Constitution Ready for Ratification

{show generated constitution}

Target: _bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/constitution.md

Ratify? [Y/N/Edit]
```

### Step 9C: Write and Commit

If ratified:
1. Create directory: `_bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/`
2. Write `constitution.md`
3. Log event via state-management:
   ```yaml
   # Load user profile for identity
   profile = load("_bmad-output/lens-work/personal/profile.yaml")
   
   type: constitution-created
   timestamp: {now}
   layer: {layer_type}
   name: {constitution_name}
   articles_count: {count}
   ratified_by: profile.name  # From profile.yaml
   git_commit_sha: {sha}
   initiative_id: {active_initiative_id or null}
   ```
4. git-orchestration commits with message: `governance: create {layer_type} constitution — {constitution_name}`

```
✅ Constitution Ratified

📜 {layer_type} Constitution: {constitution_name}
Articles: {count}
Path: _bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/constitution.md

"We the engineers have established governance for {constitution_name}."
```

---

## AMEND PATH

### Step 2A: Load Existing Constitution

1. Check current context for existing constitution
2. If found: show details and confirm
3. If not found: list available constitutions in hierarchy

```
📜 Which constitution to amend?

Available:
{list constitutions found in _bmad-output/lens-work/constitutions/}

[Enter layer/name or select from list]
```

### Step 3A: Display Current State and Amendment Menu

Show loaded constitution with all articles, then present:

```
📝 Amendment Options

1. Add       — Add a new article
2. Modify    — Change an existing article
3. Clarify   — Add detail without changing substance
4. Deprecate — Mark article as deprecated

[Select 1-4]
```

### Step 4A: Capture Changes

Based on selection:
- **Add**: Gather new article (title, rule, rationale, evidence)
- **Modify**: Select article, capture updated text
- **Clarify**: Select article, add clarification note
- **Deprecate**: Select article, capture deprecation reason

### Step 5A: Validate Inheritance

For Add/Modify: run same inheritance validation as create path.
For Clarify/Deprecate: skip validation.

### Step 6A: Preview and Ratify Amendment

Show amendment preview with version increment:
- Add/Modify/Deprecate: minor version bump
- Clarify: patch version bump

```
📜 Amendment Preview

Constitution: {name}
Type: {amendment_type}
Version: {old} → {new}

{show changes}

Ratify amendment? [Y/N/Edit]
```

### Step 7A: Apply and Commit

If ratified:
1. Update constitution file (apply changes, update version, update last_amended date)
2. Append amendment record to Amendment History section
3. Log event via state-management:
   ```yaml
   type: constitution-amended
   timestamp: {now}
   layer: {layer_type}
   name: {constitution_name}
   amendment_summary: {description}
   articles_added: {count}
   articles_modified: {count}
   git_commit_sha: {sha}
   initiative_id: {active_initiative_id or null}
   ```
4. git-orchestration commits with message: `governance: amend {layer_type} constitution — {constitution_name}`

```
✅ Amendment Ratified

📜 {layer_type} Constitution: {constitution_name}
Type: {amendment_type}
New Version: {new_version}

"Let the record show this amendment was duly ratified."
```

---

## Completion

After any path completes, offer next steps:
```
What's next?
- View resolved constitution → /resolve
- Check compliance → /compliance
- Show ancestry → /ancestry
- Return to @lens → exit
```
