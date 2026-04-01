---
name: 'step-03-review'
description: 'Run inline adversarial review (party mode) on all planning artifacts'
nextStepFile: './step-04-epics-stories.md'
---

# Step 3: Inline Adversarial Review

**Goal:** Run an adversarial review across all planning artifacts using party-mode perspectives. Capture findings in a review report. In express mode, findings are informational — they do not block progress.

---

## EXECUTION SEQUENCE

### 1. Load All Planning Artifacts

```yaml
product_brief = load("${docs_path}/product-brief.md")
prd = load("${docs_path}/prd.md")
architecture = load("${docs_path}/architecture.md")
```

### 2. Run Multi-Perspective Review

Adopt each reviewer perspective in sequence and produce focused findings:

**PM Perspective (John):**
- Is the product brief actionable and buildable?
- Does the PRD have clear, testable requirements?
- Are success criteria measurable?

**Architect Perspective (Winston):**
- Is the architecture sound for the stated requirements?
- Are technical decisions justified?
- Are there obvious scalability or security gaps?

**UX Perspective (Sally):**
- Does the design serve the target audience?
- Are user flows complete?
- Any accessibility or usability concerns?

**QA Perspective (Amelia):**
- Are requirements testable?
- Are edge cases identified?
- Is the scope clear enough to write acceptance criteria?

### 3. Produce Review Report

```yaml
review_report = compile_findings(
  format: "review-report",
  sections: [
    "Review Summary",
    "Findings",
    "Risks Identified",
    "Recommendations"
  ],
  severity_levels: [critical, important, minor, note]
)

save_to: "${docs_path}/review-report.md"

invoke: git-orchestration.commit-artifacts
params:
  file_paths:
    - ${docs_path}/review-report.md
  phase: "ARTIFACT:EXPRESSPLAN:REVIEW"
  initiative: ${initiative_root}
  description: "adversarial review report produced (express — informational)"
```

### 4. Present Findings to User

```
📋 Adversarial Review Complete (Informational)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Critical: {count}
Important: {count}
Minor: {count}
Notes: {count}

{summary of key findings}

Report saved: ${docs_path}/review-report.md

⚠️ Express mode: These findings are informational. Review them and address
   any critical items if you choose, then proceed to epics and stories.

Proceed to story generation? [Y/n]
```

### 5. Optional: Address Critical Findings

If the user wants to address critical findings before continuing:
- Update the relevant artifact(s)
- Re-commit with updated content
- Append "Addressed" note to review report

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`
