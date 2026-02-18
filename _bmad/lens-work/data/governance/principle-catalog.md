# Governance Principle Catalog

**Purpose:** Curated catalog of common governance principles for constitution creation.

**Usage:** Reference during constitution creation to select relevant principles for your project.

---

## Development Principles

### Test-Driven Development (TDD)

**Description:** All production code must be preceded by failing tests.

**Rationale:** TDD ensures code quality, provides living documentation, and enables fearless refactoring.

**Evidence Required:**
- Test suite exists with >80% code coverage
- No production code merged without corresponding tests
- Test execution included in CI/CD pipeline

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for projects where quality and maintainability are critical.

---

### Behavior-Driven Development (BDD)

**Description:** Requirements expressed as executable scenarios in Given-When-Then format.

**Rationale:** BDD bridges communication between technical and non-technical stakeholders, ensuring shared understanding.

**Evidence Required:**
- Feature files exist in Gherkin format (or equivalent)
- Acceptance tests cover all user stories
- BDD scenarios reviewed by product owners

**NON-NEGOTIABLE Guidance:** Recommend ADVISORY for projects with complex business logic requiring stakeholder alignment.

---

### Code Review Requirement

**Description:** All code changes require peer review before merge.

**Rationale:** Code reviews catch bugs early, spread knowledge, and maintain consistent coding standards.

**Evidence Required:**
- GitHub/GitLab merge request approval required
- At least 1 reviewer per change
- Review comments addressed before merge

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for teams prioritizing code quality and knowledge sharing.

---

## Architecture Principles

### API-First Design

**Description:** APIs designed and documented before implementation begins.

**Rationale:** API-first ensures consistent interface contracts, enables parallel development, and improves integration quality.

**Evidence Required:**
- OpenAPI (Swagger) spec exists for all APIs
- API design reviewed before implementation
- Contract testing validates spec compliance

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for microservices architectures and teams with multiple integrations.

---

### Domain-Driven Design

**Description:** Software structure mirrors business domain model with ubiquitous language.

**Rationale:** DDD reduces complexity by aligning code with business concepts, improving communication and maintainability.

**Evidence Required:**
- Domain model documented (bounded contexts, aggregates, entities)
- Ubiquitous language defined and used consistently
- Code organized by domain boundaries

**NON-NEGOTIABLE Guidance:** Recommend ADVISORY — valuable for complex domains but may be overhead for simple systems.

---

### Observability by Default

**Description:** All systems emit structured logs, metrics, and traces.

**Rationale:** Observability enables rapid debugging, performance optimization, and proactive issue detection.

**Evidence Required:**
- Structured logging implemented (JSON format)
- Metrics exported (Prometheus/OpenTelemetry)
- Distributed tracing configured
- Observability dashboards created

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for production systems requiring high availability.

---

## Security Principles

### Security-First Development

**Description:** Security considerations integrated into every development stage.

**Rationale:** Retrofit security is costly and error-prone. Security-first prevents vulnerabilities by design.

**Evidence Required:**
- Security requirements documented in PRD
- Threat modeling performed for architecture
- Security scans (SAST/DAST) in CI/CD
- Security review required before production

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for systems handling sensitive data or PII.

---

### Principle of Least Privilege

**Description:** Users and services granted minimum permissions necessary.

**Rationale:** Least privilege limits blast radius of security breaches and accidental misconfigurations.

**Evidence Required:**
- IAM policies scoped to specific resources
- Service accounts use role-based access control (RBAC)
- Privilege escalation requires approval
- Permission audits conducted quarterly

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for all systems with authenticated users.

---

## Quality Principles

### Performance Budgets

**Description:** Quantified performance targets (latency, throughput, resource usage).

**Rationale:** Performance budgets prevent degradation over time by making performance a measurable requirement.

**Evidence Required:**
- Performance targets documented (e.g., p95 latency < 200ms)
- Load testing validates targets
- Performance monitoring alerts on budget violations

**NON-NEGOTIABLE Guidance:** Recommend ADVISORY — enforce selectively for performance-critical endpoints.

---

### Accessibility Standards (WCAG)

**Description:** UI complies with WCAG 2.1 Level AA accessibility guidelines.

**Rationale:** Accessibility ensures inclusive user experience and legal compliance.

**Evidence Required:**
- Accessibility audit performed (automated + manual)
- ARIA labels implemented
- Keyboard navigation functional
- Color contrast ratios meet WCAG standards

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for public-facing applications.

---

## Process Principles

### Continuous Integration

**Description:** Code changes integrated to mainline multiple times per day with automated builds/tests.

**Rationale:** CI detects integration issues early, reduces merge conflicts, and enables faster delivery.

**Evidence Required:**
- CI pipeline runs on every commit
- Build+test execution < 10 minutes
- Pipeline failures block merge

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for teams with 3+ developers.

---

### Continuous Deployment

**Description:** Every mainline commit automatically deployed to production after passing tests.

**Rationale:** CD minimizes time-to-market, reduces manual errors, and enables rapid feedback.

**Evidence Required:**
- Deployment pipeline fully automated
- Feature flags enable safe rollout
- Rollback procedures tested
- Production monitoring validates deployments

**NON-NEGOTIABLE Guidance:** Recommend ADVISORY — requires mature testing and monitoring infrastructure.

---

## Governance Principles

### Documentation as Code

**Description:** Documentation lives in version control alongside code, treated as first-class artifact.

**Rationale:** Documentation-as-code ensures docs stay synchronized with code and enables review workflows.

**Evidence Required:**
- Documentation in Markdown/AsciiDoc in repository
- Documentation changes reviewed in pull requests
- Automated docs publishing pipeline

**NON-NEGOTIABLE Guidance:** Recommend NON-NEGOTIABLE for projects requiring long-term maintainability.

---

*Use this catalog as inspiration, not prescription. Tailor principles to your project's specific needs.*