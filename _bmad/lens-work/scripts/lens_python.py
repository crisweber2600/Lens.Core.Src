"""Resolve the correct Python 3 interpreter command for the current workspace.

Usage::

    from lens_python import get_python_cmd

    cmd = get_python_cmd()           # "python3", "python", or sys.executable path
    subprocess.run([cmd, "script.py", ...])

The value is read from ``<project-root>/.lens/personal/env.yaml``.  When no
cached value exists the command is auto-detected (by comparing ``shutil.which``
results against ``sys.executable``) and written to the cache so that subsequent
calls skip detection.
"""

from __future__ import annotations

import os
import shutil
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


def _write_python_cmd(env_path: Path, cmd: str) -> None:
    """Write or update ``python_cmd`` in *env_path*, preserving other keys."""
    env_path.parent.mkdir(parents=True, exist_ok=True)
    new_line = f"python_cmd: {cmd}\n"
    if env_path.exists():
        try:
            lines = env_path.read_text(encoding="utf-8").splitlines(keepends=True)
        except OSError:
            lines = []
        replaced = False
        updated: list[str] = []
        for line in lines:
            if line.lstrip().startswith("python_cmd:"):
                updated.append(new_line)
                replaced = True
            else:
                updated.append(line)
        if not replaced:
            updated.append(new_line)
        env_path.write_text("".join(updated), encoding="utf-8")
    else:
        env_path.write_text(new_line, encoding="utf-8")


def _detect_python_cmd() -> str:
    """Detect the Python 3 command for this interpreter without spawning a subprocess.

    Compares ``shutil.which`` results for ``python3`` and ``python`` against the
    resolved path of ``sys.executable``.  Falls back to the full path of
    ``sys.executable`` if neither alias matches — always correct.
    """
    executable = Path(sys.executable).resolve()
    for candidate in ("python3", "python"):
        found = shutil.which(candidate)
        if found and Path(found).resolve() == executable:
            return candidate
    return sys.executable


def get_python_cmd(
    personal_folder: str | os.PathLike[str] | None = None,
) -> str:
    """Return the Python 3 command name configured for this workspace.

    Resolution order:
    1. ``python_cmd`` from *personal_folder*/env.yaml (explicit path).
    2. ``python_cmd`` from ``<project-root>/.lens/personal/env.yaml``
       (auto-discovered by walking up from CWD).
    3. Auto-detect via ``shutil.which`` comparison and write the result to the
       project-root cache so subsequent calls skip detection.

    The cache is written by the preflight skill agent on first setup, but this
    function will also populate it on first call if it is absent — so callers
    always receive a usable command even before preflight has been run.
    """
    if personal_folder is not None:
        cmd = _read_python_cmd(Path(personal_folder) / _ENV_YAML_NAME)
        if cmd:
            return cmd

    root = _find_project_root()
    if root is not None:
        env_path = root / _PERSONAL_SUBDIR / _ENV_YAML_NAME
        cmd = _read_python_cmd(env_path)
        if cmd:
            return cmd
        # Cache miss — detect and write so future calls are instant.
        cmd = _detect_python_cmd()
        try:
            _write_python_cmd(env_path, cmd)
        except OSError:
            pass
        return cmd

    return _detect_python_cmd()
