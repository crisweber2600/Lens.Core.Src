#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Tests for downgrade-ops.py (schema 5 -> 4 rollback)."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml


SCRIPT = str(Path(__file__).parent.parent / "downgrade-ops.py")


def run(args: list[str]) -> tuple[dict, int]:
    result = subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True)
    try:
        return json.loads(result.stdout), result.returncode
    except json.JSONDecodeError as exc:
        raise AssertionError(
            f"Failed to decode JSON output:\nstdout={result.stdout}\nstderr={result.stderr}"
        ) from exc


def write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        yaml.dump(data, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def make_v5_fixture(tmp: Path) -> tuple[Path, Path]:
    """Create a fully-upgraded schema-5 workspace and governance repo."""
    project_root = tmp / "workspace"
    governance_repo = tmp / "governance"

    # Local .lens state (schema 5)
    write_text(project_root / ".lens" / "LENS_VERSION", "5.0.0\n")
    write_yaml(
        project_root / ".lens" / "governance-setup.yaml",
        {"governance_repo_path": str(governance_repo)},
    )
    write_yaml(
        project_root / ".lens" / "personal" / "context.yaml",
        {
            "workstream": "platform",
            "project": "identity",
            "updated_at": "2026-04-16T00:00:00Z",
            "updated_by": "new-project",
        },
    )
    write_yaml(
        project_root / ".lens" / "personal" / "profile.yaml",
        {
            "name": "cweber",
            "primary_role": "planner",
            "workstream": "platform",
        },
    )

    # Governance repo (schema 5)
    write_yaml(
        governance_repo / "milestone-index.yaml",
        {
            "milestones": [
                {
                    "milestoneId": "auth-refresh",
                    "workstream": "platform",
                    "project": "identity",
                    "status": "businessplan",
                    "owner": "cweber",
                    "plan_branch": "auth-refresh-plan",
                }
            ]
        },
    )
    write_yaml(
        governance_repo / "milestones" / "platform" / "workstream.yaml",
        {
            "kind": "workstream",
            "id": "platform",
            "name": "Platform",
            "workstream": "platform",
            "status": "active",
            "owner": "cweber",
        },
    )
    write_yaml(
        governance_repo / "milestones" / "platform" / "identity" / "project.yaml",
        {
            "kind": "project",
            "id": "platform-identity",
            "name": "Identity",
            "workstream": "platform",
            "project": "identity",
            "status": "active",
            "owner": "cweber",
        },
    )
    write_yaml(
        governance_repo / "milestones" / "platform" / "identity" / "auth-refresh" / "milestone.yaml",
        {
            "name": "Auth Refresh",
            "description": "",
            "milestoneId": "auth-refresh",
            "workstream": "platform",
            "project": "identity",
            "phase": "businessplan",
            "track": "quickplan",
            "checkpoints": {
                "businessplan": "2026-04-15T00:00:00Z",
                "techplan": None,
                "finalizeplan": None,
                "dev-ready": None,
                "dev-complete": None,
                "released": None,
            },
            "docs": {
                "governance_docs_path": "milestones/platform/identity/auth-refresh/docs",
            },
        },
    )
    write_text(
        governance_repo / "milestones" / "platform" / "identity" / "auth-refresh" / "summary.md",
        "# Auth Refresh\n",
    )

    return project_root, governance_repo


# ---------------------------------------------------------------------------
# Dry-run tests
# ---------------------------------------------------------------------------

def test_dry_run_reports_operations_without_writing():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        result, code = run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
            "--dry-run",
        ])

        assert code == 0, result
        assert result["status"] == "pass"
        assert result["dry_run"] is True
        assert any("context.yaml" in op for op in result["local_operations"])
        assert any("milestone-index.yaml -> feature-index.yaml" in op for op in result["governance_operations"])

        # Nothing should have been written
        assert (project_root / ".lens" / "LENS_VERSION").read_text(encoding="utf-8") == "5.0.0\n"
        context = yaml.safe_load(
            (project_root / ".lens" / "personal" / "context.yaml").read_text(encoding="utf-8")
        )
        assert "workstream" in context
        assert (governance_repo / "milestone-index.yaml").exists()
        assert not (governance_repo / "feature-index.yaml").exists()


# ---------------------------------------------------------------------------
# Full apply tests
# ---------------------------------------------------------------------------

def test_apply_downgrades_lens_version():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        result, code = run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        assert code == 0, result
        assert result["status"] == "pass"
        assert (project_root / ".lens" / "LENS_VERSION").read_text(encoding="utf-8") == "4.0.0\n"


def test_apply_reverts_context_keys():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        context = yaml.safe_load(
            (project_root / ".lens" / "personal" / "context.yaml").read_text(encoding="utf-8")
        )
        assert context["domain"] == "platform"
        assert context["service"] == "identity"
        assert "workstream" not in context
        assert "project" not in context
        assert context["updated_by"] == "new-service"


def test_apply_reverts_profile_keys():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        profile = yaml.safe_load(
            (project_root / ".lens" / "personal" / "profile.yaml").read_text(encoding="utf-8")
        )
        assert profile["domain"] == "platform"
        assert "workstream" not in profile


def test_apply_renames_governance_index():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        assert not (governance_repo / "milestone-index.yaml").exists()
        assert (governance_repo / "feature-index.yaml").exists()

        index = yaml.safe_load(
            (governance_repo / "feature-index.yaml").read_text(encoding="utf-8")
        )
        assert "features" in index
        entry = index["features"][0]
        assert entry["featureId"] == "auth-refresh"
        assert entry["domain"] == "platform"
        assert entry["service"] == "identity"
        assert "milestoneId" not in entry
        assert "workstream" not in entry
        assert "project" not in entry


def test_apply_renames_governance_tree():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        assert not (governance_repo / "milestones").exists()
        assert (governance_repo / "features").is_dir()


def test_apply_reverts_workstream_marker():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        domain_marker = yaml.safe_load(
            (governance_repo / "features" / "platform" / "domain.yaml").read_text(encoding="utf-8")
        )
        assert domain_marker["kind"] == "domain"
        assert domain_marker["domain"] == "platform"
        assert "workstream" not in domain_marker
        assert not (governance_repo / "features" / "platform" / "workstream.yaml").exists()


def test_apply_reverts_project_marker():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        service_marker = yaml.safe_load(
            (governance_repo / "features" / "platform" / "identity" / "service.yaml").read_text(
                encoding="utf-8"
            )
        )
        assert service_marker["kind"] == "service"
        assert service_marker["domain"] == "platform"
        assert service_marker["service"] == "identity"
        assert "workstream" not in service_marker
        assert "project" not in service_marker
        assert not (
            governance_repo / "features" / "platform" / "identity" / "project.yaml"
        ).exists()


def test_apply_reverts_milestone_yaml():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        feature_yaml = yaml.safe_load(
            (
                governance_repo
                / "features"
                / "platform"
                / "identity"
                / "auth-refresh"
                / "feature.yaml"
            ).read_text(encoding="utf-8")
        )
        assert feature_yaml["featureId"] == "auth-refresh"
        assert feature_yaml["domain"] == "platform"
        assert feature_yaml["service"] == "identity"
        assert feature_yaml["milestones"]["businessplan"] == "2026-04-15T00:00:00Z"
        assert feature_yaml["docs"]["governance_docs_path"] == (
            "features/platform/identity/auth-refresh/docs"
        )
        assert "milestoneId" not in feature_yaml
        assert "workstream" not in feature_yaml
        assert "project" not in feature_yaml
        assert "checkpoints" not in feature_yaml
        assert not (
            governance_repo
            / "features"
            / "platform"
            / "identity"
            / "auth-refresh"
            / "milestone.yaml"
        ).exists()


def test_apply_preserves_non_yaml_files():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))

        run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        summary = (
            governance_repo
            / "features"
            / "platform"
            / "identity"
            / "auth-refresh"
            / "summary.md"
        )
        assert summary.exists()
        assert summary.read_text(encoding="utf-8") == "# Auth Refresh\n"


# ---------------------------------------------------------------------------
# Conflict / guard tests
# ---------------------------------------------------------------------------

def test_fails_when_feature_targets_already_exist():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, governance_repo = make_v5_fixture(Path(tmp_dir))
        write_yaml(governance_repo / "feature-index.yaml", {"features": []})

        result, code = run([
            "--project-root", str(project_root),
            "--governance-repo", str(governance_repo),
            "--from", "5",
            "--to", "4",
        ])

        assert code == 1
        assert result["status"] == "fail"
        assert result["conflicts"]
        # Original schema-5 files must be untouched
        assert (governance_repo / "milestone-index.yaml").exists()


def test_fails_on_unsupported_version_pair():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root, _ = make_v5_fixture(Path(tmp_dir))

        result, code = run([
            "--project-root", str(project_root),
            "--from", "3",
            "--to", "2",
        ])

        assert code == 1
        assert result["status"] == "fail"
        assert "Unsupported downgrade" in result["error"]


def test_warns_when_no_governance_repo_configured():
    with tempfile.TemporaryDirectory() as tmp_dir:
        project_root = Path(tmp_dir) / "workspace"
        write_text(project_root / ".lens" / "LENS_VERSION", "5.0.0\n")
        write_yaml(
            project_root / ".lens" / "personal" / "context.yaml",
            {"workstream": "platform", "project": "identity", "updated_by": "new-milestone"},
        )
        write_yaml(
            project_root / ".lens" / "personal" / "profile.yaml",
            {"name": "cweber", "workstream": "platform"},
        )

        result, code = run([
            "--project-root", str(project_root),
            "--from", "5",
            "--to", "4",
        ])

        assert code == 0, result
        assert result["status"] == "pass"
        assert any("Governance repo" in w for w in result["warnings"])
        assert result["governance_repo"] is None

        context = yaml.safe_load(
            (project_root / ".lens" / "personal" / "context.yaml").read_text(encoding="utf-8")
        )
        assert context["domain"] == "platform"
        assert context["service"] == "identity"
        assert context["updated_by"] == "new-feature"


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
