# Branch Topology — LENS Workbench

<!-- REQ-6: Branch naming conventions, composition rules, and length guidelines -->

## Overview

LENS Workbench uses a hierarchical branch naming convention that encodes **domain**, **service**, **initiative**, **audience**, **phase**, and **workflow** into each branch name. This document serves as the canonical reference for constructing and interpreting these names.

---

## Branch Name Composition

```
{domain}-{service}-{initiative}-{audience}-p{N}-{workflow}
```

| Segment       | Required | Description                                      | Example                    |
| ------------- | -------- | ------------------------------------------------ | -------------------------- |
| `domain`      | Yes      | Top-level organisational domain                  | `bmad`                     |
| `service`     | Yes      | Service or product within the domain             | `lens`                     |
| `initiative`  | Yes      | Short initiative / feature identifier            | `onboarding-enhancements`  |
| `audience`    | No       | Review-audience size (`small`, `medium`, `large`) | `small`                    |
| `p{N}`        | No       | Phase number (1–4)                               | `p1`                       |
| `workflow`    | No       | Active workflow name                             | `pre-plan`                 |

Each segment is separated by a hyphen (`-`). Branches are created **incrementally** — you only add segments as you move deeper in the hierarchy.

---

## Branch Hierarchy

```
bmad                                                  ← Domain
 └─ bmad-lens                                         ← Service
     └─ bmad-lens-onboarding-enhancements             ← Feature Root
         ├─ bmad-lens-onboarding-enhancements-small          ← Audience
         │   ├─ bmad-lens-onboarding-enhancements-small-p1          ← Phase
         │   │   └─ bmad-lens-onboarding-enhancements-small-p1-pre-plan  ← Workflow
         │   └─ bmad-lens-onboarding-enhancements-small-p2
         ├─ bmad-lens-onboarding-enhancements-medium
         │   └─ bmad-lens-onboarding-enhancements-medium-p2
         └─ bmad-lens-onboarding-enhancements-large
             ├─ bmad-lens-onboarding-enhancements-large-p3
             └─ bmad-lens-onboarding-enhancements-large-p4
```

---

## Branch Levels in Detail

### 1. Domain Branch — `{domain_prefix}`

The top-level grouping for all work within an organisational domain.

**Example:** `bmad`

### 2. Service Branch — `{domain_prefix}-{service_prefix}`

Identifies a specific service or product under the domain.

**Example:** `bmad-lens`

### 3. Feature Root Branch — `{domain_prefix}-{service_prefix}-{initiative_id}`

The root branch for a given initiative or feature. All audience, phase, and workflow branches descend from here.

**Example:** `bmad-lens-onboarding-enhancements`

**Multi-repo variant:** When an initiative spans multiple repositories, include the repo name:

```
{domain_prefix}-{service_prefix}-{repo_name}-{initiative_id}
```

**Example:** `bmad-lens-webapp-onboarding-enhancements`

### 4. Audience Branch — `{featureBranchRoot}-{audience}`

Appends the target review-audience size to the feature root.

| Audience   | Description                               |
| ---------- | ----------------------------------------- |
| `small`    | Solo developer, 1 reviewer                |
| `medium`   | Small team, 2–3 reviewers                 |
| `large`    | Full team, formal review gates            |

**Example:** `bmad-lens-onboarding-enhancements-small`

### 5. Phase Branch — `{featureBranchRoot}-{audience}-p{N}`

Encodes the current phase of work.

| Phase | Name                  | Description                           |
| ----- | --------------------- | ------------------------------------- |
| `p1`  | Pre-plan / Analysis   | Initial discovery and analysis        |
| `p2`  | Spec / Planning       | Specification and detailed planning   |
| `p3`  | Plan / Solutioning    | Solution design and architecture      |
| `p4`  | Implementation        | Code, test, and deliver               |

**Example:** `bmad-lens-onboarding-enhancements-small-p1`

### 6. Workflow Branch — `{featureBranchRoot}-{audience}-p{N}-{workflow}`

The most granular branch, representing the active workflow within a phase.

**Example:** `bmad-lens-onboarding-enhancements-small-p1-pre-plan`

---

## Review Audience Progression

<!-- REQ-6: Audience-to-phase mapping -->

Phases map to review audiences as follows:

| Phase | Default Audience | Review Expectation               |
| ----- | ---------------- | -------------------------------- |
| p1    | `small`          | Solo dev, 1 reviewer             |
| p2    | `medium`         | Small team, 2–3 reviewers        |
| p3    | `large`          | Full team, formal gates          |
| p4    | `large`          | Full team, formal gates          |

Early phases use lighter review cycles; later phases require broader team consensus.

---

## Maximum Length Guidance

<!-- REQ-6: Branch name length constraints -->

**Recommended maximum branch name length: 128 characters.**

Most Git hosting platforms support branch names up to 256 characters, but many CLI tools, CI/CD pipelines, and shell prompts become unwieldy beyond 128 characters.

### Staying Under the Limit

A fully-qualified workflow branch can grow long quickly:

```
bmad-lens-onboarding-enhancements-small-p1-pre-plan   (52 chars ✔)
bmad-lens-customer-experience-redesign-2026-large-p4-implementation   (67 chars ✔)
```

If your initiative name is verbose, the full path may approach or exceed 128 characters. Use the tips below to keep names compact.

---

## Tips for Keeping Branch Names Short

<!-- REQ-6: Abbreviation and naming tips -->

1. **Abbreviate initiative names** — Use short, recognisable identifiers instead of full descriptions.
   - `customer-experience-redesign-2026` → `cx-redesign-26`
   - `onboarding-enhancements` → `onboard-enh`

2. **Use standard domain/service abbreviations** — Define short prefixes in your service map.
   - `bmad-lens` is already concise; avoid `bmad-lens-workbench`.

3. **Drop redundant words** — Words like `feature`, `project`, or `update` rarely add clarity.

4. **Prefer hyphens over underscores** — Hyphens are the convention; mixing delimiters wastes characters and causes confusion.

5. **Keep workflow names terse** — `pre-plan`, `spec`, `impl` are preferred over `pre-planning-phase`, `specification-review`, `implementation-and-testing`.

6. **Validate before creating** — Run a quick character count when defining a new initiative:
   ```bash
   echo -n "bmad-lens-cx-redesign-26-large-p4-impl" | wc -c
   # 38 — well within limits
   ```

---

## Quick Reference

```
Pattern:   {domain}-{service}-{initiative}-{audience}-p{N}-{workflow}
Max chars: 128 (recommended)
Audiences: small | medium | large
Phases:    p1 (analysis) | p2 (spec) | p3 (solution) | p4 (implementation)
```

---

*This document is part of the LENS Workbench documentation suite.*
