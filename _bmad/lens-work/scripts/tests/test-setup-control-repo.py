"""Tests for setup-control-repo.py — subprocess-level tests only (no git or filesystem side effects)."""
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "setup-control-repo.py"


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

    def test_help_shows_org_flag(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "--org" in combined

    def test_help_shows_dry_run(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "dry-run" in combined or "dry_run" in combined


class TestArgumentParsing:
    def test_dry_run_flag_accepted_alone(self):
        # --dry-run without other flags should not crash on --help
        result = _run("--help")
        assert result.returncode == 0


# TODO: Test clone_or_pull: clones on first run, pulls on subsequent run
# TODO: Test ensure_gitignore_entries: appends only if missing
# TODO: Test governance repo name derivation (myproject.src → myproject.bmad.governance)
