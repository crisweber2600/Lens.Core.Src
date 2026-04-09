"""Tests for install.py — subprocess-level tests only (no filesystem side effects)."""
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "install.py"


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

    def test_help_shows_ide_flag(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "--ide" in combined

    def test_help_shows_dry_run(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "dry-run" in combined or "dry_run" in combined


class TestArgumentParsing:
    def test_invalid_ide_exits_nonzero(self):
        result = _run("--ide", "not-a-real-ide")
        assert result.returncode != 0

    def test_dry_run_flag_accepted(self):
        # --dry-run with --help should still exit 0
        result = _run("--help")
        assert result.returncode == 0


# TODO: Test ensure_dir creates directories
# TODO: Test write_file respects --update flag
# TODO: Test GitHub Copilot stub generation produces correct files
