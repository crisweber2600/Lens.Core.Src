# Constitution Guide

Everything you need to know about creating and managing constitutions in lens-work.

---

## What is a Constitution?

A constitution is a governance document that defines non-negotiable rules for your codebase. These rules are evaluated on demand via the `/compliance` command and can be resolved for any LENS context.

---

## Constitution Hierarchy

Constitutions follow the LENS layer hierarchy:

```
Domain Constitution (enterprise-wide)
    ↓ inherits
Service Constitution (bounded context)
    ↓ inherits
Microservice Constitution (single service)
    ↓ inherits
Feature Constitution (implementation)
```

### Inheritance Rules

1. **Automatic** — All parent articles apply to children
2. **Additive** — New articles may be added at any level
3. **Non-Contradictory** — Children cannot weaken parent rules (parent wins on conflict)
4. **Specializing** — Children can add context-specific guidance

---

## Creating Constitutions

### Domain Constitution

Create once at the enterprise level:

```
/constitution
```

Select: `[C] Create`
Layer: `Domain`

Add articles that apply everywhere:
- Security requirements
- Data classification
- API versioning standards
- Observability requirements

### Service Constitution

Create for each bounded context:

```
/constitution
```

The constitution will automatically inherit from Domain.

### Microservice & Feature Constitutions

Follow the same process at lower LENS layers. Each inherits from its parent.

---

## Constitution Structure

```markdown
# {Layer} Constitution: {Name}

**Inherits From:** {parent_path}
**Version:** {MAJOR.MINOR.PATCH}
**Ratified:** {YYYY-MM-DD}
**Last Amended:** {YYYY-MM-DD}

## Preamble
{Why this constitution exists}

## Articles

### Article I: {Name}
{Rule with rationale}

**Rationale:** {Why this rule exists}
**Evidence Required:** {What demonstrates compliance}

## Governance
{Amendment process}
```

---

## Constitution Storage

Constitutions are stored as runtime artifacts at:

```
_bmad-output/lens-work/constitutions/{layer}/{name}/constitution.md
```

For example:
- `_bmad-output/lens-work/constitutions/domain/bmad/constitution.md`
- `_bmad-output/lens-work/constitutions/service/lens/constitution.md`

---

## Writing Good Articles

### Do

- Be specific and actionable
- Include rationale (the "why")
- Define what evidence satisfies the article
- Use clear, unambiguous language

### Don't

- Write vague principles without enforcement criteria
- Create rules that can't be verified
- Duplicate what parent constitutions already cover
- Make rules so strict they're always bypassed

---

## Amending Constitutions

To modify an existing constitution:

```
/constitution
```

Select: `[A] Amend`

You can:
- Add new articles
- Clarify existing articles
- Modify existing article text
- Deprecate outdated articles
- Update governance procedures

**Note:** You cannot remove or weaken inherited articles. Parent rules always prevail.

---

## Best Practices

### Start Small

Begin with 3-5 essential domain articles. Add more as patterns emerge.

### Document Rationale

Every article should answer: "Why does this rule exist?"

### Make Evidence Clear

Define exactly what artifact proves compliance.

### Review Regularly

Schedule quarterly constitution reviews to remove outdated rules.

---

_Constitution Guide for lens-work governance_
