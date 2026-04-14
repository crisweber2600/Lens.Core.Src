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
    (docs_root / "finalizeplan-review.md").write_text("# Review\n", encoding="utf-8")
    (docs_root / "epics.md").write_text("# Epics\n", encoding="utf-8")
    (docs_root / "stories.md").write_text("# Stories\n", encoding="utf-8")
    (docs_root / "implementation-readiness.md").write_text("# Ready\n", encoding="utf-8")
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
            "--phase", "finalizeplan",
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
            "--phase", "finalizeplan",
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
            "--phase", "finalizeplan",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "pass"

    def test_completion_review_contract_checks_only_review_inputs(self, tmp_path):
        docs_root = tmp_path / "docs"
        docs_root.mkdir()
        (docs_root / "business-plan.md").write_text("# Business\n", encoding="utf-8")
        (docs_root / "tech-plan.md").write_text("# Tech\n", encoding="utf-8")

        result = _run(
            "--phase", "expressplan",
            "--contract", "completion-review",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["contract"] == "completion-review"
        assert payload["status"] == "pass"

    def test_review_ready_contract_requires_pre_review_outputs(self, tmp_path):
        docs_root = tmp_path / "docs"
        docs_root.mkdir()
        (docs_root / "business-plan.md").write_text("# Business\n", encoding="utf-8")
        (docs_root / "tech-plan.md").write_text("# Tech\n", encoding="utf-8")

        result = _run(
            "--phase", "expressplan",
            "--contract", "review-ready",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 1, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["contract"] == "review-ready"
        assert payload["status"] == "fail"
        assert payload["missing"] == ["sprint-plan"]

    def test_review_ready_contract_accepts_all_pre_review_outputs(self, tmp_path):
        docs_root = tmp_path / "docs"
        docs_root.mkdir()
        (docs_root / "business-plan.md").write_text("# Business\n", encoding="utf-8")
        (docs_root / "tech-plan.md").write_text("# Tech\n", encoding="utf-8")
        (docs_root / "sprint-plan.md").write_text("# Sprint\n", encoding="utf-8")

        result = _run(
            "--phase", "expressplan",
            "--contract", "review-ready",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["contract"] == "review-ready"
        assert payload["status"] == "pass"

    def test_accepts_research_documents_in_research_subdir(self, tmp_path):
        docs_root = tmp_path / "docs"
        docs_root.mkdir()
        (docs_root / "product-brief.md").write_text("# Brief\n", encoding="utf-8")
        (docs_root / "brainstorm.md").write_text("# Brainstorm\n", encoding="utf-8")
        research_dir = docs_root / "research"
        research_dir.mkdir()
        (research_dir / "technical-auth-research-2026-04-14.md").write_text("# Research\n", encoding="utf-8")

        result = _run(
            "--phase", "preplan",
            "--contract", "review-ready",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--json",
        )

        assert result.returncode == 0, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "pass"
        assert payload["misplaced"] == {}

    def test_reports_misplaced_artifacts_in_fallback_root(self, tmp_path):
        docs_root = tmp_path / "feature-docs"
        docs_root.mkdir()
        misplaced_root = tmp_path / "docs" / "planning-artifacts"
        misplaced_root.mkdir(parents=True)
        (misplaced_root / "product-brief.md").write_text("# Brief\n", encoding="utf-8")
        (misplaced_root / "brainstorm.md").write_text("# Brainstorm\n", encoding="utf-8")
        research_dir = misplaced_root / "research"
        research_dir.mkdir()
        (research_dir / "technical-auth-research-2026-04-14.md").write_text("# Research\n", encoding="utf-8")

        result = _run(
            "--phase", "preplan",
            "--contract", "review-ready",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--misplaced-root", str(misplaced_root),
            "--json",
        )

        assert result.returncode == 1, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "fail"
        assert payload["failure_reason"] == "misplaced_artifacts"
        assert payload["misplaced"]["product-brief"][0].endswith("product-brief.md")
        assert payload["misplaced"]["brainstorm"][0].endswith("brainstorm.md")
        assert payload["misplaced"]["research"][0].endswith("technical-auth-research-2026-04-14.md")

    def test_reports_misplaced_artifacts_in_governance_mirror_root(self, tmp_path):
        docs_root = tmp_path / "feature-docs"
        docs_root.mkdir()
        governance_docs = tmp_path / "governance" / "features" / "platform" / "identity" / "auth-refresh" / "docs"
        governance_docs.mkdir(parents=True)
        (governance_docs / "prd.md").write_text("# PRD\n", encoding="utf-8")
        (governance_docs / "ux-design.md").write_text("# UX\n", encoding="utf-8")

        result = _run(
            "--phase", "businessplan",
            "--contract", "review-ready",
            "--lifecycle-path", str(LIFECYCLE),
            "--docs-root", str(docs_root),
            "--misplaced-root", str(governance_docs),
            "--json",
        )

        assert result.returncode == 1, result.stdout + result.stderr
        payload = json.loads(result.stdout)
        assert payload["status"] == "fail"
        assert payload["failure_reason"] == "misplaced_artifacts"
        assert payload["misplaced"]["prd"][0].endswith("prd.md")
        assert payload["misplaced"]["ux-design"][0].endswith("ux-design.md")
