---
name: 'step-02-plan'
description: 'Combined business and technical planning — produce product brief, PRD, and architecture in one session'
nextStepFile: './step-03-review.md'
---

# Step 2: Combined Planning Artifacts

**Goal:** Guide the user through producing the three core planning artifacts in a single session: product brief, PRD, and architecture document.

---

## EXECUTION SEQUENCE

### 1. Product Brief

Ask the user for the feature vision. Produce a focused product brief covering:
- **Vision** — What are we building and why?
- **Target Audience** — Who is this for?
- **Success Criteria** — How do we know it worked?
- **Scope** — What's in and what's out?

```yaml
# Use express validator thresholds (relaxed)
artifact = produce_artifact("product-brief", template="express")
save_to: "${docs_path}/product-brief.md"

# Use the repository's configured planning write path for express artifacts.
if session.feature_yaml_context != null and session.feature_yaml_context.enabled == true:
  invoke: git-orchestration.commit-and-publish
  params:
    file_paths:
      - ${docs_path}/product-brief.md
    phase: "ARTIFACT:EXPRESSPLAN:PRODUCT-BRIEF"
    initiative: ${initiative_root}
    description: "product brief produced (express)"
else:
  invoke: git-orchestration.commit-artifacts
  params:
    file_paths:
      - ${docs_path}/product-brief.md
    phase: "ARTIFACT:EXPRESSPLAN:PRODUCT-BRIEF"
    initiative: ${initiative_root}
    description: "product brief produced (express)"
```

### 2. PRD (Product Requirements Document)

Building on the product brief, produce a focused PRD:
- **Overview** — Reference product brief vision
- **Requirements** — Functional requirements (numbered list)
- **Non-Functional Requirements** — Performance, security, reliability considerations
- **Constraints** — Technical and business constraints

```yaml
artifact = produce_artifact("prd", template="express", context=["product-brief"])
save_to: "${docs_path}/prd.md"

# Use the repository's configured planning write path for express artifacts.
if session.feature_yaml_context != null and session.feature_yaml_context.enabled == true:
  invoke: git-orchestration.commit-and-publish
  params:
    file_paths:
      - ${docs_path}/prd.md
    phase: "ARTIFACT:EXPRESSPLAN:PRD"
    initiative: ${initiative_root}
    description: "PRD produced (express)"
else:
  invoke: git-orchestration.commit-artifacts
  params:
    file_paths:
      - ${docs_path}/prd.md
    phase: "ARTIFACT:EXPRESSPLAN:PRD"
    initiative: ${initiative_root}
    description: "PRD produced (express)"
```

### 3. Architecture

Produce a focused architecture document:
- **Overview** — System context and high-level design
- **System Design** — Components, data flow, key decisions
- **Tech Decisions** — Technology choices with rationale
- **Data Model** — Key entities and relationships (if applicable)

```yaml
artifact = produce_artifact("architecture", template="express", context=["product-brief", "prd"])
save_to: "${docs_path}/architecture.md"

# Use the repository's configured planning write path for express artifacts.
if session.feature_yaml_context != null and session.feature_yaml_context.enabled == true:
  invoke: git-orchestration.commit-and-publish
  params:
    file_paths:
      - ${docs_path}/architecture.md
    phase: "ARTIFACT:EXPRESSPLAN:ARCHITECTURE"
    initiative: ${initiative_root}
    description: "architecture produced (express)"
else:
  invoke: git-orchestration.commit-artifacts
  params:
    file_paths:
      - ${docs_path}/architecture.md
    phase: "ARTIFACT:EXPRESSPLAN:ARCHITECTURE"
    initiative: ${initiative_root}
    description: "architecture produced (express)"

session.artifacts_produced = ["product-brief", "prd", "architecture"]
```

### 4. Output Planning Summary

```
✅ Planning Artifacts Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Product Brief  → ${docs_path}/product-brief.md
✓ PRD            → ${docs_path}/prd.md
✓ Architecture   → ${docs_path}/architecture.md

Next: Inline adversarial review of all three artifacts.
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
