#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest>=8.0"]
# ///
"""Contract tests for the lens-quickdev public prompt and skill."""

from __future__ import annotations

from pathlib import Path


TEST_FILE = Path(__file__).resolve()
MODULE_ROOT = TEST_FILE.parents[2]
PROMPT_MD = MODULE_ROOT / "prompts" / "lens-quickdev.prompt.md"
SKILL_MD = MODULE_ROOT / "skills" / "lens-quickdev" / "SKILL.md"


def _prompt_text() -> str:
    return PROMPT_MD.read_text(encoding="utf-8")


def _skill_text() -> str:
    return SKILL_MD.read_text(encoding="utf-8")


def test_public_prompt_runs_preflight_before_skill_loading():
    """The public prompt must run prompt-start preflight before loading the skill."""
    text = _prompt_text()

    preflight_index = text.index("light-preflight.py --caller lens-quickdev")
    skill_index = text.index("lens-quickdev/SKILL.md")

    assert preflight_index < skill_index
    assert "If that command exits non-zero, stop" in text


def test_public_prompt_remains_redirect_only():
    """The prompt surface must not own wrapper business logic."""
    text = _prompt_text()

    assert "This prompt is only a redirect" in text
    assert "Do not add prompt-local business logic" in text
    assert "bmad-quick-dev" not in text
    assert "target_repos" not in text
    assert "quickdev-[summaryofrequeststub]" not in text


def test_skill_is_conductor_only_and_delegates_to_bmad_quick_dev():
    """The skill must name bmad-quick-dev as the only implementation engine."""
    text = _skill_text()

    assert "conductor-only" in text
    assert "does not implement a second quick-dev engine" in text
    assert "The only implementation engine for this wrapper is `bmad-quick-dev`" in text
    assert "Delegate implementation through the registered `bmad-quick-dev` skill" in text


def test_skill_blocks_before_target_assessment_without_dev_ready_context():
    """Non-dev-ready or unresolved target context must block before repo assessment."""
    text = _skill_text()

    assert "feature is not dev-ready" in text
    assert "Block before target-repo assessment" in text
    assert "`target_repos` is missing or unresolved" in text
    assert "blocks without guessing a write target" in text


def test_skill_defines_versioned_evidence_artifact():
    """Quickdev evidence must use the versioned artifact path from the plan."""
    text = _skill_text()

    assert "quickdev/quickdev-[summaryofrequeststub]-vNNN.md" in text
    assert "Versioned quickdev evidence paths" in text