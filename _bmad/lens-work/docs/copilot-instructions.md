<!-- LENS-WORK ADAPTER -->
# LENS Workbench — Copilot Instructions

## Module Reference

This control repo uses the LENS Workbench module from the release payload:

- **Module path:** `bmad.lens.release/_bmad/lens-work/`
- **Lifecycle contract:** `bmad.lens.release/_bmad/lens-work/lifecycle.yaml`
- **Module version:** See `bmad.lens.release/_bmad/lens-work/module.yaml`

## Agent

The `@lens` agent is defined at `.github/agents/bmad-agent-lens-work-lens.agent.md` and references
the module agent at `bmad.lens.release/_bmad/lens-work/agents/lens.agent.md`.

## Skills (by path reference)

| Skill | Path |
|-------|------|
| git-state | `bmad.lens.release/_bmad/lens-work/skills/git-state/SKILL.md` |
| git-orchestration | `bmad.lens.release/_bmad/lens-work/skills/git-orchestration/SKILL.md` |
| constitution | `bmad.lens.release/_bmad/lens-work/skills/constitution/SKILL.md` |
| sensing | `bmad.lens.release/_bmad/lens-work/skills/sensing/SKILL.md` |
| checklist | `bmad.lens.release/_bmad/lens-work/skills/checklist/SKILL.md` |

## Important

- This adapter references module content by path — it NEVER duplicates it
- Do not copy skills, workflows, or lifecycle definitions into `.github/`
- Module updates propagate automatically through path references
<!-- /LENS-WORK ADAPTER -->
