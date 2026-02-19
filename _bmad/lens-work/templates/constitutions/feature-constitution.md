---
layer: feature
name: "{name}"
created_by: "{user}"
ratification_date: "{date}"
last_amended: null
amendment_count: 0
---

# Feature Constitution: {name}

**Inherits From:** All parent constitutions (resolved via `/resolve`)
**Version:** 1.0.0
**Ratified:** {date}
**Last Amended:** —

---

## Preamble

This constitution governs the {name} feature implementation. It inherits all articles from Microservice, Service, and Domain Constitutions.

{Brief description of the feature}

---

## Inherited Articles

*All articles from parent Constitutions apply automatically. Run `/resolve` to see the full accumulated ruleset.*

---

## Feature Articles

### Article {N}: {Feature-Specific Principle}

{Non-negotiable rule specific to this feature}

**Rationale:** {Why this rule exists}

**Evidence Required:** {What artifact demonstrates compliance}

---

### Article Enforcement Levels

By default, all articles are **MANDATORY** — violations produce **FAIL** (blocking) during compliance checks.

To make an article advisory (non-blocking), add `(ADVISORY)` suffix to the article header:

> Example: `### Article VI: Documentation Standards (ADVISORY)`

- **MANDATORY** (default) — Violations produce FAIL, block compliance
- **(ADVISORY)** — Violations produce WARN only, non-blocking
- **(NON-NEGOTIABLE)** — Valid for documentation clarity, but has no behavioral effect (all non-ADVISORY articles already default to FAIL enforcement)

---

## Amendments

(none)

## Rationale

{Why this feature-level constitution exists}

---

## Governance

### Amendment Process

Feature constitutions are typically not amended; they are versioned with each iteration.

### Owner

- Developer: {Name}

---

_Constitution ratified on {date}_
