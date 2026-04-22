# 20 — Repository Map

> **Purpose:** Find things fast. Annotated directory structure with authority and role.
> **Read time:** 5 minutes.
> **Prerequisites:** [00-orientation.md](00-orientation.md).
> **Read next:** [30-lifecycle-and-skills.md](30-lifecycle-and-skills.md) to understand how skills/scripts fit together, or [40-task-recipes.md](40-task-recipes.md) if you have a concrete task.
> **Read instead:** [60-dependency-map.md](60-dependency-map.md) if you need the IPO / delegation view rather than the layout.

> **Counts deliberately omitted.** Skill, prompt, and script totals drift. For the live counts, read [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) or run `validate-lens-bmad-registry.py`. See [90-glossary-and-reconciliation.md](90-glossary-and-reconciliation.md).

## Top-level layout

```
Lens.Core.Src/
├── _bmad/                       ← module root (authoritative)
│   ├── config.yaml              ← bridge to lens-work bmadconfig.yaml
│   └── lens-work/               ← THE module (promoted to release)
├── .github/                     ← adapter surface (committed product)
│   ├── agents/                  ← agent definitions for Copilot
│   ├── instructions/            ← runtime rules (e.g. git discipline)
│   ├── prompts/                 ← adapter prompt stubs
│   ├── skills/                  ← adapter skill wrappers
│   └── workflows/               ← CI, incl. promote-to-release.yml
├── docs/                        ← project-level documentation
│   └── agents/                  ← you are here (progressive disclosure)
├── scripts/                     ← parent-level ops scripts
└── TargetProjects/              ← ancillary / historical working area (not promoted)
```

## Inside `_bmad/lens-work/` (the module)

```
_bmad/lens-work/
├── module.yaml                  ← identity + skill/prompt registry
├── lifecycle.yaml               ← THE lifecycle oracle (phases, tracks, gates, axioms)
├── bmadconfig.yaml              ← authoritative module config
├── module-help.csv              ← command discovery (must match skills on disk)
├── README.md
├── TODO.md
├── agents/                      ← @lens agent persona + menu
│   ├── lens.agent.md
│   └── lens.agent.yaml
├── assets/
│   ├── lens-bmad-skill-registry.json
│   └── templates/               ← artifact templates used by skills
├── bmad-lens-work-setup/        ← setup skill bundled at module root
├── docs/                        ← module-internal reference docs
├── prompts/                     ← module prompt library (/lens-* entry points)
├── scripts/                     ← shared ops scripts (non-skill)
├── skills/                      ← THE skill library (each skill = folder)
├── tests/                       ← module-level tests + contracts
└── _module-installer/
    └── installer.js             ← materializes adapter surfaces on install
```

### Skill folder shape (typical)

```
skills/bmad-lens-<name>/
├── SKILL.md                     ← CLI documentation + routing logic
├── scripts/
│   ├── <name>-ops.py            ← the real implementation (PEP 723 headers)
│   └── tests/test-<name>-ops.py ← unit tests
└── (optional) assets, templates
```

**Skill contract:** `SKILL.md` is the thin wrapper. `<name>-ops.py` does the work. Tests live next to the script.

### Prompt convention

- Prompt files live at [_bmad/lens-work/prompts/lens-*.prompt.md](../../_bmad/lens-work/prompts/).
- The matching adapter stub lives at `.github/prompts/lens-*.prompt.md`.
- Both must exist. Misalignment fails the registry validator.

## Inside `.github/` (the adapter)

```
.github/
├── agents/            ← Copilot agent definitions
├── instructions/      ← e.g. lens-control-repo-git.instructions.md
├── prompts/           ← adapter prompt stubs (mirror of module prompts)
├── skills/            ← adapter skill wrappers (mirror of module skills)
├── copilot-instructions.md
└── workflows/
    └── promote-to-release.yml   ← the one that ships the module
```

**Rule:** when you change a module skill or prompt, check whether its adapter mirror needs to move with it. Most of the time, yes.

## Parent-level pieces

- [scripts/](../../scripts/) — parent-level ops scripts (installer helpers, validators).
- [docs/](../../docs/) — project-level docs (the ones you are reading are nested in `agents/`).
- [TargetProjects/](../../TargetProjects/) — ancillary historical / working area; **not promoted**.

## Where live truth lives (cite these, don't memorize numbers)

| What | Source of truth |
|------|-----------------|
| Module version | `module_version` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) |
| Registered skills | `skills:` list in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) |
| Command discovery | [_bmad/lens-work/module-help.csv](../../_bmad/lens-work/module-help.csv) |
| @lens menu | [_bmad/lens-work/agents/lens.agent.md](../../_bmad/lens-work/agents/lens.agent.md) |
| Phases / tracks / gates | [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml) |
| Adapter wrappers | [.github/skills/](../../.github/skills/), [.github/prompts/](../../.github/prompts/) |

If any of these four disagree (registry ↔ csv ↔ agent menu ↔ on-disk files), that is a bug. Run the registry validator. See [40-task-recipes.md](40-task-recipes.md#run-validation--preflight).
