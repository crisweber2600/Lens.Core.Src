#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0"]
# ///
"""Focused contract checks for Epic 3 skill-surface restoration."""

from __future__ import annotations

from importlib import util as importlib_util
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


TEST_FILE = Path(__file__).resolve()
MODULE_ROOT = TEST_FILE.parents[2]
SKILLS_ROOT = MODULE_ROOT / "skills"
MODULE_YAML = MODULE_ROOT / "module.yaml"

REQUIRED_SKILLS = [
    "lens-dev",
    "lens-split-feature",
    "lens-upgrade",
    "lens-constitution",
]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _module_skill_names() -> list[str]:
    data = yaml.safe_load(_read_text(MODULE_YAML))
    skills = data.get("skills", [])
    assert isinstance(skills, list), "module.yaml skills must be a list"
    return [str(skill) for skill in skills]


def test_required_skill_contract_files_exist():
    missing = [
        skill for skill in REQUIRED_SKILLS if not (SKILLS_ROOT / skill / "SKILL.md").exists()
    ]
    assert not missing, f"Missing Epic 3 skill contracts: {missing}"


def test_required_skill_contract_sections_exist():
    required_sections = [
        "## Input Contract",
        "## Output Contract",
        "## Error Behavior",
        "## Test Hooks",
    ]
    for skill in REQUIRED_SKILLS:
        text = _read_text(SKILLS_ROOT / skill / "SKILL.md")
        for section in required_sections:
            assert section in text, f"{skill} missing required section: {section}"


def test_epic3_skills_registered_once_in_module_yaml():
    skills = _module_skill_names()
    for skill in REQUIRED_SKILLS:
        assert skills.count(skill) == 1, (
            f"{skill} must be registered exactly once in module.yaml skills list"
        )
