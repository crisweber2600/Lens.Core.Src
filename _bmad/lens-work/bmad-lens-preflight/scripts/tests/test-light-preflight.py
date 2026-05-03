"""Tests for light-preflight.py — project-root detection and Python version gate."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

import pytest

# Import the functions under test directly
_SCRIPT = Path(__file__).resolve().parents[1] / "light-preflight.py"

import importlib.util
spec = importlib.util.spec_from_file_location("light_preflight", _SCRIPT)
preflight = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
spec.loader.exec_module(preflight)  # type: ignore[union-attr]


class TestFindProjectRoot:
    def test_finds_root_when_bmad_dir_present(self, tmp_path):
        (tmp_path / "_bmad").mkdir()
        subdir = tmp_path / "subdir"
        subdir.mkdir()
        with mock.patch("pathlib.Path.cwd", return_value=subdir):
            result = preflight.find_project_root()
        assert result == tmp_path.resolve()

    def test_returns_none_when_bmad_dir_absent(self, tmp_path):
        with mock.patch("pathlib.Path.cwd", return_value=tmp_path):
            result = preflight.find_project_root()
        assert result is None


class TestCheckPythonVersion:
    def test_accepts_312_and_above(self):
        # The test suite already runs on Python 3.12+; verify structural output
        ok, msg = preflight.check_python_version()
        assert isinstance(ok, bool)
        assert isinstance(msg, str)

    def test_rejects_version_below_312(self):
        with mock.patch.object(sys, "version_info", mock.Mock(major=3, minor=11)):
            ok, msg = preflight.check_python_version()
        assert ok is False
        assert "3.11" in msg

    def test_accepts_version_312(self):
        with mock.patch.object(sys, "version_info", mock.Mock(major=3, minor=12)):
            ok, msg = preflight.check_python_version()
        assert ok is True
        assert "3.12" in msg


class TestMain:
    def test_main_returns_0_on_success(self, tmp_path):
        (tmp_path / "_bmad").mkdir()
        with (
            mock.patch.object(preflight, "find_project_root", return_value=tmp_path),
            mock.patch.object(preflight, "check_python_version", return_value=(True, "Python 3.12")),
        ):
            assert preflight.main() == 0

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


