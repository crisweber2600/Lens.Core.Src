#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0"]
# ///
"""Tests for lifecycle-state.py."""

from __future__ import annotations

from importlib import util as importlib_util
from argparse import Namespace
from pathlib import Path


_LENS_YAML_PATH = next(
    (parent / "scripts" / "lens_yaml.py" for parent in Path(__file__).resolve().parents if (parent / "scripts" / "lens_yaml.py").is_file()),
    None,
)
if _LENS_YAML_PATH is None:
    raise ModuleNotFoundError("lens_yaml")
_LENS_YAML_SPEC = importlib_util.spec_from_file_location("lens_yaml", _LENS_YAML_PATH)
if _LENS_YAML_SPEC is None or _LENS_YAML_SPEC.loader is None:
    raise ModuleNotFoundError("lens_yaml")
yaml = importlib_util.module_from_spec(_LENS_YAML_SPEC)
_LENS_YAML_SPEC.loader.exec_module(yaml)


SCRIPT = Path(__file__).parent.parent / "lifecycle-state.py"


def load_state_module():
    spec = importlib_util.spec_from_file_location("lifecycle_state", SCRIPT)
    module = importlib_util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_build_state_prints_lifecycle_fields(tmp_path: Path):
    ops = load_state_module()
    feature_path = tmp_path / "features" / "lens-dev" / "new-codebase" / "demo" / "feature.yaml"
    feature_path.parent.mkdir(parents=True)
    feature_path.write_text(
        yaml.safe_dump(
            {
                "featureId": "demo",
                "name": "Demo",
                "domain": "lens-dev",
                "service": "new-codebase",
                "phase": "dev",
                "track": "express",
                "target_repos": ["TargetProjects/lens-dev/new-codebase/lens.core.src"],
                "docs": {
                    "path": "docs/lens-dev/new-codebase/demo",
                    "governance_docs_path": "features/lens-dev/new-codebase/demo/docs",
                },
                "links": {
                    "pull_request": "https://github.com/example/repo/pull/1",
                    "issues": ["bug-1"],
                },
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    state = ops.build_state(feature_path)

    assert state["feature_id"] == "demo"
    assert state["phase"] == "dev"
    assert state["track"] == "express"
    assert state["target_repos"] == ["TargetProjects/lens-dev/new-codebase/lens.core.src"]
    assert state["docs_path"] == "docs/lens-dev/new-codebase/demo"
    assert state["governance_docs_path"] == "features/lens-dev/new-codebase/demo/docs"
    assert state["pull_request"] == "https://github.com/example/repo/pull/1"
    assert state["issues"] == ["bug-1"]


def test_resolve_governance_repo_prefers_cli_override(tmp_path: Path):
    ops = load_state_module()
    explicit = tmp_path / "explicit-governance"
    explicit.mkdir()
    args = Namespace(
        governance_repo=str(explicit),
        workspace_root=str(tmp_path),
        module_config=None,
    )

    assert ops.resolve_governance_repo(args) == explicit.resolve()


def test_resolve_governance_repo_uses_governance_setup_yaml(tmp_path: Path):
    ops = load_state_module()
    gov_repo = tmp_path / "governance"
    gov_repo.mkdir()
    override = tmp_path / ".lens" / "governance-setup.yaml"
    override.parent.mkdir(parents=True)
    override.write_text(
        yaml.safe_dump({"governance_repo_path": str(gov_repo)}),
        encoding="utf-8",
    )
    args = Namespace(
        governance_repo=None,
        workspace_root=str(tmp_path),
        module_config=None,
    )

    assert ops.resolve_governance_repo(args) == gov_repo.resolve()


def test_resolve_governance_repo_governance_setup_placeholder(tmp_path: Path):
    ops = load_state_module()
    gov_repo = tmp_path / "gov"
    gov_repo.mkdir()
    override = tmp_path / ".lens" / "governance-setup.yaml"
    override.parent.mkdir(parents=True)
    override.write_text(
        yaml.safe_dump({"governance_repo_path": "{project-root}/gov"}),
        encoding="utf-8",
    )
    args = Namespace(
        governance_repo=None,
        workspace_root=str(tmp_path),
        module_config=None,
    )

    assert ops.resolve_governance_repo(args) == gov_repo.resolve()


def test_resolve_governance_repo_raises_on_malformed_governance_setup(tmp_path: Path):
    ops = load_state_module()
    override = tmp_path / ".lens" / "governance-setup.yaml"
    override.parent.mkdir(parents=True)
    override.write_text(": invalid: yaml: [", encoding="utf-8")
    args = Namespace(
        governance_repo=None,
        workspace_root=str(tmp_path),
        module_config=None,
    )

    import pytest
    with pytest.raises(ops.ConfigError):
        ops.resolve_governance_repo(args)
