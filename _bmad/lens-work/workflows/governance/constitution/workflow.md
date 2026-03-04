---
name: constitution
description: View, create, or amend constitution files at any LENS layer
agent: "@lens/constitution"
trigger: /constitution command
category: governance
phase: N/A
skill: constitution
---

# Constitution Workflow — Governance

View, create, or amend constitutions at any LENS layer with inheritance validation.

> **Implementation note:** All path resolution, file parsing, hierarchy loading,
> and governance merging is performed by the **constitution skill**
> (`_bmad/lens-work/skills/constitution.md`). Do NOT call
> `lib/constitution.js`, `lib/constitution-display.js`, or any Node.js lib files.

## Role

You are the **constitutional guardian**. Guide users through viewing, creating, or amending
governance rules that apply across the LENS inheritance chain.
All file operations follow the constitution skill's path patterns (Part 1) and
merge rules (Part 4).

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
- **View** → Step 1.5 (Language Selection) → Step 2V
- **Create** → Step 1.5 (Language Selection) → Step 2C
- **Amend** → Step 1.5 (Language Selection) → Step 2A

---

## Step 1.5: Language Selection (Optional)

Present language selection prompt:

```
🧬 Programming Language Context (optional)

Load language-specific constitutions for a particular language?

1. Universal only — Apply org/domain/service/repo constitutions (all languages)
2. TypeScript — Apply universal + TypeScript-specific rules (ts/js projects)
3. Python — Apply universal + Python-specific rules (py projects)
4. Go — Apply universal + Go-specific rules (go projects)
5. Java — Apply universal + Java-specific rules (java projects)
6. C# — Apply universal + C#-specific rules (csharp projects)
7. Other — Enter custom language identifier

[Enter 1-7 or press Enter for universal only]
```

Store selected language as `{language_context}`. If "Other" selected, prompt:
```
Enter language identifier (e.g., rust, php, kotlin):
```

**Note:** Language-specific constitutions apply ONLY to target repositories matching that language. See constitution skill Part 10 for scope rules.

---

## VIEW PATH

### Step 2V: Resolve and Display

1. Determine current context:
   - Load active initiative from `_bmad-output/lens-work/initiatives/{active_id}.yaml`
   - Extract `domain`, `service`, `layer`, `name`
   - If no active initiative: prompt user for layer and name
   - Use `{language_context}` from Step 1.5 (may be empty)

2. Build inheritance chain using **constitution skill Part 3 (Hierarchy Loading)**:
   - Walk `[org, domain, service, repo]` parent-first
   - At each layer, load universal constitution first, then language-specific (if `{language_context}` provided)
   - Apply skill Part 1 (Path Resolution) for each layer's path
   - Chain order: `[org-universal, org-{language}, domain-universal, domain-{language}, ...]`
   - Skip missing files silently (see skill Part 9 Edge Cases)

3. Merge governance using **constitution skill Part 4 (Governance Merging)**:
   - `permitted_tracks`: intersection | `required_gates`: union | participants: union per phase
   - Language-specific rules are additive (children can only add, never remove)

4. Display resolved constitution using **constitution skill Part 6 (Display Formatting)**:

```
📜 Resolved Constitution: {context_name}

Context: {layer} at {name} {if language_context}[Language: {language_context}]{endif}

Inheritance Chain ({chain_count} files):
{for each found constitution:}
  {n}. {layer}{if language} ({language}){endif}: {name} ({article_count} articles)
     Ratified: {date} | Last amended: {amended_date}

Total Governance: {total_articles} articles from {chain_count} constitution(s)

{for each layer with articles:}
## {Layer}{if language} [{language}]{endif} Articles

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

### Step 3C: Named or Language-Specific

After selecting the layer, ask whether this constitution applies universally or to a specific language:

```
Is this constitution universal or language-specific?

1. [U] Universal — Applies to all languages/repos at this layer
2. [L] Language-Specific — Applies only to repos using a specific language

[Enter U/L, default is U]
```

Set `{constitution_scope}` to either "universal" or "language-specific".

If language-specific selected:
```
Which programming language?

1. TypeScript    4. Java
2. Python        5. C#
3. Go            6. Other

[Enter 1-6 or press Enter to select from active context]
```

Store as `{constitution_language}`.

### Step 4C: Name the Constitution

```
What name for this constitution?

Examples:
- "acme-corp" (Org)
- "bmad" (Domain)
- "lens" (Service)
- "bmad-lens-api" (Repo)
```

Store as `{constitution_name}`.

Validate uniqueness:
- Universal: check that `_bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/constitution.md` does not exist
- Language-specific: check that `_bmad-output/lens-work/constitutions/{layer_type}/{constitution_name}/{language}/constitution.md` does not exist

### Step 5C: Load Template

Load template from `_bmad/lens-work/templates/constitutions/{constitution_scope}-{layer_type}-constitution.md`.

If language-specific template doesn't exist, use base template and append language-specific boilerplate section:

```
## Language-Specific Governance

This constitution applies ONLY to {language} projects within this layer.

When loaded into a compliance workflow:
1. Target repo language is detected via .gitattributes, package.json, pyproject.toml, etc.
2. This constitution is applied ONLY if target repo language matches {language}
3. If target repo is a different language, these rules do not apply
4. Universal constitutions at this layer still apply regardless of language
```

Display template structure and guide user through filling sections.

### Step 6C: Gather Preamble

```
Preamble — What is the purpose of this constitution?
What should it ensure across all governed {if language}{ language} {endif}work? (2-4 sentences)
```

### Step 7C: Gather Articles

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

### Step 8C: Validate Inheritance

If layer is NOT Org:
1. Walk up inheritance chain to find parent constitutions (per lifecycle.yaml resolution_order)
2. Load parent articles (both universal and {if language}language-specific{endif} if applicable)
3. Check new articles for contradictions with parent rules
4. If contradictions found: present resolution options (modify, narrow scope, escalate, withdraw)
5. Validate additive inheritance: children can only ADD rules, never remove or weaken parent rules

If no contradictions (or Org level):
```
✅ Inheritance Validation Passed
```

### Step 9C: Preview and Ratify

Generate constitution document using template structure with YAML frontmatter and language metadata:

```yaml
---
layer: {layer_type}
name: {constitution_name}
scope: {constitution_scope}
{if language}language: {language}{endif}
inherits_from: {parent_layer} (if not Org)
---
```

Display preview for approval.
layer: {layer_type}
name: {constitution_name}
created_by: profile.name  # From profile.yaml
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

### Step 2A: Locate Constitution File

```
Which constitution do you want to amend?

Existing constitutions found:

{for each found constitution:}
  {n}. {layer}: {name} {if language}({language}){endif}
     Path: {path}
     Articles: {article_count}

[Enter constitution number]
```

Load selected constitution from disk.

### Step 3A: Show Current Content

Display current constitution with line numbers on each article.

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

### Step 5.5A: Determine Version Change Level

Enforce semantic versioning based on amendment type:

```
Version Format: MAJOR.MINOR.PATCH

| Amendment Type | Version Bump | Criteria |
|----------------|-------------|----------|
| Remove article or weaken principle | MAJOR | Incompatible change — existing compliance may break |
| Add new article | MINOR | New constraint — backward-compatible but additive |
| Modify existing article | MINOR | Substance change — may affect existing artifacts |
| Deprecate article | MINOR | Signals removal intent — still enforced until removed |
| Clarify existing article | PATCH | No substance change — adds detail/examples only |

version_change_level = determine_level(amendment_type)
old_version = current_constitution.version
new_version = bump(old_version, version_change_level)
```

### Step 5.6A: Generate Sync Impact Report

Before presenting the amendment for ratification, generate a sync impact report
using **constitution skill Part 15** to show the blast radius of this change.

```yaml
sync_impact = invoke("constitution.generate-sync-impact-report")
params:
  layer_type: ${layer_type}
  constitution_name: ${constitution_name}
  version_change: { old: ${old_version}, new: ${new_version}, level: ${version_change_level} }
  changed_articles: ${list_of_changed_article_titles}
  amendment_type: ${amendment_type}
```

Display the sync impact report to the user:

```
═══ Constitution Sync Impact Report ═══

Amendment: {layer_type} constitution "{constitution_name}"
Version: {old_version} → {new_version} ({version_change_level})
Change Type: {amendment_type}
Changed Articles: {changed_articles}

── Blast Radius ──

{sync_impact.governed_scopes}
{sync_impact.active_initiatives_table}

── Version Change Impact ──

{sync_impact.version_impact_table}

── Recommended Actions ──

{sync_impact.recommended_actions}

── Template Propagation ──

{sync_impact.template_list}
```

### Step 5.7A: Consistency Propagation Check

```yaml
# Suggest re-running /analyze on affected initiatives after ratification
if version_change_level in ["MAJOR", "MINOR"]:
  output: |
    ℹ️  After ratification, consider running /analyze on affected initiatives:
    ${for initiative in sync_impact.affected_initiatives}
      /analyze ${initiative.id} — ${initiative.name} (currently in ${initiative.phase})
    ${endfor}
```

### Step 6A: Preview and Ratify Amendment

Show amendment preview with version increment and sync impact acknowledgment:
- Add/Modify/Deprecate: minor version bump
- Clarify: patch version bump
- Remove/weaken: MAJOR version bump

```
📜 Amendment Preview

Constitution: {name}
Type: {amendment_type}
Version: {old} → {new} ({version_change_level})

{show changes}

{if version_change_level == "MAJOR"}
⚠️  MAJOR change — this affects {sync_impact.affected_initiative_count} active initiative(s).
    All affected initiatives will require /compliance re-validation.
    Ratify? [Y/N/Edit]
{else if version_change_level == "MINOR"}
ℹ️  MINOR change — {sync_impact.affected_initiative_count} in-progress initiative(s) should re-run /compliance.
    Ratify? [Y/N/Edit]
{else}
✅ PATCH change — no downstream re-validation required.
    Ratify? [Y/N/Edit]
{endif}
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
