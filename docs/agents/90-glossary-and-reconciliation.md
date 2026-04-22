# 90 — Glossary and Reconciliation

> **Purpose:** One-stop reference for terms and the places where older docs disagree with current state.
> **Read time:** 2 minutes (lookup).
> **Prerequisites:** none.
> **Read next:** whichever tier your lookup sends you to.
> **Read instead:** nothing.

## Glossary

| Term | Meaning |
|------|---------|
| **Source repo** | `Lens.Core.Src` — this repository. Authors and validates the module. |
| **Release repo** | `lens.core.release` — the promoted, versioned distribution. Consumers install from here. |
| **Control repo** | The operational workspace where a feature lives (2 branches per feature). Not a code repo. |
| **Governance repo** | The canonical registry repo. Holds `feature.yaml`, `feature-index.yaml`, constitutions. `main` only. |
| **Target repo** | The actual product repo a feature ultimately modifies. |
| **Module** | The payload under `_bmad/lens-work/` — skills, prompts, scripts, `lifecycle.yaml`, `module.yaml`. |
| **Adapter surface** | Host-specific wrappers under `.github/` (plus `.claude/`, `.codex/`, `.cursor/` in the release). |
| **Skill** | A capability packaged as `SKILL.md` + a script under `skills/bmad-lens-<name>/`. |
| **Prompt** | A user-facing `/lens-*` entry point under `_bmad/lens-work/prompts/`, mirrored in `.github/prompts/`. |
| **Phase** | A named unit of work in `lifecycle.yaml` (e.g. `preplan`, `techplan`, `finalizeplan`). |
| **Milestone** | A group of phases with an entry gate (`techplan`, `finalizeplan`, `dev-ready`, `dev-complete`). |
| **Track** | An end-to-end path through phases (`full`, `feature`, `hotfix`, `spike`, `quickdev`, `express`). |
| **Gate** | A promotion checkpoint enforced by PR + validator (e.g. `adversarial-review`, `constitution-gate`). |
| **Constitution** | A YAML rules file at one of the 4 hierarchy levels (`org`, `domain`, `service`, `repo`). Additive. |
| **Plan PR** | The PR from `{featureId}-plan` into `{featureId}` that ratifies planning artifacts. |
| **Publish-to-governance** | The only approved mechanism for writing governance files. Runs via `bmad-lens-git-orchestration`. |
| **Preflight** | Local validation that the source is promotable (`preflight-ops.py`). |
| **Registry validator** | `validate-lens-bmad-registry.py` — checks `module.yaml` ↔ `module-help.csv` ↔ agent menu ↔ on-disk files. |
| **`@lens` agent** | The orchestrating persona defined in `_bmad/lens-work/agents/lens.agent.md`. |
| **IPO catalog** | Input-Process-Output catalog of a component. See [60-dependency-map.md](60-dependency-map.md). |

## Reconciliation — where older docs disagree

This doc set was synthesized from two source sets that disagree on some counts. **Do not memorize any count from any doc.** Treat the live files as truth:

| Disputed claim | Truth source |
|----------------|--------------|
| Number of skills | `skills:` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) and on disk under [_bmad/lens-work/skills/](../../_bmad/lens-work/skills/). Validate with `validate-lens-bmad-registry.py`. |
| Number of module prompts | `prompts:` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) and on-disk under [_bmad/lens-work/prompts/](../../_bmad/lens-work/prompts/). |
| Number of adapter prompt stubs | on-disk count under [.github/prompts/](../../.github/prompts/). |
| Number of scripts | on-disk under [_bmad/lens-work/scripts/](../../_bmad/lens-work/scripts/) plus per-skill `scripts/` folders. |
| Number of tests | on-disk under [_bmad/lens-work/tests/](../../_bmad/lens-work/tests/) plus skill `scripts/tests/` folders. |
| Module version | `module_version` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml). |
| Adapter targets | Release model: `.github/`, `.claude/`, `.codex/`, `.cursor/`. In this source repo only `.github/` is checked in; the others are materialized by the installer at release time. |
| Architecture layer count | 3 layers: *adapter surfaces → module source → release distribution*. Older docs that say "4 layers" were counting the CI/CD packaging as a layer; it is a process, not a layer. |
| "Phase" naming | Canonical names come from `phases:` in [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml). |

## Where to go next

- Need the hard rules? → [00-orientation.md](00-orientation.md).
- Need to edit something? → [40-task-recipes.md](40-task-recipes.md).
- Need to understand *why*? → [10-architecture.md](10-architecture.md) and [50-deep-dive-module.md](50-deep-dive-module.md).
