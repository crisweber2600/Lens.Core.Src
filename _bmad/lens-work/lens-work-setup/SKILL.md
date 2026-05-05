---
name: lens-work-setup
description: "Register LENS Workbench module with configuration and help system. Run on first install or module update."
---

# LENS Workbench Setup Skill

This skill registers the `lens` module into the host BMAD configuration. Run it after first install or after a module update.

## Prerequisites

- A resolved `PYTHON` interpreter with required Python dependencies installed
- The target BMAD configuration directory (`{project-root}/lens.core/_bmad/_config/`) must exist
- The host `{project-root}/lens.core/_bmad/_config/manifest.yaml` or equivalent config file must exist

## Setup Workflow

### Step 1: Merge Module Configuration

Run the config merge script to register the lens module in the host BMAD configuration:

```bash
$PYTHON {project-root}/lens.core/_bmad/lens-work/lens-work-setup/scripts/merge-config.py --module-yaml {project-root}/lens.core/_bmad/lens-work/lens-work-setup/assets/module.yaml --target-config {project-root}/lens.core/_bmad/_config/manifest.yaml
```

This uses the **anti-zombie pattern**: removes any existing `lens` section first, then writes the current values. This ensures clean upgrades without leftover stale entries.

### Step 2: Merge Help CSV

Run the help CSV merge script to register lens capabilities in the host help system:

```bash
$PYTHON {project-root}/lens.core/_bmad/lens-work/lens-work-setup/scripts/merge-help-csv.py --module-csv {project-root}/lens.core/_bmad/lens-work/lens-work-setup/assets/module-help.csv --target-csv {project-root}/lens.core/_bmad/_config/bmad-help.csv
```

This also uses the anti-zombie pattern: removes all existing `Lens` rows, then appends the current rows.

### Step 3: Verify Installation

After merging, verify the installation:

1. Check that `lens` appears in the host config manifest
2. Check that lens help entries appear in the merged help CSV
3. Run `/help` to confirm commands are discoverable

### Step 4: Cleanup Legacy (Optional)

If upgrading from a previous version, run the cleanup script to remove legacy artifacts:

```bash
$PYTHON {project-root}/lens.core/_bmad/lens-work/lens-work-setup/scripts/cleanup-legacy.py --module-dir {project-root}/lens.core/_bmad/lens-work
```

This safely removes:
- Old flat skill files (`skills/*.md` at the root level, not in subdirectories)
- Legacy `data/` directories that have been renamed to `resources/`
- Other deprecated file patterns

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Python dependency missing | Install the missing package directly into the active interpreter (for example `$PYTHON -m pip install pytest` when running tests); released builds do not ship `requirements-dev.txt` |
| Config file not found | Verify `{project-root}/lens.core/_bmad/_config/` exists and contains the expected files |
| Permission denied | Check file permissions on the target config directory |
