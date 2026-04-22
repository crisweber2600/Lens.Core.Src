# 60 — Dependency Map

> **Purpose:** How skills, scripts, and shared state interact — inputs, outputs, delegations, read/write surfaces.
> **Read time:** 8 minutes (skim) or reference on demand.
> **Prerequisites:** [20-repository-map.md](20-repository-map.md), [30-lifecycle-and-skills.md](30-lifecycle-and-skills.md).
> **Read next:** [50-deep-dive-module.md](50-deep-dive-module.md) if you need axioms/versioning context, or [40-task-recipes.md](40-task-recipes.md) to act.
> **Read instead:** nothing — this is the cross-component reference.

## Component layers

```
┌────────────────────────────────────────────────────────────┐
│ Adapter (.github/ and peers)                               │
│   agents/, prompts/, skills/, instructions/, workflows/    │
└────────────────────────▲───────────────────────────────────┘
                         │ invokes
┌────────────────────────┴───────────────────────────────────┐
│ Module entry points (_bmad/lens-work/)                     │
│   agents/lens.agent.md   prompts/lens-*.prompt.md          │
└────────────────────────▲───────────────────────────────────┘
                         │ routes to
┌────────────────────────┴───────────────────────────────────┐
│ Skills (SKILL.md thin wrappers)                            │
└────────────────────────▲───────────────────────────────────┘
                         │ delegate to
┌────────────────────────┴───────────────────────────────────┐
│ Scripts (<name>-ops.py) — where work happens               │
└───┬──────────────────▲─────────────────────────────▲───────┘
    │ read/write       │ read                        │ shell out
    ▼                  │                             ▼
 YAML state        lifecycle.yaml                 git / gh CLI
 (feature.yaml,    (read-only oracle)
  module.yaml,
  feature-index)
```

## Delegation chains (typical)

| Entry | Skill | Script | Writes |
|-------|-------|--------|--------|
| `/lens-init <feature>` | `bmad-lens-init-feature` | delegates to `bmad-lens-git-orchestration` + `bmad-lens-feature-yaml` | creates control-repo branches, initial `feature.yaml` in governance |
| `/lens-next` | `@lens` agent + `bmad-lens-git-state` | queries git | none (read-only sensing) |
| phase artifact commit | phase-specific skill | `<name>-ops.py` | commits to `{featureId}-plan` |
| approved → governance | `bmad-lens-git-orchestration` `publish-to-governance` op | `git-orchestration-ops.py` | writes approved artifacts to governance `main` |
| constitution resolution | `bmad-lens-constitution` | `constitution-ops.py` | none (resolves in memory) |
| registry validation | — | `validate-lens-bmad-registry.py` | none (reports drift) |

## Shared state: who reads, who writes

| File | Read by | Written by |
|------|---------|-----------|
| [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml) | **every skill that makes a phase-aware decision** | humans via PR; never by skills/scripts |
| [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) | installer, registry validator, `@lens` agent loader | humans via PR when adding/removing skills or prompts |
| [_bmad/lens-work/module-help.csv](../../_bmad/lens-work/module-help.csv) | help / discovery | humans via PR |
| `feature.yaml` (per feature, governance repo) | `bmad-lens-feature-yaml`, `bmad-lens-git-state`, most phase skills | `bmad-lens-feature-yaml` + `publish-to-governance` only |
| `feature-index.yaml` (governance repo) | cross-feature visibility sensing | `bmad-lens-feature-yaml` + publish op |
| constitutions (governance repo) | `bmad-lens-constitution` | humans via PR into governance repo |
| control-repo artifacts (`docs/{domain}/{service}/{featureId}/...`) | phase skills | phase skills on `{featureId}-plan` |

## End-to-end journeys (summaries)

### Full track

1. `/lens-init` → branches + initial `feature.yaml`.
2. `preplan` (Mary/Analyst) → product brief, research, brainstorm artifacts committed to `-plan`.
3. `businessplan` → business plan artifacts.
4. `techplan` → architecture, epics/stories skeletons.
5. **Adversarial review gate** (party mode) → `finalizeplan`.
6. `finalizeplan` → consolidated plan + PR handoff.
7. **Constitution gate** → `dev-ready`.
8. Dev work in target repo(s); tracked by `dev-complete` milestone when all epics merged to `develop`.
9. `/close` — validates `dev-complete` and sets terminal state (`completed` / `abandoned` / `superseded`).

### Express track

- Uses `expressplan` in place of the full techplan chain.
- Still passes through `finalizeplan` and the constitution gate before dev-ready.

### Hotfix track

- Minimal planning; goes straight to a dev branch with a lightweight `feature.yaml`.
- Still must clear the constitution gate for the touched repo.

### Spike track

- Research-only; may terminate at `abandoned` or `superseded` without reaching `dev-ready`.

*(For the authoritative track definitions, read `tracks:` in [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml).)*

## Cross-component matrix (summary)

| Concern | Skill(s) | Supporting script(s) | Shared state touched |
|---------|----------|----------------------|----------------------|
| Git state sensing | `bmad-lens-git-state` | `git-state-ops.py` | branches, PR metadata |
| Git writes + publishing | `bmad-lens-git-orchestration` | `git-orchestration-ops.py` | control repo branches, governance `main` |
| Feature YAML | `bmad-lens-feature-yaml` | `feature-yaml-ops.py` | `feature.yaml`, `feature-index.yaml` |
| Constitution resolution | `bmad-lens-constitution` | `constitution-ops.py` | constitutions in governance |
| Theme overlay | `bmad-lens-theme` | theme-ops | in-memory persona state |
| Feature init | `bmad-lens-init-feature` | init-feature-ops | combines git-orchestration + feature-yaml |
| Target repo provisioning | `bmad-lens-target-repo` | target-repo-ops | GitHub + `TargetProjects/` + governance |
| End-to-end plan pipeline | `bmad-lens-quickplan` | quickplan-ops | orchestrates phase skills |
| Problem logging | `bmad-lens-log-problem` | log-problem-ops | feature artifacts |

## Pitfalls this map helps you avoid

- Calling `publish-to-governance` before `feature.yaml` exists → the op will refuse; create it first.
- Patching `feature.yaml` with a generic file tool — use `bmad-lens-feature-yaml`.
- Putting a phase check inside a script — the check should be a validator entry in `lifecycle.yaml`.
- Assuming `@lens` sees your change immediately — `@lens` loads from `module.yaml` and the agent menu; both must be updated.
