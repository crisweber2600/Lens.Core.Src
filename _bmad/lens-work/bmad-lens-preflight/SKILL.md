---
name: bmad-lens-preflight
description: "Public lightweight preflight runner for workspace validation before governance operations."
classification: utility
---

# Preflight

## Overview

This is a public utility skill.

It provides `scripts/light-preflight.py` — a lightweight preflight check script used to validate workspace state before governance repo setup.

Invoke this skill via the Lens preflight command flow.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/light-preflight.py` | Gate check: verifies Python >= 3.12 and project root exists. Accepts `--caller <name>` and `--governance-path <path>`. |

## Usage

```bash
python3 ./_bmad/lens-work/bmad-lens-preflight/scripts/light-preflight.py [--caller <name>] [--governance-path <path>]
```

> **Note:** Replace `python3` with the command determined in the **Python Command Detection** step below.

## Python Command Detection and Caching (Agent Steps)

The agent **must** detect and cache the Python command before invoking any Lens
Python script.  This is done at the agent level — not inside Python — so there
is no chicken-and-egg problem.

### Step 1 — Check the cache

Read `<project-root>/.lens/personal/env.yaml`.  If it contains a `python_cmd`
entry, use that value for all subsequent Python invocations and **skip to
Step 4**.

```yaml
# Example cached value
python_cmd: python3
```

### Step 2 — Detect the working Python 3 command

Run each candidate in order, stopping at the first that succeeds:

| Command | Test | Accept if… |
|---------|------|-----------|
| `python3 --version` | Exits 0 | Output contains `Python 3` |
| `python --version` | Exits 0 | Output contains `Python 3` |

If **neither** command works, report an error and stop — Python 3 must be
installed before Lens tooling can run.

### Step 3 — Write the result to the cache

Create `<project-root>/.lens/personal/env.yaml` (and any missing parent
directories) and write or update the `python_cmd` key, preserving any other
existing keys:

```yaml
python_cmd: python3   # replace with python if that was the working command
```

The `.lens/personal/` directory is excluded from version control via
`.gitignore`.

### Step 4 — Use the command

Use the detected or cached command for all subsequent Python invocations in
this session, for example:

```bash
python3 ./_bmad/lens-work/bmad-lens-preflight/scripts/light-preflight.py
```

Other Lens scripts can read the cached value programmatically using the shared
helper:

```python
from lens_python import get_python_cmd

cmd = get_python_cmd()  # returns "python3", "python", or sys.executable fallback
subprocess.run([cmd, "some-script.py", ...])
```


