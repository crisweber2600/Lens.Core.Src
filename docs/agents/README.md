# Agent Docs — Router

> **Purpose:** Entry point for any AI agent (BMAD/Lens persona or general coding agent) working in `Lens.Core.Src`.
> **Read time:** 30 seconds.
> **Prerequisites:** None.
> **Read next:** [00-orientation.md](00-orientation.md) — always start there.
> **Read instead:** if you already know the repo, jump straight to the task row below.

## What this repo is (one line)

`Lens.Core.Src` is the **source-authoritative** repository for the LENS Workbench BMAD module. Edits here are promoted by CI to `lens.core.release`; the release is what downstream projects install.

## Progressive disclosure — pick the lowest tier that answers your task

| Tier | File | When to read |
|------|------|--------------|
| 00 | [00-orientation.md](00-orientation.md) | **Always first.** Identity, the hard rules, authority domains, what NOT to edit. |
| 10 | [10-architecture.md](10-architecture.md) | You need to understand *why* files are laid out the way they are, or the control/governance/target repo model. |
| 20 | [20-repository-map.md](20-repository-map.md) | You need to find a file or understand what lives where. |
| 30 | [30-lifecycle-and-skills.md](30-lifecycle-and-skills.md) | You are touching a skill, a prompt, a script, or `lifecycle.yaml`. |
| 40 | [40-task-recipes.md](40-task-recipes.md) | You have a concrete task (add skill, change prompt, trigger release, fix preflight). |
| 50 | [50-deep-dive-module.md](50-deep-dive-module.md) | You are designing or refactoring orchestration, phases, tracks, or versioning. |
| 60 | [60-dependency-map.md](60-dependency-map.md) | You need to trace how a skill/script consumes shared state or delegates work. |
| 90 | [90-glossary-and-reconciliation.md](90-glossary-and-reconciliation.md) | You hit an unfamiliar term or conflicting counts between docs. |

## Task → tier quick index

| I want to… | Read in order |
|------------|---------------|
| Understand the repo before any edit | 00 → 10 |
| Add or modify a skill | 00 → 30 → 40 |
| Add or modify a prompt | 00 → 20 → 40 |
| Change `lifecycle.yaml` | 00 → 30 → 50 → 40 |
| Add or modify a script | 00 → 20 → 30 → 40 |
| Trigger a release / understand promotion | 00 → 10 → 40 |
| Debug a failing preflight or registry check | 00 → 40 → 30 |
| Trace how skill X uses shared state | 00 → 60 |
| Reconcile a count or term that disagrees across docs | 90 |

## Hard rules (the three you must never break)

1. **Never edit `lens.core/`** in any downstream workspace. That is a pulled release artifact. Source lives in `_bmad/lens-work/` here.
2. **Never write directly into a governance repo.** All governance writes go through the `publish-to-governance` CLI. See [00-orientation.md](00-orientation.md).
3. **Always `git pull` before reading state and `git push` after committing.** No exceptions. See [.github/instructions/lens-control-repo-git.instructions.md](../../.github/instructions/lens-control-repo-git.instructions.md).
