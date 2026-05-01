#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0", "pyyaml>=6.0"]
# ///
"""Focused regression tests for bmad-lens-expressplan command surface.

Run:
    cd TargetProjects/lens-dev/new-codebase/lens.core.src
    PYTHONDONTWRITEBYTECODE=1 uv run --with pytest --with PyYAML python -m pytest _bmad/lens-work/skills/bmad-lens-expressplan/scripts/tests/test-expressplan-ops.py -q
"""

from pathlib import Path

import yaml


SKILL_ROOT = Path(__file__).resolve().parents[2]
MODULE_ROOT = SKILL_ROOT.parents[1]
REPO_ROOT = MODULE_ROOT.parents[1]

STUB_PROMPT = REPO_ROOT / ".github" / "prompts" / "lens-expressplan.prompt.md"
RELEASE_PROMPT = MODULE_ROOT / "prompts" / "lens-expressplan.prompt.md"
CONDUCTOR_SKILL = SKILL_ROOT / "SKILL.md"
MODULE_YAML = MODULE_ROOT / "module.yaml"


def read_text(path: Path) -> str:
    """Read repository text files as UTF-8 across platforms."""
    return path.read_text(encoding="utf-8")


def test_stub_exists():
    """Public stub must exist under .github/prompts/."""
    assert STUB_PROMPT.exists(), f"Missing public stub: {STUB_PROMPT}"


def test_stub_preflight_then_release_prompt():
    """Stub must run preflight before loading the release prompt, and must stop on failure."""
    text = read_text(STUB_PROMPT)
    preflight = "uv run ./lens.core/_bmad/lens-work/scripts/light-preflight.py"
    release = "lens.core/_bmad/lens-work/prompts/lens-expressplan.prompt.md"
    assert preflight in text
    assert release in text
    assert text.index(preflight) < text.index(release)
    assert "If that command exits non-zero, stop" in text


def test_release_prompt_routes_to_conductor_skill():
    """Release prompt must be a thin stub routing to SKILL.md."""
    assert RELEASE_PROMPT.exists(), f"Missing release prompt: {RELEASE_PROMPT}"
    text = read_text(RELEASE_PROMPT)
    assert "bmad-lens-expressplan/SKILL.md" in text
    forbidden = ["if featureId", "if feature_id", "business-plan.md", "tech-plan.md"]
    for phrase in forbidden:
        assert phrase not in text, f"Release prompt contains inline logic: {phrase!r}"


def test_conductor_skill_exists():
    """ExpressPlan conductor SKILL.md must exist."""
    assert CONDUCTOR_SKILL.exists(), f"Missing conductor skill: {CONDUCTOR_SKILL}"


def test_conductor_enforces_express_only_path():
    """Non-express features must not enter the ExpressPlan path."""
    text = read_text(CONDUCTOR_SKILL)
    assert "feature.yaml.track == express" in text
    assert "ExpressPlan requires `track: express`" in text
    assert "/preplan, /businessplan, /techplan, and /finalizeplan" in text


def test_conductor_delegates_quickplan_through_wrapper():
    """Planning authorship must be delegated through the Lens wrapper."""
    text = read_text(CONDUCTOR_SKILL)
    assert "bmad-lens-bmad-skill" in text
    assert "bmad-lens-quickplan" in text
    assert "bmad-lens-bmad-skill --skill bmad-lens-quickplan" in text
    assert "You do not author" in text


def test_conductor_requires_output_parity_packet():
    """ExpressPlan output parity requires the four expected artifacts."""
    text = read_text(CONDUCTOR_SKILL)
    for artifact in (
        "business-plan.md",
        "tech-plan.md",
        "sprint-plan.md",
        "expressplan-adversarial-review.md",
    ):
        assert artifact in text
    assert "Output parity" in text


def test_conductor_enforces_adversarial_review_stop():
    """Failed expressplan review must block phase advancement."""
    text = read_text(CONDUCTOR_SKILL)
    assert "bmad-lens-adversarial-review --phase expressplan" in text
    assert "If the review verdict is `fail`, stop" in text
    assert "Do not update `feature.yaml`" in text


def test_conductor_updates_phase_through_feature_yaml_only():
    """Phase updates must route through feature-yaml, not direct governance writes."""
    text = read_text(CONDUCTOR_SKILL)
    assert "bmad-lens-feature-yaml" in text
    assert "No direct governance writes" in text


def test_lens_expressplan_registered_in_module_yaml():
    """lens-expressplan.prompt.md must appear in module.yaml prompts list."""
    data = yaml.safe_load(read_text(MODULE_YAML))
    prompts = data.get("prompts", [])
    assert "lens-expressplan.prompt.md" in prompts


def test_clean_room_no_old_codebase_prose():
    """Implementation is clean-room: no long old-codebase expressplan paragraphs copied."""
    old_codebase_skill = (
        REPO_ROOT.parents[1]
        / "old-codebase"
        / "lens.core.src"
        / "_bmad"
        / "lens-work"
        / "skills"
        / "bmad-lens-expressplan"
        / "SKILL.md"
    )
    if not old_codebase_skill.exists():
        return

    import re

    old_text = read_text(old_codebase_skill)
    new_text = read_text(CONDUCTOR_SKILL)
    old_paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n{2,}", old_text)
        if len(paragraph.split()) >= 20
    ]
    for paragraph in old_paragraphs:
        assert paragraph not in new_text, (
            "Clean-room violation: old-codebase paragraph reproduced verbatim in new skill: "
            f"{paragraph[:120]}..."
        )
