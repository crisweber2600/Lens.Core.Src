"""Tests for preflight.py — subprocess-level tests only (no filesystem side effects)."""
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "preflight.py"


def _run(*args, **kwargs):
    return subprocess.run(
        ["uv", "run", "--script", str(SCRIPT), *args],
        capture_output=True,
        text=True,
        **kwargs,
    )


class TestHelpFlag:
    def test_help_exits_zero(self):
        result = _run("--help")
        assert result.returncode == 0, f"--help should exit 0\nstdout: {result.stdout}\nstderr: {result.stderr}"

    def test_help_contains_usage(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "preflight" in combined.lower() or "usage" in combined.lower()


class TestArgumentParsing:
    def test_unknown_flag_exits_nonzero(self):
        result = _run("--unknown-arg-xyz")
        assert result.returncode != 0

    def test_skip_constitution_flag_accepted(self):
        # --skip-constitution is a valid flag; just verify it is recognized (may fail on env)
        result = _run("--skip-constitution", "--help")
        # --help should override and exit 0 even with additional flags
        assert result.returncode == 0


# TODO: Test version comparison logic (requires monkeypatch or script refactor)
# TODO: Test TTL window calculation
# TODO: Test timestamp freshness check
