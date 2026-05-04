---
name: lens-preflight
description: "Public lightweight preflight runner for workspace validation before governance operations."
classification: utility
---

# Preflight

## Overview

This is a public utility skill.

It provides `scripts/light-preflight.py` — a prompt-start wrapper that performs a fast root/Python gate, accepts the public preflight arguments, and delegates to `scripts/preflight.py` for full workspace sync and validation.

Invoke this skill via the Lens preflight command flow.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/light-preflight.py` | Prompt-start wrapper for the full preflight sync. Accepts `--caller <name>`, `--governance-path <path>`, and `--skip-constitution`. |
| `scripts/preflight.py` | Full workspace preflight: authority repo sync, governance sync, version checks, prompt sync, and prompt hygiene. |

## Usage

```bash
uv run --script lens.core/_bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py [--caller <name>] [--governance-path <path>]
```

From a source-repo root such as `TargetProjects/lens-dev/new-codebase/lens.core.src`:

```bash
uv run --script _bmad/lens-work/skills/lens-preflight/scripts/light-preflight.py [--caller <name>] [--governance-path <path>]
```
