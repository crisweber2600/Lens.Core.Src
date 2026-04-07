# PR Description — Artifact Validator

**Type:** Workflow include
**Purpose:** Validate artifact presence and quality before PR creation.
**Updated:** v3.1 — added per-artifact structural validation hooks.

## Usage

This include is referenced by phase-lifecycle and audience-promotion workflows to validate artifacts before creating PRs.

## Artifact Validation Algorithm

### Step 1: Determine Required Artifacts

Read `lifecycle.yaml` → `phases.{current_phase}.artifacts` to get the list of required artifacts.

### Step 2: Check File Existence

For each required artifact, check if the file exists at:
```
_bmad-output/lens-work/initiatives/{domain}/{service}/phases/{phase}/{artifact}.md
```

### Step 3: Check Content Quality

For each existing artifact:
- File size > 0 bytes (non-empty)
- Contains at least one heading (`#`)
- First paragraph extractable for PR summary

### Step 4: Structural Validation (v3.1)

If `lifecycle.yaml` → `artifact_validation.enabled` is true:

For each artifact, read `lifecycle.yaml` → `artifact_validation.validators.{artifact}`:

1. **Required sections check**: Verify all `required_sections` exist as headings in the artifact
2. **Minimum word count**: Verify artifact meets `min_word_count` threshold
3. **Cross-reference check**: If `must_reference` is set, verify the artifact references the listed artifacts (by name or link)
4. **Per-story validation** (stories only): If `each_story_requires` is set, verify each story section contains the required subsections
5. **YAML format validation** (sprint-status only): If `format: yaml`, validate YAML structure and `required_fields`

Constitution overrides: If `constitution_controlled` is true, resolve the effective constitution and apply any `artifact_validator_overrides` capability, which may:
- Add required sections
- Increase minimum word counts
- Add cross-reference requirements
- Add custom validators

### Step 5: Load Template Comparison (v3.1)

If `lifecycle.yaml` → `artifact_templates.enabled` is true:

1. Load the template from `assets/templates/{artifact}-template.md`
2. Check if constitution has an override template
3. Verify artifact covers all template sections (warning, not blocking)
4. Report template coverage percentage in validation output

### Step 6: Report Results

```yaml
validation_result:
  phase: {phase}
  status: PASS | WARN | FAIL
  artifacts:
    - name: product-brief.md
      exists: true
      non_empty: true
      has_heading: true
      structural_validation:
        required_sections: PASS
        min_word_count: PASS (523/200)
        cross_references: N/A
        template_coverage: 85%
    - name: research.md
      exists: true
      non_empty: true
      has_heading: true
      structural_validation:
        required_sections: PASS
        min_word_count: WARN (180/200)
        cross_references: N/A
        template_coverage: 70%
  missing: []
  warnings: ["research.md: word count 180 below minimum 200"]
```

Severity levels:
- **FAIL**: Missing artifact, empty file, or missing required section → blocks PR
- **WARN**: Below word count, low template coverage → included in PR body as advisory
- **PASS**: All checks passed
