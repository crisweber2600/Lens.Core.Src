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

### Execution Sequence (per workflow step)

```
1. Load context — read current state.yaml and active initiative
2. Resolve constitution — run Part 3 for current context
3. Check each applicable rule from the table above
4. IF advisory mode → log warnings, continue
5. IF enforced mode → log violations, BLOCK if critical
6. Append check results to event log
```

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

_Skill spec extended for language-specific constitutions on 2026-03-01_
