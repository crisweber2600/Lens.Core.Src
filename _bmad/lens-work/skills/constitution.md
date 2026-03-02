# Skill: constitution

**Module:** lens-work
**Skill of:** `@lens` agent, `@lens/constitution` agent
**Type:** Internal governance skill — fully LLM-executable (no runtime dependencies)
**Replaces:** `lib/constitution.js`, `lib/constitution-display.js`, `lib/constitution-stress.js`

---

## Purpose

Provides all constitution loading, parsing, hierarchy resolution, merge logic, display formatting,
and validation as LLM-executable instructions. Constitution checks run at every workflow step as
an inline skill — not as a separate workflow or runtime process.

---

## Responsibilities

1. **Path resolution** — Determine file paths for each LENS hierarchy layer
2. **File parsing** — Extract frontmatter, YAML blocks, governance config
3. **Hierarchy loading** — Walk org → domain → service → repo parent-first
4. **Governance merging** — Apply additive inheritance rules
5. **Track permission checks** — Validate track against permitted_tracks intersection
6. **Inline validation** — Check governance rules at every workflow step
7. **Rule citation** — When a violation occurs, cite the specific rule
8. **Remediation guidance** — Provide clear path to fix violations
9. **Compliance tracking** — Record check results in event log
10. **Mode enforcement** — Advisory (warn) vs Enforced (block)
11. **Display formatting** — Render resolved constitution for user

---

## Part 1 — Path Resolution

### Constitution File Locations

Base directory: `bmad.lens.release/_bmad-output/lens-work/constitutions`

#### Universal Constitutions (applies to all programming languages)

| Layer   | Path Pattern |
|---------|----------|
| org     | `{base}/org/constitution.md` |
| domain  | `{base}/domain/{domain}/constitution.md` |
| service | `{base}/service/{domain}/{service}/constitution.md` |
| repo    | `{base}/repo/{domain}/{service}/{repo}/constitution.md` |

#### Language-Specific Constitutions (applies only to target repos using that language)

| Layer   | Path Pattern |
|---------|----------|
| org     | `{base}/org/{language}/constitution.md` |
| domain  | `{base}/domain/{domain}/{language}/constitution.md` |
| service | `{base}/service/{domain}/{service}/{language}/constitution.md` |
| repo    | `{base}/repo/{domain}/{service}/{repo}/{language}/constitution.md` |

**Variables:**
- `{language}`: Programming language identifier (e.g., `typescript`, `python`, `go`, `java`, `csharp`)

**Rules:**
- `domain` requires `{domain}` variable to be set
- `service` requires both `{domain}` and `{service}` to be set
- `repo` requires `{domain}`, `{service}`, and `{repo}` to be set
- `{language}` is optional — if provided, load both universal AND language-specific constitutions
- If a required variable is not set for a layer, skip that layer entirely
- Missing files at any layer are silently skipped — not an error
- Language-specific files are loaded AFTER universal files at the same layer (inheritance order matters)

---

## Part 2 — Parsing a Constitution File

When reading a constitution file, extract the following in order:

### 2a. YAML Frontmatter

Find the text between the first `---` marker and the second `---` marker at the top of the file.
Parse as YAML. Extract:

| Field | Description |
|-------|-------------|
| `layer` | Which LENS layer this constitution governs (org/domain/service/repo) |
| `name` | The name of this constitution's scope |
| `inherits_from` | Optional — parent layer reference |

If frontmatter is malformed or absent, treat as `{}` (empty) and continue.

### 2b. Embedded YAML Code Blocks

Find all ` ```yaml ` or ` ```yml ` code blocks in the file body (after frontmatter).
Parse each one as YAML. Extract governance fields from each block found:

| Field | Type | Description |
|-------|------|-------------|
| `permitted_tracks` | string[] | Tracks allowed at this layer. `null` or absent = no restriction |
| `required_gates` | string[] | Gate names required by this layer (additive) |
| `additional_review_participants` | map[phase → string[]] | Extra reviewers per phase |

If a YAML block is malformed, skip it silently.

### 2c. Governance Config Object

Combine frontmatter and YAML blocks into a governance config:

```
governance = {
  layer:                        from frontmatter.layer (or null)
  name:                         from frontmatter.name (or null)
  inherits_from:                from frontmatter.inherits_from (or null)
  permitted_tracks:             from first YAML block with this field (or null)
  required_gates:               union of all YAML blocks' required_gates arrays (or [])
  additional_review_participants: merged from all YAML blocks' additional_review_participants (or {})
}
```

---

## Part 3 — Hierarchy Loading

### 3a. Build the Chain

Walk layers in this order: `[org, domain, service, repo]`

For each layer:
1. Build the **universal path** using Part 1 rules
2. Check if the path variable requirements are satisfied — if not, skip
3. Check if the file exists at that path — if not, skip silently
4. If file exists: read it, parse per Part 2, add to chain

If `{language}` context is available (from initiative or user selection):
5. Build the **language-specific path** for the same layer using Part 1 rules
6. Check if the language-specific file exists at that path — if not, skip silently
7. If file exists: read it, parse per Part 2, add to chain AFTER the universal version

Result: `chain` — an ordered list of `{ path, layer, language, governance }` objects, parent-first, with universal before language-specific at each layer.

**Chain building order (per frame):**
```
[org-universal, org-{language}, domain-universal, domain-{language}, service-universal, service-{language}, repo-universal, repo-{language}]
```

### 3b. Cycle Detection

Track visited paths. If a path appears twice in the chain (circular reference), log a warning and skip the duplicate.

### 3c. Language Context Determination

Programming language is determined in this priority order:
1. **Explicit user selection** — user specifies language during `/constitution` command
2. **Initiative context** — `language` field in active initiative's config file
3. **Target repository detection** — analyze target repo primary language (detected from .gitattributes, package.json, pyproject.toml, go.mod, etc.)
4. **None** — if no language available, load only universal constitutions

---

## Part 4 — Governance Merging (Additive Inheritance)

After loading the chain, merge governance from all layers into a single resolved config.

Start with:
```
resolved = {
  permitted_tracks:              null,   // null = unrestricted
  required_gates:                [],
  additional_review_participants: {},
  layers_loaded:                 []
}
```

For each layer in chain (parent-first):

### `permitted_tracks` — INTERSECTION (most restrictive wins)

```
IF layer.governance.permitted_tracks is NOT null:
  IF resolved.permitted_tracks IS null:
    resolved.permitted_tracks = copy of layer.governance.permitted_tracks
  ELSE:
    resolved.permitted_tracks = intersection of resolved.permitted_tracks
                                 and layer.governance.permitted_tracks
```

> ⚠️ Important: `null` means "no restriction" — not "empty set".
> An EMPTY array `[]` means "no tracks permitted at all" (maximally restrictive).

### `required_gates` — UNION (additive, all gates accumulate)

```
FOR each gate in layer.governance.required_gates:
  IF gate not already in resolved.required_gates:
    append gate to resolved.required_gates
```

### `additional_review_participants` — UNION per phase (additive)

```
FOR each phase in layer.governance.additional_review_participants:
  IF phase not in resolved.additional_review_participants:
    resolved.additional_review_participants[phase] = []
  FOR each participant in layer.governance.additional_review_participants[phase]:
    IF participant not already in resolved.additional_review_participants[phase]:
      append participant
```

### `layers_loaded`

```
append layer.layer to resolved.layers_loaded
```

---

## Part 5 — Track Permission Check

After merging, to check if a specific track is permitted:

```
IF resolved.permitted_tracks IS null:
  → PERMITTED (no restrictions defined anywhere in chain)
ELSE IF track IS in resolved.permitted_tracks:
  → PERMITTED
ELSE:
  → BLOCKED — track '{track}' not permitted
    allowed: [{resolved.permitted_tracks.join(', ')}]
```

---

## Part 6 — Display Formatting

When rendering the resolved constitution for a user, use this format:

```
═══ Constitution — Resolved Governance ═══

── ORG ──
  (none)                        ← if no org constitution found

── DOMAIN ──
  permitted_tracks: [full, feature, tech-change]
  required_gates: [adversarial-review]
  additional_review_participants:
    prd: [security-reviewer]

── SERVICE ──
  (none)

── REPO ──
  (no governance rules)         ← if file exists but has no governance config

── RESOLVED (MERGED) ──
  permitted_tracks: [full, feature, tech-change]
  required_gates: [adversarial-review]
  additional_review_participants:
    prd: [security-reviewer]

  layers_loaded: [domain]
```

**Special cases:**
- `permitted_tracks: (unrestricted)` — when resolved.permitted_tracks is null
- `required_gates: (none)` — when resolved.required_gates is empty
- `additional_review_participants: (none)` — when resolved.additional_review_participants is empty

### Status Summary (for /status display)

One-line summary format:
```
{n} level(s) loaded: [{layers_loaded}] | tracks: [{permitted_tracks}] | {n} gate(s)
```
If no constitutions found: `No constitution files found — all gates pass by default.`

---

## Part 7 — Inline Governance Validation

Run at every workflow step. Validates:

| Check | Description |
|-------|-------------|
| Initiative structure | Required fields present, valid types |
| Phase progression | Correct order per lifecycle.yaml phase_order, no skipping |
| Gate requirements | Required artifacts exist before gate opens |
| Branch topology | Matches expected patterns per lifecycle.yaml branch_patterns |
| State consistency | state.yaml matches git reality |
| Audience configuration | Valid audiences per initiative track |
| Track permission | Initiative track in resolved permitted_tracks |
| Required gates | All constitution-required gates satisfied |
| Review participants | All required participants present in PR review |
| Article-specific gates | Each constitutional article evaluated individually (Part 7b) |

### Execution Sequence (per workflow step)

```
1. Load context — read current state.yaml and active initiative
2. Resolve constitution — run Part 3 for current context
3. Generate article-specific gates — run Part 7b for resolved chain
4. Check each applicable rule from the table above
5. IF advisory mode → log warnings, continue
6. IF enforced mode → log violations, BLOCK if critical
7. Append check results to event log (include per-article results)
```

---

### Part 7b — Article-Specific Gate Generation

Constitution compliance checks MUST report per-article pass/fail, not just aggregate
`fail_count`. This ensures violations are traceable to their governing article and gives
developers clear remediation targets.

#### Step 1: Extract Articles from Resolved Chain

For each constitution file in the resolved chain (from Part 3):

```
1. Find all Markdown headings matching "Article" or "### " patterns
2. Extract for each article:
   - article_id:   ordinal position (I, II, III... or 1, 2, 3...)
   - title:        heading text (e.g., "Library-First Principle")
   - rule_text:    body text until next heading or end of section
   - rationale:    text under "Rationale:" subheading if present
   - evidence:     text under "Evidence:" subheading if present
   - source_layer: which LENS layer this article comes from (org/domain/service/repo)
   - source_file:  path to the constitution file containing this article
3. Store as: articles[] — ordered list, parent-layer articles first
```

#### Step 2: Generate Named Gate Checks

For each article in articles[]:

```
1. Derive gate_name from title:
   gate_name = slugify(article.title) + "-gate"
   Example: "Library-First Principle" → "library-first-principle-gate"

2. Derive check_items from rule_text:
   - Parse imperative sentences (MUST, SHALL, REQUIRED, NON-NEGOTIABLE)
   - Each imperative sentence becomes a checkbox item
   - If rule_text has no imperatives, create one check: "Compliant with {title}"

3. Build gate object:
   gate = {
     gate_name:    derived gate name
     article_id:   article ordinal
     title:        article title
     source_layer: article source layer
     source_file:  article source file
     check_items:  list of { description, status: pending }
     status:       "pending"
   }
```

#### Step 3: Evaluate Gate Checks Against Artifact

When running a compliance check on an artifact (dev story, code review, etc.):

```
FOR each gate in gates[]:
  FOR each check_item in gate.check_items:
    Evaluate: does the artifact satisfy this check item?
    - Search artifact text for evidence of compliance
    - If the check requires specific patterns (TDD, simplicity, etc.),
      look for corresponding indicators
    - Set check_item.status = "pass" or "fail"
    - If "fail": record violation_detail (what was expected, what was found)

  IF all check_items pass:
    gate.status = "pass"
  ELSE:
    gate.status = "fail"
    gate.failed_items = list of failed check_items with violation_detail
```

#### Step 4: Return Per-Article Results

Return structured result:

```
article_gate_results = {
  total_gates:   count of gates
  passed_gates:  count where status == "pass"
  failed_gates:  count where status == "fail"
  gates: [
    {
      gate_name:    "tdd-gate"
      article_id:   "III"
      title:        "Test-First Imperative"
      source_layer: "org"
      status:       "fail"
      check_items: [
        { description: "Tests written before implementation", status: "fail",
          violation: "No test files found in artifact references" },
        { description: "Red-Green-Refactor enforced", status: "pass" }
      ]
    },
    ...
  ]
}
```

#### Display Format (for gate results)

```
═══ Pre-Implementation Gates ═══

Gate I: Library-First Principle (org)                    ✓ PASS
  ✓ Every feature begins as standalone library
  ✓ Libraries are independently testable

Gate III: Test-First Imperative (org)                    ✗ FAIL
  ✗ Tests written before implementation
    → Violation: No test files referenced in dev story
    → Remediation: Add test file paths to acceptance criteria
  ✓ Red-Green-Refactor cycle enforced

Gate VII: Simplicity (domain)                            ✓ PASS
  ✓ Using ≤3 projects

── Summary ──
  Passed: 2/3 gates | Failed: 1 gate (Article III)
  Mode: enforced → BLOCKED (resolve Article III violations)
```

#### Integration with Existing Compliance Check

The existing `constitution.compliance-check` invocation now returns BOTH:
- `fail_count` (aggregate, backward-compatible)
- `article_gate_results` (per-article detail, new)

Workflows can use either. New workflows SHOULD use `article_gate_results`
for richer error reporting. Legacy workflows continue to work with `fail_count`.

---

## Part 8 — Enforcement Modes

| Mode | Source | Behavior |
|------|--------|----------|
| `advisory` | Default | Warn but never block progress |
| `enforced` | Initiative config `constitution_mode: enforced` | Block on critical violations |

**Error handling table:**

| Violation Type | Advisory | Enforced |
|----------------|----------|----------|
| Minor | Log warning, continue | Log warning, continue |
| Critical | Log warning with ⚠️, continue | Log violation, **BLOCK**, show remediation |

### Critical vs Minor

**Critical violations** (block in enforced mode):
- Track not in permitted_tracks
- Required gate artifact missing
- Required reviewer not in PR

**Minor violations** (warn only):
- Malformed constitution YAML (parse error)
- Missing fields in initiative config
- State inconsistency (advisory only)

---

## Part 9 — Edge Cases and Validation

Handle these edge cases correctly:

| Situation | Handling |
|-----------|----------|
| File doesn't exist at any layer | Return empty chain — all gates pass by default |
| Malformed frontmatter YAML | Treat as `{}`, log `_parseError`, continue |
| Malformed YAML block | Skip that block silently |
| `permitted_tracks: []` (empty array) | Maximum restriction — NO tracks permitted |
| `permitted_tracks: null` or absent | No restriction — all tracks permitted |
| Circular reference in inheritance | Track visited paths; skip duplicates with warning |
| Unicode content | Handle gracefully — no special treatment needed |
| Very large constitution | Process normally — no size limits |
| Missing `domain`/`service`/`repo` context | Skip layers requiring those variables |

---

## Part 10 — Language-Specific Constitution Scope

**Scope rule:** Language-specific constitutions apply ONLY to target repositories that match the declared language.

**Enforcement:**
- When loading a language-specific constitution, record `{language}` in the governance config
- During compliance checks, validate that the target repo's language matches
- If target repo language does not match, warn (advisory) or block (enforced) based on mode
- Example: A `typescript/constitution.md` rule does NOT apply to a `python-api` repository

**Language detection in target repos:**
- Check `.bmad/language` file if present (explicit override)
- Analyze build files: `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `.csproj`, etc.
- Analyze source extensions: `.ts`/`.js`, `.py`, `.go`, `.java`, `.cs` distributions
- Fall back to repo's GitHub primary language if available
- Default to "unknown" if language cannot be determined

---

## Part 11 — Trigger Conditions

- **Automatic** — at every workflow step (via background_triggers defined in lifecycle.yaml)
- **Explicit** — via `/constitution` command (view/create/amend, with optional language selection)
- **Explicit** — via `/resolve` command (walk and display hierarchy, with language support)
- **Explicit** — via `/compliance` command (check artifacts against constitution, validates language match)
- Results surface only when violations found (in automatic mode)

---

## Part 12 — Checklist Quality Gates

Pre-implementation checklists act as "unit tests for English" — validating that requirements
are well-defined before code is written. This follows the spec-kit pattern where checklists
gate the implement phase.

### 12a. Checklist Discovery

Before implementation begins, scan for quality checklists:

```
1. Primary path: {bmad_docs}/checklists/  (per-initiative BmadDocs)
2. Fallback path: _bmad-output/implementation-artifacts/checklists/
3. Readiness checklist: {docs_path}/readiness-checklist.md (from sprintplan)
4. Accept files matching: *.md with checklist-style content (lines starting with - [ ] or - [x])
```

### 12b. Checklist Evaluation

For each discovered checklist file:

```
1. Parse all lines matching:  /^[\s]*-\s+\[([ xX])\]/
2. Count:
   - total:     all checkbox lines
   - completed: lines with [x] or [X]
   - incomplete: lines with [ ]
3. Determine status:
   - PASS: incomplete == 0
   - FAIL: incomplete > 0
```

### 12c. Status Table Rendering

```
═══ Checklist Quality Gate ═══

| Checklist        | Total | Done | Open | Status  |
|------------------|-------|------|------|---------|
| ux.md            | 12    | 12   | 0    | ✓ PASS  |
| api.md           | 8     | 5    | 3    | ✗ FAIL  |
| security.md      | 6     | 6    | 0    | ✓ PASS  |
| readiness.md     | 15    | 15   | 0    | ✓ PASS  |

Overall: 3/4 checklists passed | 1 checklist has incomplete items
```

### 12d. Gate Decision

```
IF all checklists PASS:
  → Proceed automatically to implementation
  → Log: "Checklist quality gate: PASSED"

IF any checklist FAIL:
  → Display status table
  → Ask: "Some checklists have incomplete items. Proceed anyway? [Y/N]"
  → IF user chooses Y:
    → Log: "Checklist quality gate: OVERRIDDEN by user"
    → Record override in complexity tracking (Part 13)
    → Proceed to implementation
  → IF user chooses N:
    → Halt with list of incomplete items per failing checklist
    → Suggest: "Complete the open items, then re-run /dev"

IF no checklists found:
  → Proceed automatically (no gate to check)
  → Log: "Checklist quality gate: SKIPPED (no checklists found)"
```

---

## Part 13 — Complexity Tracking

When a constitution gate violation is justified and the user proceeds anyway (advisory mode
or explicit override), the violation MUST be documented with a structured justification.
This creates an audit trail and ensures code reviewers can challenge overrides.

### 13a. When to Record

Record a complexity tracking entry when:
- A constitutional article gate fails but the user proceeds (advisory mode)
- A checklist quality gate is overridden (Part 12d)
- An article-specific gate is explicitly waived during pre-implementation check
- A cross-artifact analysis finding is acknowledged but deferred (Part 14)

### 13b. Justification Format

Each entry follows this structure:

```
| Violation | Article | Why Needed | Simpler Alternative Rejected Because |
|-----------|---------|------------|--------------------------------------|
| {description of what was violated} | {article ID and title} | {why proceeding is necessary} | {what simpler approach was considered and why it's insufficient} |
```

### 13c. Storage

```
1. File: {bmad_docs}/complexity-tracking.md  (per-initiative BmadDocs)
   Fallback: _bmad-output/implementation-artifacts/complexity-tracking.md

2. File structure:
   ---
   # Complexity Tracking — {initiative_name}

   Initiative: {initiative_id}
   Constitution Version: {resolved_constitution_version}
   Last Updated: {ISO_TIMESTAMP}

   ## Override Log

   | # | Violation | Article | Why Needed | Simpler Alternative Rejected Because | Date | Phase |
   |---|-----------|---------|------------|--------------------------------------|------|-------|
   | 1 | 4th project added | VII: Simplicity | Payment gateway requires isolated service | Embedding in existing service creates coupling | 2026-03-02 | dev |

   ---

3. Append new entries — never overwrite existing ones
4. Commit after each entry with message:
   "[lens-work] complexity-tracking: {article_id} override — {initiative_id}"
```

### 13d. Downstream Consumption

Complexity tracking entries are passed to:
- **Code review (Quinn/QA):** Reviewer MUST challenge each override justification
- **Party mode teardown:** Multi-agent panel evaluates whether overrides are still justified
- **Epic completion review:** Accumulated overrides are reviewed for systemic patterns
- **Retrospective:** Override count and patterns feed into process improvement

### 13e. Event Logging

```
{
  "ts": "{ISO_TIMESTAMP}",
  "event": "constitution-override",
  "id": "{initiative_id}",
  "article_id": "{article_id}",
  "article_title": "{article_title}",
  "violation": "{description}",
  "justification": "{why_needed}",
  "phase": "{current_phase}",
  "mode": "advisory|overridden"
}
```

---

## Part 14 — Cross-Artifact Consistency Analysis

Provides deep, read-only analysis across all planning artifacts to detect inconsistencies,
coverage gaps, and constitution violations before implementation begins. Mirrors spec-kit's
`/speckit.analyze` command.

### 14a. Trigger

- **Explicit:** via `/analyze` command
- **Automatic:** at phase transitions (sprintplan → dev) when `background_triggers` is enabled
- **On demand:** when invoked by any workflow step via `constitution.analyze-artifacts`

### 14b. Artifact Discovery

Load all planning artifacts from the initiative's docs path:

```
artifacts_to_analyze = [
  { type: "product-brief",      path: "{docs_path}/product-brief.md" },
  { type: "prd",                path: "{docs_path}/prd.md" },
  { type: "architecture",       path: "{docs_path}/architecture.md" },
  { type: "epics",              path: "{docs_path}/epics.md" },
  { type: "stories",            path: "{docs_path}/stories.md" },
  { type: "readiness-checklist", path: "{docs_path}/readiness-checklist.md" },
  { type: "techplan",           path: "{docs_path}/techplan.md" },
  { type: "dev-story",          path: "{bmad_docs}/dev-story-*.md" }
]

# Skip files that don't exist — only analyze what's available
# Minimum 2 artifacts required for cross-artifact analysis
```

### 14c. Analysis Passes

Run these detection passes across all loaded artifacts:

| Pass | Description | Severity |
|------|-------------|----------|
| **Constitution Alignment** | Each artifact checked against resolved article gates (Part 7b) | CRITICAL |
| **Coverage Gaps** | Stories reference features not in PRD; architecture defines components not in stories | HIGH |
| **Inconsistency** | Conflicting statements between artifacts (e.g., PRD says REST, architecture says GraphQL) | HIGH |
| **Duplication** | Same requirement stated differently in multiple artifacts | MEDIUM |
| **Ambiguity** | Vague language ("should", "might", "possibly") in acceptance criteria or requirements | MEDIUM |
| **Underspecification** | Referenced entities/APIs/models with no definition anywhere | LOW |

**Constitution alignment is always CRITICAL** — adjust artifacts, never dilute constitutional principles.

### 14d. Analysis Report Format

```
═══ Cross-Artifact Consistency Analysis ═══

Initiative: {initiative_name} ({initiative_id})
Artifacts Analyzed: {count}
Constitution Version: {version}
Analysis Date: {ISO_TIMESTAMP}

── Coverage Summary ──

| Artifact            | Constitution | Consistency | Completeness | Issues |
|---------------------|-------------|-------------|--------------|--------|
| product-brief.md    | ✓ PASS      | ✓ PASS      | ✓ PASS       | 0      |
| prd.md              | ✓ PASS      | ⚠ WARN      | ✓ PASS       | 1      |
| architecture.md     | ✗ FAIL      | ✓ PASS      | ⚠ WARN       | 2      |
| stories.md          | ✓ PASS      | ✗ FAIL      | ✓ PASS       | 1      |

── Findings ──

### CRITICAL

1. **[Constitution] architecture.md violates Article VII: Simplicity**
   Architecture defines 5 separate microservices; Article VII limits to 3 projects.
   → Remediation: Consolidate services or document justification in complexity tracking.

### HIGH

2. **[Inconsistency] stories.md ↔ architecture.md**
   Story S3 references "PaymentGateway API" but architecture defines it as "BillingService".
   → Remediation: Align naming in stories.md or architecture.md.

3. **[Coverage] architecture.md**
   Component "CacheLayer" defined in architecture but no story covers its implementation.
   → Remediation: Add story or remove component if not needed for MVP.

### MEDIUM

4. **[Ambiguity] prd.md**
   Requirement R4: "System should handle high traffic" — no quantitative threshold defined.
   → Remediation: Define specific throughput target (e.g., "1000 req/s at P99 < 200ms").

── Metrics ──

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 2     |
| MEDIUM   | 1     |
| LOW      | 0     |
| Total    | 4     |

── Recommendation ──

CRITICAL findings must be resolved before proceeding to /dev.
Run /compliance to re-check after making changes.
```

### 14e. Gate Behavior

```
IF any CRITICAL findings:
  enforced mode → BLOCK implementation; display findings and remediation
  advisory mode → WARN with ⚠️; allow proceeding with complexity tracking entry (Part 13)

IF only HIGH/MEDIUM/LOW findings:
  Display findings; proceed automatically
  Log findings for code review context
```

---

## Part 15 — Sync Impact Reports

When a constitution is amended, all downstream artifacts, initiatives, and templates may be
affected. A sync impact report ensures amendment ratifiers understand the blast radius.

### 15a. Trigger

Generated automatically:
- During constitution amend workflow (Step 5A–6A), before ratification
- When `/constitution amend` modifies any article

### 15b. Impact Discovery

```
1. Identify the amended constitution:
   - layer: {layer_type}
   - name: {constitution_name}
   - scope: universal or {language}-specific
   - version_change: {old_version} → {new_version}

2. Find all governed scopes:
   - If org-level: ALL domains, services, repos are affected
   - If domain-level: all services and repos in that domain
   - If service-level: all repos in that service
   - If repo-level: only that repo

3. Find active initiatives in governed scopes:
   - Scan _bmad-output/lens-work/initiatives/*.yaml
   - Filter: initiative.domain matches governed domain (or all if org)
   - Filter: initiative.status != "complete" and != "archived"

4. For each affected initiative, identify artifacts that may need re-validation:
   - All artifacts created BEFORE the amendment timestamp
   - Specifically: architecture.md, prd.md, stories.md, dev-stories, readiness-checklist
```

### 15c. Report Format

```
═══ Constitution Sync Impact Report ═══

Amendment: {layer_type} constitution "{constitution_name}"
Version: {old_version} → {new_version} ({MAJOR|MINOR|PATCH})
Change Type: {Add|Modify|Clarify|Deprecate}
Changed Articles: {list of affected article titles}

── Blast Radius ──

Governed Scopes: {count}
  - Domain: payments (3 services, 7 repos)
  - Domain: identity (2 services, 4 repos)

Active Initiatives Affected: {count}

| Initiative | Phase | Status | Artifacts to Re-validate |
|------------|-------|--------|--------------------------|
| BMAD-42    | dev   | in_progress | architecture.md, stories.md |
| BMAD-55    | sprintplan | pr_pending | readiness-checklist.md |
| BMAD-61    | techplan | complete | techplan.md |

── Version Change Impact ──

| Change Level | Meaning | Required Action |
|-------------|---------|-----------------|
| MAJOR | Article removed or principle weakened | Re-run /compliance on ALL affected initiatives |
| MINOR | Article added, modified, or deprecated | Re-run /compliance on in-progress initiatives |
| PATCH | Clarification only (no substance change) | No re-validation required |

── Recommended Actions ──

{if MAJOR}
⚠️  MAJOR change detected. After ratification:
1. Run /analyze on each affected initiative to verify compliance
2. Update complexity-tracking.md entries that reference changed articles
3. Notify initiative leads of constitutional change
{endif}

{if MINOR}
ℹ️  MINOR change. After ratification:
1. Re-run /compliance on initiatives currently in dev or sprintplan
2. New article will be enforced on future artifact creation
{endif}

{if PATCH}
✅ PATCH change. No downstream re-validation required.
{endif}

── Template Propagation ──

Templates referencing constitutional governance:
  - workflows/router/dev/workflow.md (article-specific gates)
  - workflows/router/sprintplan/workflow.md (compliance gate)
  - workflows/governance/compliance-check/ (compliance spec)
  - templates/constitutions/ (constitution templates)

Verify: templates still align with amended articles? [Y/N]
```

### 15d. Ratification Gate

The sync impact report MUST be displayed to the user before the amend ratification prompt.
The user must acknowledge the blast radius before confirming the amendment.

```
IF version_change is MAJOR:
  Require explicit confirmation: "This is a MAJOR change affecting {n} initiatives. Ratify? [Y/N]"
IF version_change is MINOR:
  Show report, standard ratification prompt
IF version_change is PATCH:
  Show abbreviated report (affected count only), standard ratification prompt
```

---

_Skill spec extended for language-specific constitutions on 2026-03-01_
_Skill spec extended for spec-kit alignment (Parts 7b, 12–15) on 2026-03-02_
