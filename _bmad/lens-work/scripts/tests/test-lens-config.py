"""Focused tests for Lens module config discovery and path normalization."""

from __future__ import annotations

from importlib import util as importlib_util
import sys
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


SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from lens_config import (  # noqa: E402
    ConfigError,
    discover_feature_yaml,
    find_module_config,
    load_lens_config,
    normalize_path_text,
)


MODULE_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = MODULE_ROOT / "bmadconfig.yaml"
CONFIG_DOC = MODULE_ROOT / "docs" / "configuration.md"


def test_committed_bmadconfig_has_required_fields_and_absolute_paths():
    loaded = load_lens_config(CONFIG_PATH)
    data = loaded.data

    assert data["control_topology"] == "3-branch"
    for field in (
        "governance_repo_path",
        "target_projects_path",
        "default_git_remote",
        "lifecycle_contract",
    ):
        assert data.get(field)
    assert Path(data["governance_repo_path"]).is_absolute()
    assert Path(data["target_projects_path"]).is_absolute()
    assert Path(data["lifecycle_contract"]).is_absolute()


def test_load_lens_config_merges_allowed_user_overrides(tmp_path: Path):
    project = tmp_path / "target-repo"
    module_root = project / "_bmad" / "lens-work"
    module_root.mkdir(parents=True)
    (module_root / "lifecycle.yaml").write_text("schema_version: 4\n", encoding="utf-8")
    governance = tmp_path / "governance"
    target_projects = tmp_path / "TargetProjects"
    governance.mkdir()
    target_projects.mkdir()

    (module_root / "bmadconfig.yaml").write_text(
        yaml.safe_dump(
            {
                "governance_repo_path": str(governance),
                "control_topology": "3-branch",
                "target_projects_path": "{project-root}/../TargetProjects",
                "default_git_remote": "origin",
                "lifecycle_contract": "{module-root}/lifecycle.yaml",
                "default_branch": "main",
                "target_branch_strategy": "feature/{featureStub}",
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    (module_root / "config.user.yaml").write_text(
        yaml.safe_dump(
            {
                "github_username": "alice",
                "default_branch": "develop",
                "target_branch_strategy": "feature/{featureStub}-{github_username}",
                "control_topology": "flat",
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    loaded = load_lens_config(module_root / "bmadconfig.yaml")

    assert loaded.data["github_username"] == "alice"
    assert loaded.data["default_branch"] == "develop"
    assert loaded.data["target_branch_strategy"] == "feature/{featureStub}-{github_username}"
    assert loaded.data["control_topology"] == "3-branch"
    assert Path(loaded.data["target_projects_path"]) == target_projects.resolve()
    assert Path(loaded.data["lifecycle_contract"]) == (module_root / "lifecycle.yaml").resolve()


def test_load_lens_config_rejects_missing_required_fields(tmp_path: Path):
    module_root = tmp_path / "repo" / "_bmad" / "lens-work"
    module_root.mkdir(parents=True)
    config = module_root / "bmadconfig.yaml"
    config.write_text("control_topology: 3-branch\n", encoding="utf-8")

    try:
        load_lens_config(config)
    except ConfigError as exc:
        assert "governance_repo_path" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("Expected ConfigError")


def test_find_module_config_walks_parent_directories_without_search_tools(tmp_path: Path):
    module_root = tmp_path / "repo" / "_bmad" / "lens-work"
    deep_path = module_root / "skills" / "lens-example" / "scripts"
    deep_path.mkdir(parents=True)
    config = module_root / "bmadconfig.yaml"
    config.write_text(
        "governance_repo_path: /tmp/gov\ncontrol_topology: 3-branch\ntarget_projects_path: /tmp/projects\ndefault_git_remote: origin\nlifecycle_contract: /tmp/lifecycle.yaml\n",
        encoding="utf-8",
    )

    assert find_module_config(deep_path) == config.resolve()


def test_discover_feature_yaml_scans_without_feature_index(tmp_path: Path):
    governance = tmp_path / "governance"
    feature_dir = governance / "features" / "platform" / "identity" / "auth-login"
    feature_dir.mkdir(parents=True)
    feature_yaml = feature_dir / "feature.yaml"
    feature_yaml.write_text(yaml.safe_dump({"featureId": "auth-login"}), encoding="utf-8")

    assert discover_feature_yaml(governance, "auth-login") == feature_yaml.resolve()


def test_windows_git_bash_drive_paths_are_not_normalized_under_c_drive():
    normalized = normalize_path_text(
        "/d/Lens.Core.Control - Copy/docs/out.md",
        platform_system="Windows",
    ).replace("\\", "/")
    relative = normalize_path_text(
        "docs/out.md",
        base="/d/Lens.Core.Control - Copy",
        platform_system="Windows",
    ).replace("\\", "/")

    assert normalized == "D:/Lens.Core.Control - Copy/docs/out.md"
    assert relative == "D:/Lens.Core.Control - Copy/docs/out.md"
    assert not normalized.startswith("C:/d/")
    assert not relative.startswith("C:/d/")


def test_user_config_contract_documents_required_override_fields():
    text = CONFIG_DOC.read_text(encoding="utf-8")

    for field in ("github_username", "default_branch", "target_branch_strategy"):
        assert f"`{field}`" in text