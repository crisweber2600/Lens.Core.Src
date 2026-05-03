"""Resolve the correct Python 3 interpreter command for the current workspace.

Usage::

    from lens_python import get_python_cmd

    cmd = get_python_cmd()           # "python3", "python", or sys.executable path
    subprocess.run([cmd, "script.py", ...])

The value is read from ``<project-root>/.lens/personal/env.yaml`` (written by
``light-preflight.py`` during preflight).  If the file is absent or contains no
``python_cmd`` entry, ``sys.executable`` is returned as a safe fallback so that
callers always use the same interpreter that is already running.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


_ENV_YAML_NAME = "env.yaml"
_PERSONAL_SUBDIR = Path(".lens") / "personal"


def _find_project_root(start: Path | None = None) -> Path | None:
    current = (start or Path.cwd()).resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "_bmad").is_dir():
            return candidate
    return None


def _read_python_cmd(env_path: Path) -> str | None:
    """Parse ``python_cmd`` from a plain env.yaml without a YAML library."""
    if not env_path.exists():
        return None
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("python_cmd:"):
                value = stripped[len("python_cmd:"):].strip().strip("\"'")
                return value if value else None
    except OSError:
        pass
    return None


def get_python_cmd(
    personal_folder: str | os.PathLike[str] | None = None,
) -> str:
    """Return the Python 3 command name configured for this workspace.

    Resolution order:
    1. ``python_cmd`` from *personal_folder*/env.yaml (explicit path).
    2. ``python_cmd`` from ``<project-root>/.lens/personal/env.yaml``
       (auto-discovered by walking up from CWD).
    3. ``sys.executable`` — the interpreter that is currently running.

    The file is written by ``light-preflight.py`` during the preflight step.
    If it has not been run yet, ``sys.executable`` is always safe because it
    points to the very interpreter executing this code.
    """
    if personal_folder is not None:
        cmd = _read_python_cmd(Path(personal_folder) / _ENV_YAML_NAME)
        if cmd:
            return cmd

    root = _find_project_root()
    if root is not None:
        cmd = _read_python_cmd(root / _PERSONAL_SUBDIR / _ENV_YAML_NAME)
        if cmd:
            return cmd

    return sys.executable
