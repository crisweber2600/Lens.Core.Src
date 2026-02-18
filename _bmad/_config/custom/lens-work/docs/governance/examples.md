# Governance Examples

Real-world examples of constitutional governance in action with lens-work.

---

## Example 1: E-Commerce Domain Setup

### Domain Constitution

```markdown
# Domain Constitution: Acme Corp

**Inherits From:** None
**Version:** 1.0.0
**Ratified:** 2024-03-15

## Preamble

This constitution establishes governance for all Acme Corp software.

## Articles

### Article I: Security Review
All features handling user data require security review.

**Rationale:** User data breaches have legal and reputational consequences.
**Evidence Required:** Security review sign-off or threat model document.

### Article II: API Versioning
All APIs must implement semantic versioning.

**Rationale:** Breaking changes without version bumps disrupt downstream consumers.
**Evidence Required:** Version header or URL path versioning in API spec.

### Article III: Observability
All services must emit logs, metrics, and traces.

**Rationale:** Production debugging without observability is guesswork.
**Evidence Required:** Logging configuration and metrics endpoint documented.
```

### Service Constitution (ecommerce)

```markdown
# Service Constitution: E-Commerce Platform

**Inherits From:** Domain constitution (resolved via /resolve)
**Version:** 1.0.0
**Ratified:** 2024-06-01

## Preamble

Governance for the e-commerce bounded context.

## Service Articles

### Article IV: PCI Compliance
All payment-related features must comply with PCI-DSS.

**Rationale:** Legal requirement for handling payment card data.
**Evidence Required:** PCI compliance checklist or SAQ reference.

### Article V: Cart State
Shopping cart state must survive session expiration.

**Rationale:** Users abandon carts when state is lost.
**Evidence Required:** Persistence strategy documented in architecture.
```

### Storage Location

These constitutions would be stored at:
- `_bmad-output/lens-work/constitutions/domain/acme-corp/constitution.md`
- `_bmad-output/lens-work/constitutions/service/ecommerce/constitution.md`

---

## Example 2: Compliance Check Output

Running `/compliance` on a PRD:

```
📜 Constitutional Compliance Review

Artifact: _bmad-output/planning-artifacts/checkout-v2/prd.md
Type: PRD
Context: service — ecommerce

Checking against: 2 constitution(s), 5 articles
Date: 2026-02-06

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ VERDICT: CONDITIONAL PASS
4 satisfied, 1 not verified, 0 violations.

## Results by Article

PASS Article I: Security Review — Satisfied
  Evidence: Section 4.2 "Security Considerations" addresses requirements
  Location: Section 4.2

PASS Article II: API Versioning — Satisfied
  Evidence: Section 3.1 specifies v2 endpoint versioning
  Location: Section 3.1

PASS Article III: Observability — Satisfied
  Evidence: Section 5.1 defines logging and metrics strategy
  Location: Section 5.1

PASS Article IV: PCI Compliance — Satisfied
  Evidence: Section 4.3 references PCI-DSS requirements
  Location: Section 4.3

WARN Article V: Cart State — Not verified
  Expected: Persistence strategy for cart state
  Found: No mention of cart state persistence
  Recommendation: Add section addressing cart state survival across sessions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

4/5 PASS | 1/5 WARN | 0/5 FAIL

## Recommendations
1. Add section addressing cart state persistence strategy
```

---

## Example 3: Ancestry Display

Running `/ancestry`:

```
📜 Constitution Ancestry: checkout-api

Your Position: microservice at checkout-api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acme Corp Domain Constitution (ratified 2024-03-15)
├─ 3 articles
├─ Version: 1.0.0
├─ Last amended: 2024-09-01
│
└─ ecommerce Service Constitution (ratified 2024-06-01)
   ├─ 2 articles (+3 inherited = 5 total)
   ├─ Version: 1.0.0
   ├─ Last amended: 2024-11-15
   │
   └─ checkout-api Constitution (ratified 2025-01-10)
      ├─ 2 articles (+5 inherited = 7 total)
      ├─ Version: 1.0.0
      ├─ Last amended: 2025-06-20
      │
      └─ [YOU ARE HERE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Governance Summary:

Total inherited articles: 7
Constitution depth: 3 layers
Oldest ratification: 2024-03-15
Most recent amendment: 2025-06-20

"Your governance heritage spans 3 generations of constitutional wisdom."
```

---

## Example 4: Resolve Output

Running `/resolve`:

```
📜 Resolved Constitution: checkout-api

Context: microservice — checkout-api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inheritance Chain:
  1. domain: acme-corp (3 articles)
     Ratified: 2024-03-15
  2. service: ecommerce (2 articles)
     Ratified: 2024-06-01
  3. microservice: checkout-api (2 articles)
     Ratified: 2025-01-10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Governance: 7 articles from 3 constitution(s)

## Domain Articles (source: acme-corp)

### I: Security Review
All features handling user data require security review.
Rationale: User data breaches have legal and reputational consequences.

### II: API Versioning
All APIs must implement semantic versioning.
Rationale: Breaking changes without version bumps disrupt downstream consumers.

### III: Observability
All services must emit logs, metrics, and traces.
Rationale: Production debugging without observability is guesswork.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Service Articles (source: ecommerce)

### IV: PCI Compliance
All payment-related features must comply with PCI-DSS.
Rationale: Legal requirement for handling payment card data.

### V: Cart State
Shopping cart state must survive session expiration.
Rationale: Users abandon carts when state is lost.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These 7 articles govern all work in this context.
```

---

_Examples for lens-work governance_
