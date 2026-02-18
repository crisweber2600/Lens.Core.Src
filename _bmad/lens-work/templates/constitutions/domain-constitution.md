---
layer: domain
name: "{name}"
created_by: "{user}"
ratification_date: "{date}"
last_amended: null
amendment_count: 0
---

# Domain Constitution: {name}

**Inherits From:** None (root constitution)
**Version:** 1.0.0
**Ratified:** {date}
**Last Amended:** —

---

## Preamble

This constitution establishes the foundational governance principles for all software development within {name}. These articles apply to every service, microservice, and feature regardless of domain or team.

We hold these principles to ensure consistency, security, quality, and maintainability across our entire technology portfolio.

---

## Articles

### Article I: {Principle Title}

{Non-negotiable rule for this domain}

**Rationale:** {Why this rule exists}

**Evidence Required:** {What artifact demonstrates compliance}

---

### Article II: {Principle Title}

{Rule}

**Rationale:** {Why}

**Evidence Required:** {What}

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

This constitution establishes the foundational architectural standards for the {name} domain. All services inheriting from this domain are bound by these articles.

---

## Governance

### Amendment Process

1. Propose amendment via `/constitution` amend mode
2. Require approval from Architecture Review Board
3. Ratify amendment — Scribe records and Casey commits
4. Amendment logged via Tracey (`constitution-amended` event)

### Enforcement

- Compliance checks run via `/compliance` command
- Violations surface as WARN or FAIL per article
- Exemptions require documented justification

---

_Constitution ratified on {date}_
