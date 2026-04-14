"""Static contract tests for interactive planning conductors."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).parent.parent.parent

PUBLISHING_CONDUCTORS = {
    "skills/bmad-lens-businessplan/SKILL.md": "preplan",
    "skills/bmad-lens-techplan/SKILL.md": "businessplan",
    "skills/bmad-lens-devproposal/SKILL.md": "techplan",
    "skills/bmad-lens-finalizeplan/SKILL.md": "techplan",
    "skills/bmad-lens-sprintplan/SKILL.md": "devproposal",
    "skills/bmad-lens-dev/SKILL.md": "finalizeplan",
}


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_techplan_interactive_handoff_boundary_is_explicit():
    text = _read("skills/bmad-lens-techplan/SKILL.md")

    assert "if TechPlan was auto-delegated from `/next`, skip that run-confirmation prompt" in text
    assert "treat that handoff as consent to begin phase entry" in text
    assert "do not continue with conductor-side architecture questions or authoring" in text
    assert "The native architecture workflow owns the interactive session and document creation" in text


def test_businessplan_interactive_handoff_boundary_is_explicit():
    text = _read("skills/bmad-lens-businessplan/SKILL.md")

    assert "present one workflow selection menu (`prd`, `ux-design`, or `both`)" in text
    assert "if BusinessPlan was auto-delegated from `/next`, skip that run-confirmation prompt" in text
    assert "Do not ask a redundant yes/no prompt just to run BusinessPlan" in text
    assert "run as two separate native sessions; after the first completes, ask before launching the second" in text
    assert "do not continue with conductor-side PRD or UX questioning or authoring" in text


def test_governance_publish_steps_require_cli_copy_boundary():
    for relative_path, phase in PUBLISHING_CONDUCTORS.items():
        text = _read(relative_path)

        assert f"publish-to-governance --phase {phase}" in text
        assert "Do not create governance files or directories directly with tool calls or patches" in text


def test_publish_to_governance_contract_requires_cli_execution():
    skill = _read("skills/bmad-lens-git-orchestration/SKILL.md")
    reference = _read("skills/bmad-lens-git-orchestration/references/publish-to-governance.md")

    expected_cli = "uv run {project-root}/lens.core/_bmad/lens-work/skills/bmad-lens-git-orchestration/scripts/git-orchestration-ops.py publish-to-governance"

    assert expected_cli in skill
    assert expected_cli in reference
    assert "Do not create governance files or directories directly with tool calls or patches" in skill
    assert "Do not create governance files or directories directly with tool calls or patches" in reference


def test_wrapper_delegation_boundary_is_explicit():
    text = _read("skills/bmad-lens-bmad-skill/SKILL.md")

    assert "Delegate and stop" in text
    assert "does not continue phase-conductor execution" in text
    assert "Do not ask follow-on workflow questions" in text


def test_next_docs_describe_auto_delegate_behavior():
    next_skill = _read("skills/bmad-lens-next/SKILL.md")
    module_help = _read("module-help.csv")
    getting_started = _read("docs/GETTING-STARTED.md")

    assert "The `/next` handoff counts as user consent to start the delegated phase entry sequence" in next_skill
    assert "Resolve the one unblocked next command for the current feature and auto-delegate into it" in module_help
    assert "Resolve the one unblocked next step and load it immediately" in getting_started
    assert "/next` does not show a menu when the next step is deterministic" in getting_started


def test_init_feature_handoff_surfaces_route_through_next():
    module_help = _read("module-help.csv")
    setup_help = _read("skills/bmad-lens-setup/assets/module-help.csv")
    workbench_help = _read("bmad-lens-work-setup/assets/module-help.csv")
    prompt = _read("prompts/lens-new-feature.prompt.md")
    skill = _read("skills/bmad-lens-init-feature/SKILL.md")
    reference = _read("skills/bmad-lens-init-feature/references/init-feature.md")

    assert "Lens,bmad-lens-init-feature,init-feature,IF,Initialize a new feature with 2-branch topology and governance entries,create,<featureId> [--domain] [--service] --track <track> [--dry-run],anytime,,bmad-lens-next:suggest,false" in module_help
    assert "Lens,bmad-lens-init-feature,init-feature,IF,Initialize a new feature with 2-branch topology and governance entries,create,<featureId> [--domain] [--service] --track <track> [--dry-run],anytime,bmad-lens-onboard:scaffold,bmad-lens-next:suggest,false" in setup_help
    assert "Lens,bmad-lens-init-feature,Create Feature,IF,\"Initialize a new feature with 2-branch topology and governance entries\",create,<featureId> [--domain] [--service] --track <track> [--dry-run],anytime,,bmad-lens-next:suggest,false" in workbench_help
    assert "report the returned `starting_phase` and recommend `/next` or the returned `recommended_command`" in prompt
    assert "report the lifecycle start phase and the next recommended command returned by the script" in skill
    assert "plus `planning_pr_created`, `starting_phase`, `recommended_command`, and `router_command`" in reference