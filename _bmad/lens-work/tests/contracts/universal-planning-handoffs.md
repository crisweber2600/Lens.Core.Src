# Universal Planning Handoffs Contract

This contract captures the staged planning and wrapper-routing behavior for the Lens lifecycle rollout.

## Scope

- Included: `preplan`, `businessplan`, `techplan`, `devproposal`, `sprintplan`, `quickplan`, and `/dev` handoff behavior.
- Excluded: `expressplan` remains unchanged in this rollout.

## Phase Entry Publication

| Command | Reviewed predecessor published on entry | Current outputs stay staged locally |
|---------|-----------------------------------------|-------------------------------------|
| `/businessplan` | PrePlan set (`product-brief`, `research`, `brainstorm`) | `prd`, `ux-design` |
| `/techplan` | BusinessPlan set (`prd`, `ux-design`) | `architecture` |
| `/devproposal` | TechPlan set (`architecture`) | `epics`, `stories`, `implementation-readiness` |
| `/sprintplan` | DevProposal set (`epics`, `stories`, `implementation-readiness`) | `sprint-status`, story files |
| `/dev` | SprintPlan set (`sprint-status`, story files) | none; implementation begins after publication |

## Wrapper Routing

| Command | Work item | Required Lens wrapper |
|---------|-----------|-----------------------|
| `/preplan` | brainstorming | `bmad-brainstorming` |
| `/preplan` | product brief | `bmad-product-brief` |
| `/preplan` | research | `bmad-domain-research` or `bmad-market-research` or `bmad-technical-research` |
| `/businessplan` | PRD | `bmad-create-prd` |
| `/businessplan` | UX design | `bmad-create-ux-design` |
| `/techplan` | architecture | `bmad-create-architecture` |
| `/devproposal` | epics and stories | `bmad-create-epics-and-stories` |
| `/devproposal` | implementation readiness | `bmad-check-implementation-readiness` |
| `/sprintplan` | sprint planning | `bmad-sprint-planning` |
| `/sprintplan` | story files | `bmad-create-story` |

## Interactive Handoff Boundary

| Command | Interactive confirmation happens | Native workflow owns after delegation | Conductor must not do |
|---------|----------------------------------|---------------------------------------|-----------------------|
| `/businessplan` | Before any publication or artifact writes, after the user chooses `prd`, `ux-design`, or `both` | `bmad-create-prd` or `bmad-create-ux-design` menus, discovery questions, and document authorship | Ask PRD or UX discovery questions itself, or silently continue to the second selected workflow |
| `/techplan` | Before any publication or artifact writes | `bmad-create-architecture` menus, discovery questions, and document authorship | Ask architecture-discovery questions itself or write `architecture.md` before delegation |

If `/businessplan` interactive mode selects `both`, each native workflow runs as a separate handoff. BusinessPlan must ask before launching the second workflow.

The Lens BMAD wrapper is context-only. After delegation it does not continue phase-conductor execution or synthesize downstream planning artifacts on behalf of the delegated workflow.

## Story File Compatibility

The sprint handoff must recognize all currently supported story-file layouts:

- `dev-story-*.md` and `dev-story-*.yaml`
- `{epic}-{story}-{slug}.md` and `{epic}-{story}-{slug}.yaml`
- `stories/{story-id}.md` and `stories/{story-id}.yaml`

If none of these shapes are present for SprintPlan output, `/dev` must halt instead of silently continuing.