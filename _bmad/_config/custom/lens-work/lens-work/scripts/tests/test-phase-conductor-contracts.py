"""Static contract tests for interactive planning conductors."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).parent.parent.parent


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_techplan_interactive_handoff_boundary_is_explicit():
    text = _read("skills/bmad-lens-techplan/SKILL.md")

    assert "wait for confirmation before any publication, copy, or write action" in text
    assert "do not continue with conductor-side architecture questions or authoring" in text
    assert "The native architecture workflow owns the interactive session and document creation" in text


def test_businessplan_interactive_handoff_boundary_is_explicit():
    text = _read("skills/bmad-lens-businessplan/SKILL.md")

    assert "present one workflow selection menu (`prd`, `ux-design`, or `both`)" in text
    assert "Do not ask downstream discovery questions here" in text
    assert "run as two separate native sessions; after the first completes, ask before launching the second" in text
    assert "do not continue with conductor-side PRD or UX questioning or authoring" in text


def test_wrapper_delegation_boundary_is_explicit():
    text = _read("skills/bmad-lens-bmad-skill/SKILL.md")

    assert "Delegate and stop" in text
    assert "does not continue phase-conductor execution" in text
    assert "Do not ask follow-on workflow questions" in text


def test_next_docs_describe_auto_delegate_behavior():
    module_help = _read("module-help.csv")
    getting_started = _read("docs/GETTING-STARTED.md")

    assert "Resolve the one unblocked next command for the current feature and auto-delegate into it" in module_help
    assert "Resolve the one unblocked next step and load it immediately" in getting_started
    assert "/next` does not show a menu when the next step is deterministic" in getting_started