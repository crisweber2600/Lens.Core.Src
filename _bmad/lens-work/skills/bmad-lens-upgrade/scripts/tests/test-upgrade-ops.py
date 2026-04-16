#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Tests for upgrade-ops.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml


SCRIPT = str(Path(__file__).parent.parent / "upgrade-ops.py")


def run(args: list[str]) -> tuple[dict, int]:
    result = subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)
    try:
        return json.loads(result.stdout), result.returncode
    except json.JSONDecodeError as exc:
        raise AssertionError(f"Failed to decode JSON output:\nstdout={result.stdout}\nstderr={result.stderr}") from exc


def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        yaml.dump(data, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def make_fixture(tmp: Path) -> tuple[Path, Path]:
    project_root = tmp / "workspace"
    governance_repo = tmp / "governance"

    write_text(project_root / ".lens" / "LENS_VERSION", "4.0.0\n")
    write_yaml(
        project_root / ".lens" / "governance-setup.yaml",
        {"governance_repo_path": str(governance_repo)},
    )
    write_yaml(
        project_root / ".lens" / "personal" / "context.yaml",
        {
            "domain": "platform",
            "service": "identity",
            "updated_at": "2026-04-16T00:00:00Z",
            "updated_by": "new-service",
        },
    )
    write_yaml(
        project_root / ".lens" / "personal" / "profile.yaml",
        {
            "name": "cweber",
            "primary_role": "planner",
            "domain": "platform",
        },
    )

    write_yaml(
        governance_repo / "feature-index.yaml",
        {
            "features": [
                {
                    "id": "auth-refresh",
                    "domain": "platform",
                    "service": "identity",
                    "status": "businessplan",
                    "owner": "cweber",
                    "plan_branch": "auth-refresh-plan",
                }
            ]
        },
    )
    write_yaml(
        governance_repo / "features" / "platform" / "domain.yaml",
        {
            "kind": "domain",
            "id": "platform",
            "name": "Platform",
            "domain": "platform",
            "status": "active",
            "owner": "cweber",
        },
    )
    write_yaml(
        governance_repo / "features" / "platform" / "identity" / "service.yaml",
        {
            "kind": "service",
            "id": "platform-identity",
            "name": "Identity",
            "domain": "platform",
            "service": "identity",
            "status": "active",
            "owner": "cweber",
        },
    )
    write_yaml(
        governance_repo / "features" / "platform" / "identity" / "auth-refresh" / "feature.yaml",
        {
            "name": "Auth Refresh",
            "description": "",
            "featureId": "auth-refresh",
            "domain": "platform",
            "service": "identity",
            "phase": "businessplan",
            "track": "quickplan",
            "milestones": {
                "businessplan": "2026-04-15T00:00:00Z",
                "techplan": None,
                "finalizeplan": None,
                "dev-ready": None,
                "dev-complete": None,
            },
            "docs": {
                "path": "docs/platform/identity/auth-refresh",
                "governance_docs_path": "features/platform/identity/auth-refresh/docs",
            },
        },
    )
    write_text(
        governance_repo / "features" / "platform" / "identity" / "auth-refresh" / "summary.md",
        "# Auth Refresh\n",
    )

    return project_root, governance_repo


def test_dry_run_reports_v5_upgrade_plan_without_writing():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_fixture(Path(tmp_dir))

        result, code = run([
            "--project-root",
            str(project_root),
            "--governance-repo",
            str(governance_repo),
            "--from",
            "4",
            "--to",
            "5",
            "--dry-run",
        ])

        assert code == 0
        assert result["status"] == "pass"
        assert result["dry_run"] is True
        assert any("feature-index.yaml -> milestone-index.yaml" in op for op in result["governance_operations"])
        assert any("context.yaml" in op for op in result["local_operations"])
        assert (governance_repo / "feature-index.yaml").exists()
        assert not (governance_repo / "milestone-index.yaml").exists()
        context = yaml.safe_load((project_root / ".lens" / "personal" / "context.yaml").read_text(encoding="utf-8"))
        assert "domain" in context
        assert "workstream" not in context


def test_apply_rewrites_local_and_governance_schema():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_fixture(Path(tmp_dir))

        result, code = run([
            "--project-root",
            str(project_root),
            "--governance-repo",
            str(governance_repo),
            "--from",
            "4",
            "--to",
            "5",
        ])

        assert code == 0
        assert result["status"] == "pass"

        assert (project_root / ".lens" / "LENS_VERSION").read_text(encoding="utf-8") == "5.0.0\n"

        context = yaml.safe_load((project_root / ".lens" / "personal" / "context.yaml").read_text(encoding="utf-8"))
        assert context["workstream"] == "platform"
        assert context["project"] == "identity"
        assert "domain" not in context
        assert context["updated_by"] == "new-project"

        profile = yaml.safe_load((project_root / ".lens" / "personal" / "profile.yaml").read_text(encoding="utf-8"))
        assert profile["workstream"] == "platform"
        assert "domain" not in profile

        assert not (governance_repo / "feature-index.yaml").exists()
        assert (governance_repo / "milestone-index.yaml").exists()
        assert not (governance_repo / "features").exists()
        assert (governance_repo / "milestones").is_dir()

        index = yaml.safe_load((governance_repo / "milestone-index.yaml").read_text(encoding="utf-8"))
        entry = index["milestones"][0]
        assert entry["milestoneId"] == "auth-refresh"
        assert entry["workstream"] == "platform"
        assert entry["project"] == "identity"
        assert "id" not in entry
        assert "domain" not in entry
        assert "service" not in entry

        workstream_marker = yaml.safe_load((governance_repo / "milestones" / "platform" / "workstream.yaml").read_text(encoding="utf-8"))
        assert workstream_marker["kind"] == "workstream"
        assert workstream_marker["workstream"] == "platform"
        assert "domain" not in workstream_marker

        project_marker = yaml.safe_load((governance_repo / "milestones" / "platform" / "identity" / "project.yaml").read_text(encoding="utf-8"))
        assert project_marker["kind"] == "project"
        assert project_marker["workstream"] == "platform"
        assert project_marker["project"] == "identity"
        assert "domain" not in project_marker
        assert "service" not in project_marker

        milestone_yaml = yaml.safe_load((governance_repo / "milestones" / "platform" / "identity" / "auth-refresh" / "milestone.yaml").read_text(encoding="utf-8"))
        assert milestone_yaml["milestoneId"] == "auth-refresh"
        assert milestone_yaml["workstream"] == "platform"
        assert milestone_yaml["project"] == "identity"
        assert milestone_yaml["checkpoints"]["businessplan"] == "2026-04-15T00:00:00Z"
        assert milestone_yaml["docs"]["governance_docs_path"] == "milestones/platform/identity/auth-refresh/docs"
        assert "featureId" not in milestone_yaml
        assert "domain" not in milestone_yaml
        assert "service" not in milestone_yaml
        assert "milestones" not in milestone_yaml

        assert (governance_repo / "milestones" / "platform" / "identity" / "auth-refresh" / "summary.md").read_text(encoding="utf-8") == "# Auth Refresh\n"


def test_apply_fails_when_v5_targets_already_exist():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_fixture(Path(tmp_dir))
        write_yaml(governance_repo / "milestone-index.yaml", {"milestones": []})

        result, code = run([
            "--project-root",
            str(project_root),
            "--governance-repo",
            str(governance_repo),
            "--from",
            "4",
            "--to",
            "5",
        ])

        assert code == 1
        assert result["status"] == "fail"
        assert result["conflicts"]
        assert (governance_repo / "feature-index.yaml").exists()
        assert not (governance_repo / "milestones").exists()