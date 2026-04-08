---
name: 'step-01-load-skill'
description: 'Load the registered BMAD skill entry for the requested Lens wrapper command'
nextStepFile: './step-02-resolve-context.md'
registryPath: '../../../../assets/lens-bmad-skill-registry.json'
---

# Step 1: Load Skill Registry Entry

**Goal:** Resolve the requested BMAD skill from the Lens wrapper registry so downstream steps can stay generic.

---

## EXECUTION SEQUENCE

### 1. Load The Registry And Requested Skill

```yaml
registry = load("{registryPath}")
requested_skill_id = inputs.skill_id || ""

if requested_skill_id == "":
  FAIL("❌ The Lens BMAD wrapper was invoked without a skill_id.")

skill_entry = first(registry.skills where item.id == requested_skill_id)

if skill_entry == null:
  FAIL("❌ Unknown Lens BMAD skill id `${requested_skill_id}`. Update assets/lens-bmad-skill-registry.json before using this prompt.")

initiative_state = invoke: git-state.current-initiative
current_branch = initiative_state.branch || invoke_command("git symbolic-ref --short HEAD")

output: |
  ✅ Lens BMAD wrapper initialized
  ├── Skill: ${skill_entry.displayName}
  ├── Command: ${skill_entry.command}
  └── Current branch: ${current_branch}
```

---

## NEXT STEP DIRECTIVE

**NEXT:** Read fully and follow: `{nextStepFile}`