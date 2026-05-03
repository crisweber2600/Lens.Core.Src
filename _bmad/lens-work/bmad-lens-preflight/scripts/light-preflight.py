#!/usr/bin/env python3
"""Frozen preflight gate for prompt stubs.

Exit 0 -> proceed.
Exit 1 -> halt.

Also detects and caches the Python 3 command name (`python3` or `python`) in
`<project-root>/.lens/personal/env.yaml` so that all subsequent Lens tooling
invocations can use the correct command without re-probing.  If `python_cmd` is
already recorded in the file the detection step is skipped entirely.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


ENV_YAML_NAME = "env.yaml"
PERSONAL_SUBDIR = Path(".lens") / "personal"


def find_project_root() -> Path | None:
    current = Path.cwd().resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "_bmad").is_dir():
            return candidate
    return None


def check_python_version() -> tuple[bool, str]:
    major, minor = sys.version_info.major, sys.version_info.minor
    if (major, minor) >= (3, 12):
        return True, f"Python {major}.{minor}"
    return False, f"Python {major}.{minor} — requires >= 3.12"


# ---------------------------------------------------------------------------
# Python command detection + caching
# ---------------------------------------------------------------------------

def _probe_cmd(cmd: str) -> bool:
    """Return True if ``cmd --version`` exits 0 and reports Python 3."""
    if not shutil.which(cmd):
        return False
    try:
        result = subprocess.run(
            [cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0 and "Python 3" in (result.stdout + result.stderr)
    except (OSError, subprocess.TimeoutExpired):
        return False


def detect_python_cmd() -> str | None:
    """Return the first available Python 3 command name, or None."""
    for candidate in ("python3", "python"):
        if _probe_cmd(candidate):
            return candidate
    return None


def read_python_cmd_from_env(personal_folder: Path) -> str | None:
    """Read a cached ``python_cmd`` value from *personal_folder*/env.yaml.

    Uses a simple line scan so no third-party YAML library is needed inside
    this lean preflight script.
    """
    env_path = personal_folder / ENV_YAML_NAME
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


def write_python_cmd_to_env(personal_folder: Path, cmd: str) -> None:
    """Write (or update) ``python_cmd`` in *personal_folder*/env.yaml.

    Preserves any other existing keys in the file; only replaces the
    ``python_cmd`` line (or appends it if absent).
    """
    personal_folder.mkdir(parents=True, exist_ok=True)
    env_path = personal_folder / ENV_YAML_NAME

    new_line = f"python_cmd: {cmd}\n"
    if env_path.exists():
        try:
            lines = env_path.read_text(encoding="utf-8").splitlines(keepends=True)
        except OSError:
            lines = []
        replaced = False
        updated: list[str] = []
        for line in lines:
            if line.strip().startswith("python_cmd:"):
                updated.append(new_line)
                replaced = True
            else:
                updated.append(line)
        if not replaced:
            updated.append(new_line)
        env_path.write_text("".join(updated), encoding="utf-8")
    else:
        env_path.write_text(new_line, encoding="utf-8")


def ensure_python_cmd_cached(personal_folder: Path) -> tuple[str | None, bool]:
    """Return the python command to use and whether it was freshly detected.

    Returns ``(cmd, was_detected)`` where *was_detected* is True if detection
    was run this call (i.e. the cache was empty).  Returns ``(None, True)`` if
    detection found no usable Python 3.
    """
    cached = read_python_cmd_from_env(personal_folder)
    if cached:
        return cached, False

    cmd = detect_python_cmd()
    if cmd:
        write_python_cmd_to_env(personal_folder, cmd)
    return cmd, True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    root = find_project_root()
    if root is None:
        print("[LENS:PREFLIGHT] FAIL — could not locate project root (_bmad not found)", file=sys.stderr)
        return 1

    ok_python, msg = check_python_version()
    if not ok_python:
        print(f"[LENS:PREFLIGHT] FAIL — {msg}", file=sys.stderr)
        return 1

    personal_folder = root / PERSONAL_SUBDIR
    python_cmd, was_detected = ensure_python_cmd_cached(personal_folder)
    if python_cmd is None:
        print(
            "[LENS:PREFLIGHT] WARN — neither `python3` nor `python` found in PATH; "
            "install Python 3 and re-run preflight",
            file=sys.stderr,
        )
    elif was_detected:
        print(f"[LENS:PREFLIGHT] INFO — python_cmd={python_cmd!r} cached in {personal_folder / ENV_YAML_NAME}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
