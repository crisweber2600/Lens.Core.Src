# 50 — Deep Dive: Module Internals

> **Purpose:** Design axioms, repository topology, phases, versioning, and migration strategy.
> **Read time:** 10 minutes.
> **Prerequisites:** [00-orientation.md](00-orientation.md), [10-architecture.md](10-architecture.md), [30-lifecycle-and-skills.md](30-lifecycle-and-skills.md).
> **Read next:** [60-dependency-map.md](60-dependency-map.md) for the IPO/delegation view.
> **Read instead:** [40-task-recipes.md](40-task-recipes.md) if you just need to make an edit.

## Fundamental truths (from `lifecycle.yaml`)

- **FT1:** Planning artifacts must exist and be reviewed before code is written.
- **FT2:** AI agents must work within disciplined constraints, not freestyle.
- **FT3:** Multi-service initiatives must have coordinated lifecycle governance.

## Design axioms

- **A1:** Git is the only source of truth for shared workflow state. No git-ignored runtime state.
- **A2:** PRs are the only gating mechanism. No side-channel approval.
- **A3:** Authority domains must be explicit. Every file belongs to exactly one authority.
- **A4:** Sensing must be automatic at lifecycle gates, not manual discovery.
- **A5:** The control repo is an operational workspace, not a code repo.

*(Re-read [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml) for the authoritative text; these are quoted as of v4.)*

## Repository topology

| Repo | Branching | Writes allowed by |
|------|-----------|-------------------|
| **Source** (`Lens.Core.Src`) | `main` via PR | Humans + agents in this repo. |
| **Release** (`lens.core.release`) | Release branches (alpha/beta/stable) | Promotion CI only. |
| **Control** (per initiative) | `{featureId}` + `{featureId}-plan` (+ optional `-dev-{user}`) | `@lens` agent + humans during feature work. |
| **Governance** (the registry repo) | `main` only | `publish-to-governance` CLI only. |
| **Target** (the product repo a feature modifies) | Project-defined | Dev work after `dev-ready`. |

## Lens hierarchy

```
org  →  domain  →  service  →  repo
```

- Constitutions are **additive** across levels.
- Language-specific constitutions apply only when the repo's declared language matches a value in `supported_languages`.
- Language detection order: explicit `{language}` in initiative config → `.bmad/language` file → build files (e.g. `package.json`, `pyproject.toml`) → file extension distribution → GitHub primary language → `"unknown"`.

## Milestones and phases

Milestones group phases and carry entry gates. From [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml):

| Milestone | Phases | Entry gate |
|-----------|--------|------------|
| `techplan` | `preplan`, `businessplan`, `techplan` | — |
| `finalizeplan` | `finalizeplan` | `adversarial-review` (party mode) |
| `dev-ready` | — | `constitution-gate` |
| `dev-complete` (optional) | — | `dev-complete-validation` |

Each **phase** declares:

- an owning `agent` + role (e.g. `mary` / Analyst for `preplan`),
- `artifacts` it produces,
- a `milestone`,
- an `auto_advance_to` pointing at the next command/phase.

The express flow uses `expressplan` in place of the full `preplan → businessplan → techplan` chain.

## Tracks (end-to-end paths)

Declared under `tracks:` in `lifecycle.yaml`:

- `full` — everything: preplan → businessplan → techplan → finalizeplan → dev.
- `feature` — feature-scoped path.
- `hotfix` — minimal, urgent fix path.
- `spike` — research/exploration path.
- `quickdev` — lean dev path.
- `express` — condensed planning via `expressplan`.

Exact ordering and gates are in the file. Don't memorize; read.

## Versioning (three distinct numbers)

| Version | Lives in | Bump when |
|---------|----------|-----------|
| `module_version` | [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) | Any payload change (skill, prompt, script, template, docs included in release). |
| `schema_version` (in `lifecycle.yaml`) | [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml) | **Only** breaking changes to the shape of `lifecycle.yaml` or `feature.yaml`. Requires a migration. |
| `lifecycle_version` / `initiative_state_schema` | referenced in `lifecycle.yaml` | When the initiative-state schema changes. |

### Migration path (breaking change to schema)

1. Update the schema in `lifecycle.yaml` and bump `schema_version`.
2. Implement a `migrate-ops.py` under the relevant skill's scripts folder.
3. Register the migration (entry in `lifecycle.yaml`'s migrations block, per existing pattern).
4. Author tests that walk an artifact from the previous schema to the new one.
5. Document the change in release notes for the promotion PR.

## Design decisions to respect

- **No runtime database.** Anything you need to persist belongs in a committed YAML file.
- **No parallel side-channel.** PRs are how approvals happen. Do not add a "skip PR" option.
- **Constitutions are resolved, not copied.** The `bmad-lens-constitution` skill composes them at invocation time — don't cache a frozen copy in a script.
- **Sensing is automatic.** If a validator needs to run at a gate, wire it into `lifecycle.yaml`'s `validators:` block; don't rely on the agent to remember.

## Contributor checklist for module changes

- [ ] Skill(s) + script(s) edited; tests updated.
- [ ] Adapter mirror updated if applicable.
- [ ] Manifests aligned (`module.yaml`, `module-help.csv`, `lens.agent.md`).
- [ ] `module_version` bumped.
- [ ] `schema_version` bumped + migration authored, **only if** schema shape changed.
- [ ] Registry validator + preflight + tests all green.
- [ ] Commit message follows `[{PHASE}] {featureId} — {description}`.
- [ ] Pushed to remote.
