#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Init feature operations (new-codebase implementation).

This implementation currently exposes create-domain for the new-domain command.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import yaml

# source: old-codebase init-feature-ops.py SAFE_ID_PATTERN
SAFE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def validate_safe_id(value: str, field_name: str) -> str | None:
    if not SAFE_ID_PATTERN.match(value):
        return (
            f"Invalid {field_name}: '{value}'. "
            "Must match [a-z0-9][a-z0-9._-]{0,63} "
            "(lowercase alphanumeric, dots, hyphens, underscores)."
        )
    return None


def git_command_argv(repo: str, args: list[str]) -> list[str]:
    return ["git", "-C", repo, *args]


def git_command_text(repo: str, args: list[str]) -> str:
    return shlex.join(git_command_argv(repo, args))


def run_git(repo: str, args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(git_command_argv(repo, args), capture_output=True, text=True)
    if result.returncode != 0:
        msg = (result.stderr or result.stdout).strip() or f"exit code {result.returncode}"
        raise RuntimeError(f"{git_command_text(repo, args)} failed: {msg}")
    return result


def unique_paths(paths: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for path in paths:
        if path not in seen:
            seen.add(path)
            ordered.append(path)
    return ordered


def ensure_git_worktree(repo: str) -> None:
    result = subprocess.run(
        git_command_argv(repo, ["rev-parse", "--is-inside-work-tree"]),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or result.stdout.strip() != "true":
        raise RuntimeError(f"{repo} is not a git worktree")


def ensure_clean_worktree(repo: str) -> None:
    result = subprocess.run(git_command_argv(repo, ["status", "--short"]), capture_output=True, text=True)
    if result.returncode != 0:
        msg = (result.stderr or result.stdout).strip() or f"exit code {result.returncode}"
        raise RuntimeError(f"{git_command_text(repo, ['status', '--short'])} failed: {msg}")
    if result.stdout.strip():
        raise RuntimeError("Governance repo has local changes. Commit or stash before --execute-governance-git.")


def current_head_sha(repo: str) -> str | None:
    result = subprocess.run(git_command_argv(repo, ["rev-parse", "HEAD"]), capture_output=True, text=True)
    if result.returncode != 0:
        return None
    sha = result.stdout.strip()
    return sha if sha else None


def sync_governance_main(governance_repo: str) -> None:
    ensure_git_worktree(governance_repo)
    ensure_clean_worktree(governance_repo)
    run_git(governance_repo, ["checkout", "main"])
    run_git(governance_repo, ["pull", "--rebase", "--autostash", "origin", "main"])


def atomic_write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            yaml.dump(data, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)
        os.replace(tmp_path, str(path))
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def write_context_yaml(personal_folder: str, domain: str, source: str) -> Path:
    context_path = Path(personal_folder) / "context.yaml"
    context_data = {
        "domain": domain,
        "service": None,
        "updated_at": now_iso(),
        "updated_by": source,
    }
    atomic_write_yaml(context_path, context_data)
    return context_path


def make_domain_yaml(domain: str, name: str, username: str, timestamp: str) -> dict:
    return {
        "kind": "domain",
        "id": domain,
        "name": name,
        "domain": domain,
        "status": "active",
        "owner": username,
        "created": timestamp,
        "updated": timestamp,
    }


def make_domain_constitution_md(domain: str, name: str) -> str:
    display = name or domain
    return (
        "---\n"
        "permitted_tracks: [quickplan, full, hotfix, tech-change, express, expressplan]\n"
        "required_artifacts:\n"
        "  planning:\n"
        "    - business-plan\n"
        "  dev:\n"
        "    - stories\n"
        "gate_mode: informational\n"
        "sensing_gate_mode: informational\n"
        "additional_review_participants: []\n"
        "enforce_stories: true\n"
        "enforce_review: true\n"
        "---\n"
        "\n"
        f"# {display} Domain Constitution\n"
        "\n"
        f"This constitution defines governance rules for the **{display}** domain.\n"
        "\n"
        "## Scope\n"
        "\n"
        f"Applies to all services and repositories within the `{domain}` domain.\n"
        "Lower-level constitutions (service, repo) may add constraints but may not remove those defined here.\n"
        "\n"
        "## Tracks\n"
        "\n"
        "All standard tracks are permitted: `quickplan`, `full`, `hotfix`, `tech-change`.\n"
        "Service-level constitutions may restrict this list further.\n"
        "\n"
        "## Artifacts\n"
        "\n"
        "- **Planning phase:** a `business-plan` is required before promotion to dev.\n"
        "- **Dev phase:** at least one story file must exist before dev work begins.\n"
        "\n"
        "## Review\n"
        "\n"
        "Peer review is enforced for all features in this domain.\n"
        "Additional participants may be named at the service or repo level.\n"
        "\n"
        "## Notes\n"
        "\n"
        "This constitution was initialized with domain defaults.\n"
        "Update it to reflect the specific governance needs of the "
        f"{display} domain.\n"
    )


def build_container_git_steps(paths: list[str], commit_message: str) -> list[list[str]]:
    add_args = ["add", *paths]
    return [
        ["checkout", "main"],
        ["pull", "--rebase", "--autostash", "origin", "main"],
        add_args,
        ["commit", "-m", commit_message],
        ["push", "origin", "main"],
    ]


def build_container_result_fields(
    governance_git_commands: list[str],
    workspace_git_commands: list[str],
    governance_git_executed: bool = False,
    governance_commit_sha: str | None = None,
) -> dict:
    all_git_commands = [*governance_git_commands, *workspace_git_commands]
    remaining_git_commands = workspace_git_commands if governance_git_executed else all_git_commands
    return {
        "git_commands": all_git_commands,
        "governance_git_commands": governance_git_commands,
        "workspace_git_commands": workspace_git_commands,
        "remaining_git_commands": remaining_git_commands,
        "governance_git_executed": governance_git_executed,
        "governance_commit_sha": governance_commit_sha,
    }


def build_workspace_scaffold_commands(
    scaffold_entries: list[tuple[str, str]],
    scope: str,
    identifier: str,
) -> list[str]:
    grouped: dict[str, list[str]] = {}
    for workspace_root, rel_path in scaffold_entries:
        grouped.setdefault(workspace_root, []).append(rel_path)

    commands: list[str] = []
    for workspace_root, rel_paths in grouped.items():
        unique_rel_paths = unique_paths(rel_paths)
        noun = "folder" if len(unique_rel_paths) == 1 else "folders"
        commands.extend([
            f"git -C {workspace_root} add {' '.join(unique_rel_paths)}",
            f'git -C {workspace_root} commit -m "scaffold({scope}): add {identifier} {noun}"',
        ])
    return commands


def resolve_personal_folder(args: argparse.Namespace) -> Path:
    if args.personal_folder:
        return Path(args.personal_folder).expanduser().resolve()
    env_value = os.environ.get("LENS_PERSONAL_FOLDER")
    if env_value:
        return Path(env_value).expanduser().resolve()
    return (Path.cwd() / ".lens" / "personal").resolve()


def cmd_create_domain(args: argparse.Namespace) -> dict:
    domain = args.domain
    name = args.name if args.name else domain
    username = args.username if args.username else ""
    governance_repo = args.governance_repo

    err = validate_safe_id(domain, "domain")
    if err:
        return {"status": "fail", "scope": "domain", "dry_run": bool(args.dry_run), "error": err}

    gov_path = Path(governance_repo)
    if not gov_path.is_dir():
        return {
            "status": "fail",
            "scope": "domain",
            "dry_run": bool(args.dry_run),
            "error": f"Governance repo not found: {governance_repo}",
        }

    marker_path = gov_path / "features" / domain / "domain.yaml"
    constitution_path = gov_path / "constitutions" / domain / "constitution.md"
    marker_paths = [marker_path.relative_to(gov_path).as_posix()]
    constitution_paths = [constitution_path.relative_to(gov_path).as_posix()]

    tp_gitkeep_path: Path | None = None
    workspace_scaffold_entries: list[tuple[str, str]] = []
    if args.target_projects_root:
        target_projects_root = Path(args.target_projects_root)
        tp_gitkeep_path = target_projects_root / domain / ".gitkeep"
        workspace_scaffold_entries.append(
            (str(target_projects_root.parent), (Path(target_projects_root.name) / domain / ".gitkeep").as_posix())
        )

    docs_gitkeep_path: Path | None = None
    if args.docs_root:
        docs_root = Path(args.docs_root)
        docs_gitkeep_path = docs_root / domain / ".gitkeep"
        workspace_scaffold_entries.append(
            (str(docs_root.parent), (Path(docs_root.name) / domain / ".gitkeep").as_posix())
        )

    personal_folder = resolve_personal_folder(args)
    context_path = str((personal_folder / "context.yaml"))

    gov_paths = marker_paths + constitution_paths
    gov_steps = build_container_git_steps(gov_paths, f"feat(domain): add {domain} container")
    governance_git_commands = [git_command_text(governance_repo, step) for step in gov_steps]
    workspace_git_commands = build_workspace_scaffold_commands(workspace_scaffold_entries, "domain", domain)

    if args.execute_governance_git and not args.dry_run:
        try:
            sync_governance_main(governance_repo)
        except RuntimeError as exc:
            return {
                "status": "fail",
                "scope": "domain",
                "dry_run": False,
                "error": f"Governance git preflight failed: {exc}",
                **build_container_result_fields(governance_git_commands, workspace_git_commands),
            }

    if marker_path.exists():
        return {
            "status": "fail",
            "scope": "domain",
            "dry_run": bool(args.dry_run),
            "error": f"Domain '{domain}' already exists at {marker_path}",
        }

    if args.dry_run:
        return {
            "status": "pass",
            "dry_run": True,
            "scope": "domain",
            "path": str(marker_path),
            "constitution_path": str(constitution_path),
            "created_marker_paths": marker_paths,
            "created_constitution_paths": constitution_paths,
            "target_projects_path": str(tp_gitkeep_path.parent) if tp_gitkeep_path else None,
            "docs_path": str(docs_gitkeep_path.parent) if docs_gitkeep_path else None,
            "context_path": context_path,
            "error": None,
            **build_container_result_fields(governance_git_commands, workspace_git_commands),
        }

    timestamp = now_iso()

    try:
        atomic_write_yaml(marker_path, make_domain_yaml(domain, name, username, timestamp))
    except OSError as exc:
        return {"status": "fail", "scope": "domain", "dry_run": False, "error": f"Failed to write domain marker: {exc}"}

    try:
        constitution_path.parent.mkdir(parents=True, exist_ok=True)
        constitution_path.write_text(make_domain_constitution_md(domain, name), encoding="utf-8")
    except OSError as exc:
        return {
            "status": "fail",
            "scope": "domain",
            "dry_run": False,
            "error": f"Failed to write domain constitution: {exc}",
        }

    if tp_gitkeep_path is not None:
        try:
            tp_gitkeep_path.parent.mkdir(parents=True, exist_ok=True)
            tp_gitkeep_path.touch()
        except OSError as exc:
            return {
                "status": "fail",
                "scope": "domain",
                "dry_run": False,
                "error": f"Failed to scaffold TargetProjects domain folder: {exc}",
            }

    if docs_gitkeep_path is not None:
        try:
            docs_gitkeep_path.parent.mkdir(parents=True, exist_ok=True)
            docs_gitkeep_path.touch()
        except OSError as exc:
            return {
                "status": "fail",
                "scope": "domain",
                "dry_run": False,
                "error": f"Failed to scaffold docs domain folder: {exc}",
            }

    try:
        written_context_path = str(write_context_yaml(str(personal_folder), domain, "new-domain"))
    except OSError as exc:
        return {"status": "fail", "scope": "domain", "dry_run": False, "error": f"Failed to write context.yaml: {exc}"}

    governance_commit_sha: str | None = None
    governance_git_executed = False
    if args.execute_governance_git:
        try:
            for step in gov_steps[2:]:
                run_git(governance_repo, step)
            governance_commit_sha = current_head_sha(governance_repo)
            governance_git_executed = True
        except RuntimeError as exc:
            return {
                "status": "fail",
                "scope": "domain",
                "dry_run": False,
                "path": str(marker_path),
                "constitution_path": str(constitution_path),
                "created_marker_paths": marker_paths,
                "created_constitution_paths": constitution_paths,
                "target_projects_path": str(tp_gitkeep_path.parent) if tp_gitkeep_path else None,
                "docs_path": str(docs_gitkeep_path.parent) if docs_gitkeep_path else None,
                "context_path": written_context_path,
                "error": f"Governance git execution failed: {exc}",
                **build_container_result_fields(
                    governance_git_commands,
                    workspace_git_commands,
                    governance_commit_sha=current_head_sha(governance_repo),
                ),
            }

    return {
        "status": "pass",
        "dry_run": False,
        "scope": "domain",
        "path": str(marker_path),
        "constitution_path": str(constitution_path),
        "created_marker_paths": marker_paths,
        "created_constitution_paths": constitution_paths,
        "target_projects_path": str(tp_gitkeep_path.parent) if tp_gitkeep_path else None,
        "docs_path": str(docs_gitkeep_path.parent) if docs_gitkeep_path else None,
        "context_path": written_context_path,
        "error": None,
        **build_container_result_fields(
            governance_git_commands,
            workspace_git_commands,
            governance_git_executed=governance_git_executed,
            governance_commit_sha=governance_commit_sha,
        ),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lens init-feature ops")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_domain = subparsers.add_parser("create-domain", help="Create a governance domain")
    create_domain.add_argument("--governance-repo", required=True)
    create_domain.add_argument("--domain", required=True)
    create_domain.add_argument("--name")
    create_domain.add_argument("--username", default="")
    create_domain.add_argument("--target-projects-root")
    create_domain.add_argument("--docs-root")
    create_domain.add_argument("--personal-folder")
    create_domain.add_argument("--execute-governance-git", action="store_true")
    create_domain.add_argument("--dry-run", action="store_true")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "create-domain":
        result = cmd_create_domain(args)
    else:
        result = {"status": "fail", "error": f"Unsupported command: {args.command}"}

    print(json.dumps(result, indent=2, sort_keys=False))
    return 0 if result.get("status") == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
