"""Tests for lens_python.py — get_python_cmd() helper."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

import importlib.util

_MODULE_PATH = Path(__file__).resolve().parents[1] / "lens_python.py"
spec = importlib.util.spec_from_file_location("lens_python", _MODULE_PATH)
lens_python = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
spec.loader.exec_module(lens_python)  # type: ignore[union-attr]


def _make_env_yaml(folder: Path, cmd: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "env.yaml").write_text(f"python_cmd: {cmd}\n", encoding="utf-8")


class TestGetPythonCmd:
    def test_returns_cached_cmd_from_explicit_personal_folder(self, tmp_path):
        personal = tmp_path / "personal"
        _make_env_yaml(personal, "python3")
        result = lens_python.get_python_cmd(personal_folder=personal)
        assert result == "python3"

    def test_returns_cached_python_from_explicit_folder(self, tmp_path):
        personal = tmp_path / "personal"
        _make_env_yaml(personal, "python")
        result = lens_python.get_python_cmd(personal_folder=personal)
        assert result == "python"

    def test_falls_back_to_project_root_discovery(self, tmp_path):
        # Create a fake project root
        (tmp_path / "_bmad").mkdir()
        personal = tmp_path / ".lens" / "personal"
        _make_env_yaml(personal, "python3")

        with mock.patch.object(lens_python, "_find_project_root", return_value=tmp_path):
            result = lens_python.get_python_cmd()

        assert result == "python3"

    def test_detects_and_caches_when_no_env_yaml(self, tmp_path):
        """When no cache exists, get_python_cmd detects and writes env.yaml."""
        (tmp_path / "_bmad").mkdir()
        exe = Path(sys.executable).resolve()
        env_path = tmp_path / ".lens" / "personal" / "env.yaml"

        with (
            mock.patch.object(lens_python, "_find_project_root", return_value=tmp_path),
            mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python3" else None),
        ):
            result = lens_python.get_python_cmd()

        assert result == "python3"
        # Should have been written to cache
        assert env_path.exists()
        assert "python_cmd: python3" in env_path.read_text()

    def test_detects_python_when_python3_absent(self, tmp_path):
        """Falls back to 'python' when 'python3' doesn't resolve."""
        (tmp_path / "_bmad").mkdir()
        exe = Path(sys.executable).resolve()

        with (
            mock.patch.object(lens_python, "_find_project_root", return_value=tmp_path),
            mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python" else None),
        ):
            result = lens_python.get_python_cmd()

        assert result == "python"

    def test_falls_back_to_sys_executable_when_project_root_not_found(self):
        with (
            mock.patch.object(lens_python, "_find_project_root", return_value=None),
            mock.patch.object(lens_python, "_detect_python_cmd", return_value=sys.executable),
        ):
            result = lens_python.get_python_cmd()
        assert result == sys.executable

    def test_explicit_folder_takes_priority_over_project_root(self, tmp_path):
        # Explicit folder says "python", project root would say "python3"
        explicit = tmp_path / "personal_explicit"
        _make_env_yaml(explicit, "python")

        project_root = tmp_path / "project"
        (project_root / "_bmad").mkdir(parents=True)
        _make_env_yaml(project_root / ".lens" / "personal", "python3")

        with mock.patch.object(lens_python, "_find_project_root", return_value=project_root):
            result = lens_python.get_python_cmd(personal_folder=explicit)

        assert result == "python"

    def test_read_ignores_malformed_env_yaml(self, tmp_path):
        folder = tmp_path / "personal"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "env.yaml").write_text("not_python_cmd: blah\n", encoding="utf-8")
        result = lens_python._read_python_cmd(folder / "env.yaml")
        assert result is None

    def test_read_handles_quoted_values(self, tmp_path):
        folder = tmp_path / "personal"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "env.yaml").write_text('python_cmd: "python3"\n', encoding="utf-8")
        result = lens_python._read_python_cmd(folder / "env.yaml")
        assert result == "python3"

    def test_skips_detection_on_second_call(self, tmp_path):
        """Cache hit: detection is not called again."""
        (tmp_path / "_bmad").mkdir()
        _make_env_yaml(tmp_path / ".lens" / "personal", "python3")

        with (
            mock.patch.object(lens_python, "_find_project_root", return_value=tmp_path),
            mock.patch.object(lens_python, "_detect_python_cmd") as mock_detect,
        ):
            result = lens_python.get_python_cmd()

        assert result == "python3"
        mock_detect.assert_not_called()


class TestDetectPythonCmd:
    def test_returns_python3_when_it_resolves_to_current_interpreter(self):
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python3" else None):
            assert lens_python._detect_python_cmd() == "python3"

    def test_falls_back_to_python_when_python3_absent(self):
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", side_effect=lambda c: str(exe) if c == "python" else None):
            assert lens_python._detect_python_cmd() == "python"

    def test_falls_back_to_sys_executable_when_no_alias_matches(self):
        with mock.patch("shutil.which", return_value=None):
            result = lens_python._detect_python_cmd()
        assert result == sys.executable

    def test_prefers_python3_over_python(self):
        exe = Path(sys.executable).resolve()
        with mock.patch("shutil.which", return_value=str(exe)):
            assert lens_python._detect_python_cmd() == "python3"

    def test_always_returns_a_string(self):
        with mock.patch("shutil.which", return_value=None):
            result = lens_python._detect_python_cmd()
        assert isinstance(result, str) and len(result) > 0


class TestWritePythonCmd:
    def test_write_creates_env_yaml(self, tmp_path):
        env_path = tmp_path / "env.yaml"
        lens_python._write_python_cmd(env_path, "python3")
        assert env_path.exists()
        assert "python_cmd: python3" in env_path.read_text()

    def test_write_overwrites_existing_python_cmd(self, tmp_path):
        env_path = tmp_path / "env.yaml"
        lens_python._write_python_cmd(env_path, "python3")
        lens_python._write_python_cmd(env_path, "python")
        content = env_path.read_text()
        assert "python_cmd: python" in content
        assert "python_cmd: python3" not in content

    def test_write_preserves_other_keys(self, tmp_path):
        env_path = tmp_path / "env.yaml"
        env_path.write_text("other_key: some_value\npython_cmd: python3\n")
        lens_python._write_python_cmd(env_path, "python")
        content = env_path.read_text()
        assert "other_key: some_value" in content
        assert "python_cmd: python\n" in content

    def test_write_appends_when_not_present(self, tmp_path):
        env_path = tmp_path / "env.yaml"
        env_path.write_text("other_key: some_value\n")
        lens_python._write_python_cmd(env_path, "python3")
        content = env_path.read_text()
        assert "other_key: some_value" in content
        assert "python_cmd: python3" in content
