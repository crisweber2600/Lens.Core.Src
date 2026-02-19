---
layer: microservice
name: "{name}"
created_by: "{user}"
ratification_date: "{date}"
last_amended: null
amendment_count: 0
---

# Microservice Constitution: {name}

**Inherits From:** Service and Domain constitutions (resolved via `/resolve`)
**Version:** 1.0.0
**Ratified:** {date}
**Last Amended:** —

---

## Preamble

This constitution governs the {name} microservice within its service bounded context. It inherits all articles from the Service and Domain Constitutions.

{Brief description of the microservice's responsibility}

---

## Inherited Articles

*All articles from Service and Domain Constitutions apply automatically. Run `/resolve` to see the full accumulated ruleset.*

---

## Microservice Articles

### Article {N}: {Microservice-Specific Principle}

{Non-negotiable rule specific to this microservice}

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

{Why this microservice-level constitution exists and what it adds beyond service/domain rules}

---

## Governance

### Amendment Process

1. Propose amendment via `/constitution` amend mode
2. Require approval from Tech Lead
3. Ratify with Tech Lead approval — Scribe records and Casey commits

### Tech Lead

- Name: {Lead Name}

---

_Constitution ratified on {date}_
