# Step 3: Ratify Amendment

Validate and apply the amendment.

---

## Inheritance Validation

**For Add/Modify operations:**

Same validation as create mode:
- Check against parent articles
- Flag contradictions
- Require resolution before proceeding

**For Clarify/Deprecate:**
- No inheritance check needed (doesn't change rule substance)

---

## Impact Assessment

**Check for child constitutions:**

```
🔍 **Impact Assessment**

Checking for child constitutions that may be affected...

{if children found:}
Found {count} child constitution(s):
- {child_path_1} ({child_articles_1} articles)
- {child_path_2} ({child_articles_2} articles)

This amendment may affect inherited governance in these constitutions.

{if no children:}
No child constitutions found. Amendment affects only this layer.
```

---

## Version Increment

**Evaluate version bump type:**

Based on the amendment type, recommend the appropriate version bump following semantic versioning:

| Amendment Type | Default Bump | MAJOR Consideration |
|----------------|-------------|---------------------|
| **Add** | MINOR (1.0.0 → 1.1.0) | Rare (only if adds fundamentally new requirement category) |
| **Modify** | MINOR (default) | **MAJOR if:** Intent reversed, rule redefined, or NON-NEGOTIABLE weakened |
| **Clarify** | PATCH (1.0.0 → 1.0.1) | Never (non-substantive) |
| **Deprecate** | MINOR (default) | **MAJOR if:** Article fully removed (not just marked deprecated) |

```
📊 **Version Bump Classification**

Current Version: {old_version}
Amendment Type: {type}
Article: {article_title}

Recommended Bump: {suggested_bump}

{if suggested_bump == MAJOR:}
⚠️ **MAJOR Version Warning**

This amendment appears to be backward-incompatible:
{reason_for_major_suggestion}

Potential downstream impacts:
- Child constitutions may inherit conflicting rules
- In-progress artifacts may violate new governance
- Development teams may need to revise implementation plans

{endif}

Select version bump type:
1. MAJOR (X.Y.Z → X+1.0.0) — Backward-incompatible governance change
2. MINOR (X.Y.Z → X.Y+1.0) — New governance or non-breaking modification
3. PATCH (X.Y.Z → X.Y.Z+1) — Clarification or non-substantive change

[Enter 1, 2, or 3]
```

**Capture:**
- `{selected_bump}` ← MAJOR | MINOR | PATCH

**If user selects MAJOR, confirm:**
```
⚠️ **Confirm MAJOR Version Bump**

This will increment {old_version} → {calculate_major(old_version)}

A MAJOR bump signals a backward-incompatible governance change to all
consumers of this constitution.

Are you sure? [Y/N]
```

**If N:** Return to bump selection

---

## Bump Rationale (Required)

```
📝 **Version Bump Rationale**

Explain why this version bump type was chosen:

(Required — provide clear justification for the {selected_bump} bump)

[Enter rationale]
```

**Capture:**
- `{bump_rationale}` ← Free-text explanation

**Validation:**
- If empty, display error: "Bump rationale is required. Please explain why {selected_bump} was chosen."
- Loop until non-empty rationale provided

**New version:** `{calculate_version(old_version, selected_bump)}`

---

## Preview Amendment

```
📜 **Amendment Preview**

**Constitution:** {constitution_name}
**Amendment Type:** {type}
**Version:** {old_version} → {new_version}

---

**Change:**

{show diff or new content}

---

**Amendment Record:**
```yaml
amendment:
  date: {today_date}
  type: {Add | Modify | Clarify | Deprecate}
  bump_type: {MAJOR | MINOR | PATCH}
  article: {article_title}
  version: {old_version} → {new_version}
  bump_rationale: {bump_rationale}
  author: Scribe
```

---

Ratify this amendment? [Y/N/Edit]
```

---

## Handle Response

**IF "Y":**
1. Update constitution file
2. Increment version
3. Update "Last Amended" date
4. Add amendment record to governance section
5. Log `constitution-amended` via Tracey
6. Request Casey commit with governance-prefixed message

**IF "N":**
- Discard changes
- Return to menu

**IF "Edit":**
- Return to step-02-modify.md

---

## Apply Amendment

**Update constitution file:**
- Apply the change
- Update version header
- Update "Last Amended" header
- Append to Amendment History section:

```markdown
## Amendment History

### Amendment {n} ({today_date})
- **Type:** {type}
- **Bump Type:** {selected_bump}
- **Article:** {article_title}
- **Change:** {description}
- **Version:** {old_version} → {new_version}
- **Bump Rationale:** {bump_rationale}
```

---

## Post-Amendment Impact Analysis (Non-Blocking)

**Check for active initiative artifacts:**

```
🔍 **Impact Analysis**

Checking in-progress artifacts for governance alignment...

{if initiative artifacts exist in _bmad-output/planning-artifacts/}

Found {artifact_count} artifact(s) to evaluate:
{for each artifact:}
- {artifact_path}

Running compliance checks against updated constitution...
```

**For each artifact:**
1. Invoke `scribe.compliance-check` with:
   - `artifact_path`: {artifact_path}
   - `artifact_type`: {artifact_type}
   - `constitutional_context`: {updated_constitutional_context (post-amendment)}

2. Collect results:
   - `{pass_count}`
   - `{warn_count}`
   - `{fail_count}`

**Display results:**
```
📊 **Impact Analysis Results**

| Artifact | PASS | WARN | FAIL | Status |
|----------|------|------|------|--------|
| {artifact_1} | {pass} | {warn} | {fail} | {OK/⚠️ REVIEW} |
| {artifact_2} | {pass} | {warn} | {fail} | {OK/⚠️ REVIEW} |

{if any artifact has fail_count > 0:}
⚠️ **Warning:** {count} artifact(s) now have compliance failures.

The amendment has introduced new violations in existing artifacts.
Consider reviewing and updating these artifacts to align with the
new governance.

{endif}

{if no initiative artifacts exist:}
No active initiative artifacts found. Impact analysis skipped.
{endif}
```

**Emit Tracey event:**
```yaml
event: amendment-impact-analyzed
data:
  initiative_id: {initiative_id or "none"}
  constitution_name: {constitution_name}
  layer: {layer}
  new_version: {new_version}
  bump_type: {selected_bump}
  artifacts_checked: {artifact_count}
  total_fail_count: {sum of all fail_counts}
```

**Critical:** Impact analysis is **non-blocking** — the amendment always succeeds regardless of impact results. This is informational only.

---

## Generate Sync Impact Report

**Scan for child constitutions:**

```
📑 **Sync Impact Report Generation**

Scanning for child constitutions affected by this amendment...

{Scan filesystem at _bmad-output/lens-work/constitutions/ for constitutions
 in lower layers that reference {constitution_name} as parent}

{if child constitutions found:}
Found {child_count} child constitution(s):
{for each child:}
- {child_layer}/{child_name} ({article_count} articles)

Generating sync impact report...
{endif}

{if no children:}
No child constitutions found. Sync report skipped.
{endif}
```

**For each child constitution:**
1. Load child constitution file
2. Check if child inherits from this constitution (via parent field or resolve-constitution)
3. Detect potential conflicts:
   - If amendment REMOVED an article → check if child references it
   - If amendment MODIFIED a NON-NEGOTIABLE article → check if child customizes it
   - If amendment ADDED a rule → check if child has contradictory rule

**Generate report:**

Create file at: `_bmad-output/lens-work/constitutions/{layer}/{name}/sync-reports/{today_date}-v{new_version}.md`

Report template:
```markdown
# Sync Impact Report: {constitution_name}

**Version Change:** {old_version} → {new_version}
**Amendment Type:** {selected_bump} ({type})
**Date:** {today_date}
**Bump Rationale:** {bump_rationale}

## Modified Principles

| Article | Change Type | Summary | NON-NEGOTIABLE |
|---------|------------|---------|----------------|
| {article_id} | {Add/Modify/Clarify/Deprecate} | {description} | {Yes/No} |

## Downstream Constitutions

{if children found:}
| Constitution | Layer | Articles | Potential Conflicts |
|-------------|-------|----------|-------------------|
| {child_name} | {child_layer} | {article_count} | {conflict_summary or "None detected"} |

{for each child with conflicts:}
### {child_name} ({child_layer})

**Conflicts Detected:**
- {conflict_description_1}
- {conflict_description_2}

**Action Required:** Review child constitution and update if necessary.
{endfor}

{else:}
No downstream constitutions found.
{endif}

## Follow-up Actions

{if conflicts detected:}
- [ ] Review {conflict_count} child constitution(s) for compatibility
- [ ] Update conflicting articles if necessary
- [ ] Re-run compliance checks in affected projects
{else:}
- [ ] No immediate action required
{endif}

---

*Generated by Scribe on {today_date}*
```

**Update index:**

Append entry to `_bmad-output/lens-work/constitutions/{layer}/{name}/sync-reports/index.md`:

```markdown
## Sync Reports Index

- [{new_version}](./{today_date}-v{new_version}.md) — {today_date} — {bump_type} — {affected_children_count} child(ren)
- [previous entries...]
```

**Emit Tracey event:**
```yaml
event: sync-report-generated
data:
  constitution_name: {constitution_name}
  layer: {layer}
  version_change: {old_version} → {new_version}
  bump_type: {selected_bump}
  report_path: {report_path}
  affected_children_count: {child_count}
  conflict_count: {total_conflict_count}
```

---

## Success

```
✅ **Amendment Ratified**

📜 {layer_type} Constitution: {constitution_name}

Amendment applied:
- Type: {type}
- Article: {article_title}
- New Version: {new_version}

"Let the record show this amendment was duly ratified on {today_date}."

---

What's next?
- View resolved constitution -> /resolve
- Make another amendment -> /constitution
- Return to menu -> H
```

---

## Audit Trail

Record amendment using governance event type `constitution-amended` with:
- timestamp
- layer
- name
- bump_type
- bump_rationale
- amendment_summary
- articles_added
- articles_modified
- new_version
- git_commit_sha
