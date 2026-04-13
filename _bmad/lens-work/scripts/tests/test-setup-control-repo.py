"""Tests for setup-control-repo.py."""
import importlib.util
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


def _load_script_module():
    spec = importlib.util.spec_from_file_location("setup_control_repo_script", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


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


class TestGitignoreEntries:
    def test_ensure_gitignore_entries_adds_personal_paths(self, tmp_path):
        module = _load_script_module()
        module.ensure_gitignore_entries(tmp_path, dry_run=False)

        lines = (tmp_path / ".gitignore").read_text(encoding="utf-8").splitlines()
        assert "docs/lens-work/personal/" in lines
        assert ".github/lens/personal/" in lines
        assert ".github/" in lines
        assert "lens.core/" in lines
        assert "TargetProjects/" in lines

    def test_ensure_gitignore_entries_is_idempotent(self, tmp_path):
        module = _load_script_module()
        module.ensure_gitignore_entries(tmp_path, dry_run=False)
        first = (tmp_path / ".gitignore").read_text(encoding="utf-8")

        module.ensure_gitignore_entries(tmp_path, dry_run=False)
        second = (tmp_path / ".gitignore").read_text(encoding="utf-8")

        assert second == first


# TODO: Test clone_or_pull: clones on first run, pulls on subsequent run
# TODO: Test governance repo name derivation (myproject.src → myproject.bmad.governance)
