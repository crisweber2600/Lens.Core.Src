# 30 — Lifecycle, Skills, and Prompts

> **Purpose:** The mechanics of the module — how `lifecycle.yaml` drives behavior and how skills, scripts, and prompts fit together.
> **Read time:** 7 minutes.
> **Prerequisites:** [00-orientation.md](00-orientation.md), [10-architecture.md](10-architecture.md), and a look at [20-repository-map.md](20-repository-map.md).
> **Read next:** [40-task-recipes.md](40-task-recipes.md) for concrete edits, or [50-deep-dive-module.md](50-deep-dive-module.md) for axioms and versioning.
> **Read instead:** [60-dependency-map.md](60-dependency-map.md) if your question is about cross-component data flow.

## The lifecycle oracle

File: [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml).

It defines (spot-check the file for the live shape):

- **`schema_version`** — bump **only** for breaking changes to the shape of `lifecycle.yaml` or `feature.yaml`.
- **`fundamental_truths`** / **`design_axioms`** — non-negotiable invariants (see [50-deep-dive-module.md](50-deep-dive-module.md)).
- **`supported_languages`** — gates language-specific constitutions.
- **`lens_hierarchy`** — the 4 constitution levels: `org → domain → service → repo`, additive.
- **`milestones`** — grouping of phases with entry gates (`techplan`, `finalizeplan`, `dev-ready`, `dev-complete`).
- **`phases`** — named units of work with an agent, artifacts, milestone, and `auto_advance_to`.
- **`tracks`** — selectable end-to-end paths: `full`, `feature`, `hotfix`, `spike`, `quickdev`, `express` (confirm in the file; this is subject to change).
- **`validators`** — named checks invoked at gates.
- **`allowed_parallels`**, **`scope_overlap`**, **`content_overlap`** — concurrency / conflict rules.

**Rule of thumb:** if it looks like lifecycle behavior and you can't find it in `lifecycle.yaml`, you are reading the wrong file.

## Skill ↔ script pairing

```
skills/bmad-lens-<name>/SKILL.md          ← CLI doc + routing
skills/bmad-lens-<name>/scripts/<name>-ops.py   ← the implementation
skills/bmad-lens-<name>/scripts/tests/test-<name>-ops.py
```

- `SKILL.md` is **thin** — it documents the skill, lists commands, and routes to `<name>-ops.py`. Keep it free of orchestration logic.
- `<name>-ops.py` is a **PEP 723-headered** Python script (uv-runnable). It is where decisions happen, git operations fire, and YAML state is read/written.
- Tests co-locate under `scripts/tests/`. Run them with `pytest`.

### Examples worth knowing

| Skill | What it does |
|-------|--------------|
| `bmad-lens-feature-yaml` | Read/write canonical `feature.yaml` entries in the governance repo. |
| `bmad-lens-git-state` | Read-only git queries for the 2-branch feature model. |
| `bmad-lens-git-orchestration` | All git writes: branches, commits, pushes, `publish-to-governance`. |
| `bmad-lens-constitution` | Resolve the 4-level constitution stack for a target. |
| `bmad-lens-init-feature` | Create the 2-branch topology + initial `feature.yaml` + PR. |

See [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) for the authoritative list.

## Prompt library

- **Module prompts** live under [_bmad/lens-work/prompts/](../../_bmad/lens-work/prompts/) as `lens-*.prompt.md`.
- **Adapter stubs** mirror them under [.github/prompts/](../../.github/prompts/) so the host IDE can invoke them.
- Every module prompt generally has a matching adapter stub. Drift here is the most common packaging failure.

## Manifest coupling (easy to break, easy to validate)

Four things must stay in sync:

1. Entries in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) under `skills:` / `prompts:`.
2. Rows in [_bmad/lens-work/module-help.csv](../../_bmad/lens-work/module-help.csv).
3. The menu in [_bmad/lens-work/agents/lens.agent.md](../../_bmad/lens-work/agents/lens.agent.md).
4. The actual files on disk under `skills/` and `prompts/`.

If any of these diverge, discovery breaks. Validator: `validate-lens-bmad-registry.py` (see [40-task-recipes.md](40-task-recipes.md)).

## Git-orchestration contract (touches every write path)

Every skill that writes git state follows [.github/instructions/lens-control-repo-git.instructions.md](../../.github/instructions/lens-control-repo-git.instructions.md):

1. `git pull` in the target repo (fail fast on conflicts).
2. Perform the write.
3. `git add` changed files.
4. `git commit -m "[{PHASE}] {featureId} — {description}"`.
5. `git push`.
6. Report the pushed commit SHA and remote ref.

The `bmad-lens-git-orchestration` skill's `publish-to-governance` op is the **only** supported path for writing into a governance repo. Never patch governance files directly.

## Configuration resolution

- [_bmad/config.yaml](../../_bmad/config.yaml) is the project bridge. It points at the authoritative [_bmad/lens-work/bmadconfig.yaml](../../_bmad/lens-work/bmadconfig.yaml).
- Skills read config at activation and expose variables like `{governance_repo}`, `{module_path}`, `{output_folder}`. Never hard-code these paths in scripts or docs.

## Themes and personas

- `bmad-lens-theme` applies persona overlays (e.g. `lex`). Default theme is `default`.
- Themes mutate greeting / tone only; they must not alter phase logic or gate decisions.
