"""Tests for validate-phase-artifacts.py story-file compatibility."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


SCRIPT = Path(__file__).parent.parent / "validate-phase-artifacts.py"
LIFECYCLE = Path(__file__).parent.parent.parent / "lifecycle.yaml"


def _run(*args: str):
    return subprocess.run(
        ["uv", "run", "--script", str(SCRIPT), *args],
        capture_output=True,
        text=True,
    )


def _make_docs(tmp_path: Path) -> Path:
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    (docs_root / "sprint-status.yaml").write_text("status: draft\n", encoding="utf-8")
    return docs_root


class TestValidatePhaseArtifactsStoryFiles:
    def test_ignores_batch_input_files_for_phase_completion(self, tmp_path):
        docs_root = _make_docs(tmp_path)
        (docs_root / "techplan-batch-input.md").write_text("# Batch Input\n", encoding="utf-8")

        result = _run(
            "--phase", "techplan",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 1, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "fail"
        assert payload["missing"] == ["architecture"]

    def test_accepts_root_story_key_files(self, tmp_path):
        docs_root = _make_docs(tmp_path)
        (docs_root / "1-2-user-auth.md").write_text("# Story\n", encoding="utf-8")

        result = _run(
            "--phase", "sprintplan",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "pass"

    def test_accepts_stories_subdir_files(self, tmp_path):
        docs_root = _make_docs(tmp_path)
        stories_dir = docs_root / "stories"
        stories_dir.mkdir()
        (stories_dir / "1-3-admin-audit.yaml").write_text("status: ready-for-dev\n", encoding="utf-8")

        result = _run(
            "--phase", "sprintplan",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "pass"

    def test_accepts_legacy_dev_story_files(self, tmp_path):
        docs_root = _make_docs(tmp_path)
        (docs_root / "dev-story-1-4-payments.md").write_text("# Legacy Story\n", encoding="utf-8")

        result = _run(
            "--phase", "sprintplan",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "pass"
