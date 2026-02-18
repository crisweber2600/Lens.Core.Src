# Spec Completeness Checklist

Use this checklist when authoring or reviewing agent and workflow specs.

---

## Inputs

- [ ] Required inputs clearly defined
- [ ] Optional inputs listed with defaults
- [ ] Input validation rules documented

## Outputs

- [ ] Output artifacts listed (files, summaries, reports)
- [ ] Output format described
- [ ] Side effects (writes/updates) specified

## Edge Cases

- [ ] Missing or malformed config handled
- [ ] Empty or unknown lens handled
- [ ] Conflicting signals addressed

## State & Persistence

- [ ] Session store updates described
- [ ] Backward compatibility noted (if applicable)
- [ ] Sidecar memory updates included

## Dependencies

- [ ] Required files and directories listed
- [ ] External tools or commands noted
- [ ] Permissions or access constraints documented
