"""Tests for light-preflight.py python-cmd detection and caching."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

import pytest

# Import the functions under test directly
_SCRIPT = Path(__file__).resolve().parents[1] / "light-preflight.py"
_SCRIPTS_DIR = str(_SCRIPT.parent)

import importlib.util
spec = importlib.util.spec_from_file_location("light_preflight", _SCRIPT)
preflight = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
spec.loader.exec_module(preflight)  # type: ignore[union-attr]


class TestDetectPythonCmd:
    def test_returns_python3_when_it_resolves_to_current_interpreter(self, tmp_path):
        """python3 alias pointing at sys.executable → returns 'python3'."""
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python3" else None):
            assert preflight.detect_python_cmd() == "python3"

    def test_falls_back_to_python_when_python3_absent(self, tmp_path):
        """No python3 alias but python resolves to sys.executable → returns 'python'."""
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python" else None):
            assert preflight.detect_python_cmd() == "python"

    def test_falls_back_to_sys_executable_when_no_alias_matches(self):
        """Neither alias resolves to sys.executable → returns sys.executable."""
        with mock.patch("shutil.which", return_value=None):
            result = preflight.detect_python_cmd()
        assert result == sys.executable

    def test_prefers_python3_over_python(self):
        """Both aliases resolve to sys.executable → returns 'python3' (checked first)."""
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", return_value=str(exe)):
            assert preflight.detect_python_cmd() == "python3"

    def test_always_returns_a_string(self):
        """detect_python_cmd always returns a non-empty string."""
        with mock.patch("shutil.which", return_value=None):
            result = preflight.detect_python_cmd()
        assert isinstance(result, str)
        assert result  # non-empty


class TestReadWritePythonCmd:
    def test_write_creates_env_yaml(self, tmp_path):
        folder = tmp_path / "personal"
        preflight.write_python_cmd_to_env(folder, "python3")
        env_path = folder / "env.yaml"
        assert env_path.exists()
        assert "python_cmd: python3" in env_path.read_text()

    def test_read_returns_written_value(self, tmp_path):
        folder = tmp_path / "personal"
        preflight.write_python_cmd_to_env(folder, "python3")
        assert preflight.read_python_cmd_from_env(folder) == "python3"

    def test_read_returns_none_when_file_absent(self, tmp_path):
        folder = tmp_path / "personal"
        assert preflight.read_python_cmd_from_env(folder) is None

    def test_write_overwrites_existing_python_cmd(self, tmp_path):
        folder = tmp_path / "personal"
        preflight.write_python_cmd_to_env(folder, "python3")
        preflight.write_python_cmd_to_env(folder, "python")
        assert preflight.read_python_cmd_from_env(folder) == "python"

    def test_write_preserves_other_keys(self, tmp_path):
        folder = tmp_path / "personal"
        folder.mkdir(parents=True, exist_ok=True)
        env_path = folder / "env.yaml"
        env_path.write_text("other_key: some_value\npython_cmd: python3\n")
        preflight.write_python_cmd_to_env(folder, "python")
        content = env_path.read_text()
        assert "other_key: some_value" in content
        assert "python_cmd: python" in content

    def test_write_appends_python_cmd_when_not_present(self, tmp_path):
        folder = tmp_path / "personal"
        folder.mkdir(parents=True, exist_ok=True)
        env_path = folder / "env.yaml"
        env_path.write_text("other_key: some_value\n")
        preflight.write_python_cmd_to_env(folder, "python3")
        content = env_path.read_text()
        assert "other_key: some_value" in content
        assert "python_cmd: python3" in content


class TestEnsurePythonCmdCached:
    def test_skips_detection_when_already_cached(self, tmp_path):
        folder = tmp_path / "personal"
        preflight.write_python_cmd_to_env(folder, "python3")
        with mock.patch.object(preflight, "detect_python_cmd") as mock_detect:
            cmd, was_detected = preflight.ensure_python_cmd_cached(folder)
        mock_detect.assert_not_called()
        assert cmd == "python3"
        assert was_detected is False

    def test_detects_and_caches_when_not_present(self, tmp_path):
        folder = tmp_path / "personal"
        with mock.patch.object(preflight, "detect_python_cmd", return_value="python3"):
            cmd, was_detected = preflight.ensure_python_cmd_cached(folder)
        assert cmd == "python3"
        assert was_detected is True
        assert preflight.read_python_cmd_from_env(folder) == "python3"

    def test_always_returns_a_string(self, tmp_path):
        """ensure_python_cmd_cached always returns a non-empty string."""
        folder = tmp_path / "personal"
        with mock.patch.object(preflight, "detect_python_cmd", return_value=sys.executable):
            cmd, was_detected = preflight.ensure_python_cmd_cached(folder)
        assert isinstance(cmd, str)
        assert cmd


class TestMainPythonCaching:
    def test_main_succeeds_and_caches_python_cmd(self, tmp_path):
        # Create a fake project root with _bmad dir
        (tmp_path / "_bmad").mkdir()
        personal_folder = tmp_path / ".lens" / "personal"
        exe = Path(sys.executable).resolve()

        with (
            mock.patch.object(preflight, "find_project_root", return_value=tmp_path),
            mock.patch.object(preflight, "check_python_version", return_value=(True, "Python 3.12")),
            mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python3" else None),
        ):
            result = preflight.main()

        assert result == 0
        assert preflight.read_python_cmd_from_env(personal_folder) == "python3"

    def test_main_skips_detection_when_cache_exists(self, tmp_path):
        (tmp_path / "_bmad").mkdir()
        personal_folder = tmp_path / ".lens" / "personal"
        preflight.write_python_cmd_to_env(personal_folder, "python")

        with (
            mock.patch.object(preflight, "find_project_root", return_value=tmp_path),
            mock.patch.object(preflight, "check_python_version", return_value=(True, "Python 3.12")),
            mock.patch.object(preflight, "detect_python_cmd") as mock_detect,
        ):
            result = preflight.main()

        assert result == 0
        mock_detect.assert_not_called()
        assert preflight.read_python_cmd_from_env(personal_folder) == "python"

    def test_main_caches_sys_executable_when_no_alias(self, tmp_path):
        """When no short alias matches, falls back to sys.executable."""
        (tmp_path / "_bmad").mkdir()
        personal_folder = tmp_path / ".lens" / "personal"

        with (
            mock.patch.object(preflight, "find_project_root", return_value=tmp_path),
            mock.patch.object(preflight, "check_python_version", return_value=(True, "Python 3.12")),
            mock.patch("shutil.which", return_value=None),
        ):
            result = preflight.main()

        assert result == 0
        cached = preflight.read_python_cmd_from_env(personal_folder)
        assert cached == sys.executable

    def test_main_fails_when_project_root_not_found(self):
        with mock.patch.object(preflight, "find_project_root", return_value=None):
            assert preflight.main() == 1

    def test_main_fails_on_old_python(self, tmp_path):
        (tmp_path / "_bmad").mkdir()
        with (
            mock.patch.object(preflight, "find_project_root", return_value=tmp_path),
            mock.patch.object(preflight, "check_python_version", return_value=(False, "Python 3.11 — requires >= 3.12")),
        ):
            assert preflight.main() == 1

