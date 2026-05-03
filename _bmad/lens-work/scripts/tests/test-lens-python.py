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

    def test_falls_back_to_sys_executable_when_no_env_yaml(self, tmp_path):
        with mock.patch.object(lens_python, "_find_project_root", return_value=tmp_path):
            result = lens_python.get_python_cmd()
        assert result == sys.executable

    def test_falls_back_to_sys_executable_when_project_root_not_found(self):
        with mock.patch.object(lens_python, "_find_project_root", return_value=None):
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
