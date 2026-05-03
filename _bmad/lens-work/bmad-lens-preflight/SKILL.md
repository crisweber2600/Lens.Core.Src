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
| `scripts/light-preflight.py` | Check prerequisites (git, config files) before governance setup. Detects and caches the Python 3 command in `.lens/personal/env.yaml`. Accepts `--caller <name>` and `--governance-path <path>`. |

## Usage

```bash
python3 ./_bmad/lens-work/bmad-lens-preflight/scripts/light-preflight.py [--caller <name>] [--governance-path <path>]
```

> **Note:** If `python3` is not available on your system (e.g. Windows), use `python` instead.

## Python Command Detection and Caching

On first run, the preflight script probes `python3` then `python` to determine which command resolves to Python 3, and writes the result to:

```
<project-root>/.lens/personal/env.yaml
```

Example file content:

```yaml
python_cmd: python3
```

On subsequent runs, if `python_cmd` is already present in `env.yaml`, the detection step is skipped.

Other Lens scripts can read this cached value using the shared helper:

```python
from lens_python import get_python_cmd

cmd = get_python_cmd()  # returns "python3", "python", or sys.executable
subprocess.run([cmd, "some-script.py", ...])
```

The `.lens/personal/` directory is local-only and excluded from version control.

