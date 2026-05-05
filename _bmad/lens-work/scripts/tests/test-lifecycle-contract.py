"""Regression coverage for the clean-room lens-work lifecycle contract."""

import importlib.util
from pathlib import Path

_LENS_YAML_PATH = next(
    (parent / "scripts" / "lens_yaml.py" for parent in Path(__file__).resolve().parents if (parent / "scripts" / "lens_yaml.py").is_file()),
    None,
)
if _LENS_YAML_PATH is None:
    raise ModuleNotFoundError("lens_yaml")
_LENS_YAML_SPEC = importlib.util.spec_from_file_location("lens_yaml", _LENS_YAML_PATH)
if _LENS_YAML_SPEC is None or _LENS_YAML_SPEC.loader is None:
    raise ModuleNotFoundError("lens_yaml")
yaml = importlib.util.module_from_spec(_LENS_YAML_SPEC)
_LENS_YAML_SPEC.loader.exec_module(yaml)


LIFECYCLE = Path(__file__).resolve().parents[2] / "lifecycle.yaml"


def load_lifecycle() -> dict:
    return yaml.safe_load(LIFECYCLE.read_text(encoding="utf-8"))


def test_lifecycle_contract_is_v4_and_covers_retained_phases():
    data = load_lifecycle()

    assert data["schema_version"] == 4
    assert {
        "preplan",
        "businessplan",
        "techplan",
        "expressplan",
        "finalizeplan",
        "dev",
        "complete",
    }.issubset(data["phases"])


def test_lifecycle_contract_covers_retained_tracks():
    data = load_lifecycle()

    assert {
        "standard",
        "express",
        "quickdev",
        "hotfix-express",
        "spike",
    }.issubset(data["tracks"])
    assert "finalizeplan" in data["tracks"]["express"]["phases"]


def test_express_review_contract_names_current_report_and_legacy_alias():
    data = load_lifecycle()
    review = data["phases"]["expressplan"]["completion_review"]

    assert review["report"] == "expressplan-adversarial-review.md"
    assert "expressplan-review.md" in review["legacy_report_aliases"]
    assert "expressplan-review.md" in data["artifact_aliases"]["expressplan-adversarial-review"]