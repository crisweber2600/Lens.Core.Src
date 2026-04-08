---
name: lens-bmad-skill
description: Resolve Lens context, load a registered BMAD skill, and delegate with governance- and repo-aware guidance.
agent: "@lens"
trigger: /bmad-* prompt
category: utility
phase_name: anytime
display_name: Lens BMAD Wrapper
inputs:
  skill_id:
    description: Registered skill id from assets/lens-bmad-skill-registry.json
    required: true
entryStep: './steps/step-01-load-skill.md'
---

# Lens BMAD Skill Wrapper

**Goal:** Route a Lens prompt to a registered BMAD skill while injecting the active domain, service, feature, governance, and repository context.

**Your Role:** Operate as a thin Lens-aware wrapper. Resolve the current feature context when available, fill in missing domain/service/feature details only when the target skill requires them, then delegate to the registered BMAD skill with explicit write-boundary guidance.

## WORKFLOW ARCHITECTURE

- Step 1 loads the registry entry for the requested BMAD skill.
- Step 2 resolves the active Lens context and computes the recommended output and write scope.
- Step 3 delegates to the downstream BMAD skill with the resolved Lens context.

## EXECUTION

Read fully and follow: `{entryStep}`