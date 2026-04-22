# 40 — Task Recipes

> **Purpose:** Concrete, copy-pasteable recipes for the most common agent tasks in this repo.
> **Read time:** skim the index, then jump to the one you need (≈2 minutes each).
> **Prerequisites:** [00-orientation.md](00-orientation.md) (the hard rules), plus the tier relevant to your task (20 for file locations, 30 for skill/lifecycle).
> **Read next:** [50-deep-dive-module.md](50-deep-dive-module.md) only if your task needs to change phases/tracks/schema.
> **Read instead:** nothing — this is the "doing" file.

## Before any recipe

1. `cd /home/cweber/github/Lens.Core.Src`
2. `git status` — working tree must be clean.
3. `git pull` — must succeed without conflicts.
4. Create or switch to a feature branch (`git switch -c <feature>`) before editing.

---

## Recipe: add or modify a skill

1. Locate the skill folder: `_bmad/lens-work/skills/bmad-lens-<name>/`.
2. Edit `SKILL.md` for documentation/routing. Keep it thin — no orchestration logic.
3. Edit `scripts/<name>-ops.py` for behavior. Preserve the PEP 723 header.
4. Add/update tests in `scripts/tests/test-<name>-ops.py`.
5. **If adding a new skill:**
   - Register it under `skills:` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml).
   - Add a row to [_bmad/lens-work/module-help.csv](../../_bmad/lens-work/module-help.csv).
   - Add the menu entry in [_bmad/lens-work/agents/lens.agent.md](../../_bmad/lens-work/agents/lens.agent.md).
   - Mirror an adapter wrapper under [.github/skills/](../../.github/skills/).
6. Validate: `uv run _bmad/lens-work/scripts/validate-lens-bmad-registry.py`.
7. Run the skill's tests: `pytest _bmad/lens-work/skills/bmad-lens-<name>/scripts/tests/`.
8. Commit with `[{PHASE}] <featureId> — <description>` and push.

**Common pitfalls:** forgetting the adapter mirror; forgetting `module-help.csv`; putting logic in `SKILL.md` instead of the script.

---

## Recipe: add or modify a prompt

1. Edit or add the module prompt at `_bmad/lens-work/prompts/lens-<name>.prompt.md`.
2. Mirror the adapter stub at `.github/prompts/lens-<name>.prompt.md`.
3. If it is a new prompt: register it under `prompts:` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml), add to `module-help.csv`, and link from `agents/lens.agent.md` if it is a menu command.
4. Validate: `uv run _bmad/lens-work/scripts/validate-lens-bmad-registry.py`.
5. Commit + push.

---

## Recipe: change `lifecycle.yaml`

1. **Before editing:** read [50-deep-dive-module.md](50-deep-dive-module.md) and understand whether your change is additive (safe) or breaking (requires migration + `schema_version` bump).
2. Edit [_bmad/lens-work/lifecycle.yaml](../../_bmad/lens-work/lifecycle.yaml).
3. If breaking: author a `migrate-ops.py` implementation and add a migration entry.
4. Run the schema test suite: `pytest _bmad/lens-work/tests/`.
5. Spot-check at least one skill that reads the affected section.
6. Commit + push.

**Rule:** no phase logic goes into skills or scripts. If the change makes you want to write an `if phase == "techplan"` in a script, reconsider — the behavior probably belongs in `lifecycle.yaml`.

---

## Recipe: add or modify a script

- **Shared / parent-level ops script:** live under [_bmad/lens-work/scripts/](../../_bmad/lens-work/scripts/).
- **Skill-owned script:** live under `skills/bmad-lens-<name>/scripts/`.
- Always include a PEP 723 header.
- Always co-locate tests under `scripts/tests/` with a `test-*.py` name.
- Run the new tests; run the registry validator to ensure nothing broke.

---

## Recipe: run validation & preflight

From the repo root:

```bash
# Registry + manifest alignment
uv run _bmad/lens-work/scripts/validate-lens-bmad-registry.py

# Module preflight (run from the source root, not a sub-workspace)
uv run _bmad/lens-work/scripts/preflight-ops.py

# Unit tests
pytest _bmad/lens-work/
```

If `preflight-ops.py` reports drift between manifests and on-disk files, treat it as blocking — do not promote.

---

## Recipe: trigger or dry-run a release

Promotion is handled by [.github/workflows/promote-to-release.yml](../../.github/workflows/promote-to-release.yml). It runs on PR merge to `main` when changed paths match its trigger set (`_bmad/lens-work/**`, `.github/agents/**`, etc.).

Pre-promotion checklist (local):

- [ ] Registry validator passes.
- [ ] Preflight passes.
- [ ] Unit tests pass.
- [ ] `module_version` in [_bmad/lens-work/module.yaml](../../_bmad/lens-work/module.yaml) has been bumped if any payload changed.
- [ ] If `lifecycle.yaml` shape changed: `schema_version` bumped and a migration is committed.

To dry-run the installer locally:

```bash
node _bmad/lens-work/_module-installer/installer.js --dry-run
```

---

## Recipe: debug a failing preflight or registry check

1. Re-read the failure's first error — validators usually fail at the earliest drift.
2. Typical causes (in order of frequency):
   - Skill on disk but missing from `module.yaml`.
   - Skill in `module.yaml` but not in `module-help.csv`.
   - Prompt in module but no adapter stub.
   - Skill rename not propagated to `agents/lens.agent.md`.
3. Fix the drift. Re-run the validator.
4. If preflight complains about an executable bit or disallowed file, adjust in place rather than suppressing the check.

---

## Recipe: publish approved artifacts to governance

**Never** write governance files with file tools. Always:

```bash
uv run _bmad/lens-work/skills/bmad-lens-git-orchestration/scripts/git-orchestration-ops.py \
  publish-to-governance \
  --governance-repo "$GOVERNANCE_REPO" \
  --control-repo "$CONTROL_REPO" \
  --feature-id "$FEATURE_ID" \
  --phase "$PHASE"
```

Then `cd "$GOVERNANCE_REPO" && git push` if the CLI does not push automatically. See [.github/instructions/lens-control-repo-git.instructions.md](../../.github/instructions/lens-control-repo-git.instructions.md).
