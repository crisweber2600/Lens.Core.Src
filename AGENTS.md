# LENS Workbench — Codex Agent

This project uses the LENS Workbench module for lifecycle routing and git orchestration.

## Module Reference

- **Module path:** `lens.core/_bmad/lens-work/`
- **Agent definition:** `lens.core/_bmad/lens-work/agents/lens.agent.md`
- **Lifecycle contract:** `lens.core/_bmad/lens-work/lifecycle.yaml`
- **Module config:** `lens.core/_bmad/lens-work/module.yaml`

## Activation

1. LOAD the module config from `lens.core/_bmad/lens-work/module.yaml`
2. LOAD the FULL agent definition from `lens.core/_bmad/lens-work/agents/lens.agent.md`
3. READ its entire contents — this contains the complete agent persona, skills, lifecycle routing, and phase-to-agent mapping
4. LOAD the lifecycle contract from `lens.core/_bmad/lens-work/lifecycle.yaml`
5. FOLLOW every activation step in the agent definition precisely

## Available Commands

See `lens.core/_bmad/lens-work/module-help.csv` for the complete command list.

## Skills (path references)

| Skill | Path |
|-------|------|
| bmad-lens-git-state | `lens.core/_bmad/lens-work/skills/bmad-lens-git-state/SKILL.md` |
| bmad-lens-git-orchestration | `lens.core/_bmad/lens-work/skills/bmad-lens-git-orchestration/SKILL.md` |
| bmad-lens-constitution | `lens.core/_bmad/lens-work/skills/bmad-lens-constitution/SKILL.md` |
| bmad-lens-sensing | `lens.core/_bmad/lens-work/skills/bmad-lens-sensing/SKILL.md` |
| bmad-lens-checklist | `lens.core/_bmad/lens-work/skills/bmad-lens-checklist/SKILL.md` |
