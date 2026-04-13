"""Tests for install.py."""
import importlib.util
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


def _load_script_module():
    spec = importlib.util.spec_from_file_location("install_script", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(module)
    return module


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

    def test_help_mentions_opencode(self):
        result = _run("--help")
        combined = result.stdout + result.stderr
        assert "opencode" in combined


class TestArgumentParsing:
    def test_invalid_ide_exits_nonzero(self):
        result = _run("--ide", "not-a-real-ide")
        assert result.returncode != 0

    def test_dry_run_flag_accepted(self):
        result = _run("--dry-run")
        assert result.returncode == 0


class TestOutputDirs:
    def test_install_output_dirs_creates_personal_folder(self, tmp_path):
        module = _load_script_module()
        module._project_root = tmp_path
        module._dry_run = False

        module.install_output_dirs()

        assert (tmp_path / "docs/lens-work/personal").is_dir()
        assert (tmp_path / ".github/lens/personal").is_dir()


# TODO: Test ensure_dir creates directories
# TODO: Test write_file respects --update flag
# TODO: Test GitHub Copilot stub generation produces correct files
