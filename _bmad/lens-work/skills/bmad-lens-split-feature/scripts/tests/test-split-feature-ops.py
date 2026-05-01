#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0", "pyyaml>=6.0"]
# ///
"""Focused regression tests for split-feature-ops.py."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import yaml


TEST_FILE = Path(__file__).resolve()
SKILL_ROOT = TEST_FILE.parents[2]
SCRIPT = SKILL_ROOT / "scripts" / "split-feature-ops.py"


def load_module():
    spec = importlib.util.spec_from_file_location("split_feature_ops", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


split_feature_ops = load_module()


def run_script(args: list[str]) -> tuple[dict, int]:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:  # pragma: no cover
        raise AssertionError(f"Non-JSON output\nstdout={result.stdout}\nstderr={result.stderr}") from exc
    return payload, result.returncode


def write_feature_index(governance_repo: Path, features: list[dict]) -> None:
    (governance_repo / "feature-index.yaml").write_text(
        yaml.safe_dump({"features": features}, sort_keys=False),
        encoding="utf-8",
    )


def make_feature_tree(governance_repo: Path, domain: str, service: str, feature_id: str) -> Path:
    feature_dir = governance_repo / "features" / domain / service / feature_id
    (feature_dir / "stories").mkdir(parents=True, exist_ok=True)
    return feature_dir


def test_normalize_status_rewrites_case_spaces_and_underscores():
    assert split_feature_ops.normalize_status("In Progress") == "in-progress"
    assert split_feature_ops.normalize_status("ready_for_dev") == "ready-for-dev"
    assert split_feature_ops.normalize_status("  QA Review  ") == "qa-review"


def test_extract_statuses_supports_list_format_story_entries():
    payload = split_feature_ops._extract_statuses_from_yaml_str(
        """
stories:
  - id: story-1
    status: In Progress
  - story-2:
      status: ready_for_dev
  - story-3: done
"""
    )

    assert payload == {
        "story-1": "in-progress",
        "story-2": "ready-for-dev",
        "story-3": "done",
    }


def test_validate_split_normalizes_before_in_progress_check(tmp_path: Path):
    sprint_plan = tmp_path / "sprint-plan.yaml"
    sprint_plan.write_text(
        yaml.safe_dump(
            {
                "stories": [
                    {"id": "story-1", "status": "In Progress"},
                    {"id": "story-2", "status": "done"},
                ]
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    payload, code = run_script([
        "validate-split",
        "--sprint-plan-file",
        str(sprint_plan),
        "--story-ids",
        "story-1,story-2",
    ])

    assert code == 1
    assert payload["error"] == "in_progress_stories"
    assert payload["blockers"] == ["story-1"]
    assert payload["eligible"] == ["story-2"]


def test_create_split_feature_fails_fast_on_duplicate_index_entry(tmp_path: Path):
    governance_repo = tmp_path / "governance"
    governance_repo.mkdir()
    write_feature_index(
        governance_repo,
        [
            {
                "id": "auth-mfa",
                "domain": "platform",
                "service": "identity",
                "status": "active",
                "owner": "cweber",
                "summary": "Existing feature",
            }
        ],
    )

    payload, code = run_script([
        "create-split-feature",
        "--governance-repo",
        str(governance_repo),
        "--source-feature-id",
        "auth-login",
        "--source-domain",
        "platform",
        "--source-service",
        "identity",
        "--new-feature-id",
        "auth-mfa",
        "--new-name",
        "MFA Authentication",
        "--track",
        "quickplan",
        "--username",
        "cweber",
    ])

    assert code == 1
    assert payload["error"] == "duplicate_feature"
    assert not (governance_repo / "features" / "platform" / "identity" / "auth-mfa").exists()


def test_move_stories_normalizes_before_in_progress_check(tmp_path: Path):
    governance_repo = tmp_path / "governance"
    source_dir = make_feature_tree(governance_repo, "platform", "identity", "auth-login")
    make_feature_tree(governance_repo, "platform", "identity", "auth-mfa")
    story_path = source_dir / "stories" / "story-1.md"
    story_path.write_text("---\nstatus: in_progress\n---\n", encoding="utf-8")

    payload, code = run_script([
        "move-stories",
        "--governance-repo",
        str(governance_repo),
        "--source-feature-id",
        "auth-login",
        "--source-domain",
        "platform",
        "--source-service",
        "identity",
        "--target-feature-id",
        "auth-mfa",
        "--target-domain",
        "platform",
        "--target-service",
        "identity",
        "--story-ids",
        "story-1",
    ])

    assert code == 1
    assert payload["error"] == "in_progress_stories"
    assert payload["blocked"][0]["id"] == "story-1"
    assert story_path.exists()