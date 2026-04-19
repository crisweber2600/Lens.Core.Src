#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Downgrade Lens control-repo schema from version 5 back to version 4.

Reverses the breaking 5 -> 4 terminology rollback:

- `.lens` local state: `workstream/project` -> `domain/service`
- governance index: `milestone-index.yaml` -> `feature-index.yaml`
- governance tree: `milestones/.../milestone.yaml` -> `features/.../feature.yaml`
- lifecycle gates: `checkpoints` -> `milestones`
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path

import yaml


LIFECYCLE_PATH = Path(__file__).resolve().parents[3] / "lifecycle.yaml"
TARGET_VERSION_TEXT = "4.0.0"
FROM_VERSION = "5"
TO_VERSION = "4"


def read_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise RuntimeError(f"Expected YAML mapping at {path}")
    return data


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(content)
        os.replace(temp_path, path)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def atomic_write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(dir=str(path.parent), suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            yaml.dump(data, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)
        os.replace(temp_path, path)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def major_version(value: str) -> str:
    token = str(value or "").strip()
    if not token:
        return ""
    return token.split(".", 1)[0]


def detect_current_version(project_root: Path) -> str:
    for candidate in (project_root / ".lens" / "LENS_VERSION", project_root / "LENS_VERSION"):
        if candidate.is_file():
            return major_version(candidate.read_text(encoding="utf-8"))
    return ""


def load_governance_repo(project_root: Path, explicit: str | None) -> Path | None:
    if explicit:
        return Path(explicit)

    setup_path = project_root / ".lens" / "governance-setup.yaml"
    if not setup_path.is_file():
        return None

    setup = read_yaml(setup_path)
    raw_path = str(setup.get("governance_repo_path") or "").strip()
    if not raw_path:
        return None
    return Path(raw_path)


def ensure_supported_downgrade(from_version: str, to_version: str) -> None:
    """Verify lifecycle.yaml declares a downgrade descriptor for from_version -> to_version."""
    lifecycle = read_yaml(LIFECYCLE_PATH)

    for entry in lifecycle.get("migrations") or []:
        if (
            str(entry.get("from_version")) == from_version
            and str(entry.get("to_version")) == to_version
            and entry.get("direction") == "downgrade"
        ):
            return
    raise RuntimeError(
        f"No lifecycle downgrade descriptor found for {from_version} -> {to_version}"
    )


# ---------------------------------------------------------------------------
# Data transformation helpers (inverse of upgrade-ops transforms)
# ---------------------------------------------------------------------------

def downgrade_context_data(data: dict) -> dict:
    """Revert workstream/project keys back to domain/service in context.yaml."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "workstream":
            migrated["domain"] = value
        elif key == "project":
            migrated["service"] = value
        elif key == "updated_by":
            migrated[key] = {
                "new-workstream": "new-domain",
                "new-project": "new-service",
                "new-milestone": "new-feature",
            }.get(str(value), value)
        else:
            migrated[key] = value
    return migrated


def downgrade_profile_data(data: dict) -> dict:
    """Revert workstream key back to domain in profile.yaml."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "workstream":
            migrated["domain"] = value
        else:
            migrated[key] = value
    return migrated


def downgrade_index_data(data: dict) -> dict:
    """Revert milestone-index structure back to feature-index structure."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "milestones":
            items: list[dict] = []
            for entry in value or []:
                if not isinstance(entry, dict):
                    continue
                feature_id = entry.get("milestoneId") or entry.get("featureId") or entry.get("id")
                new_entry: dict = {}
                for entry_key, entry_value in entry.items():
                    if entry_key == "milestoneId":
                        continue
                    if entry_key == "workstream":
                        new_entry["domain"] = entry_value
                    elif entry_key == "project":
                        new_entry["service"] = entry_value
                    else:
                        new_entry[entry_key] = entry_value
                if feature_id:
                    new_entry["featureId"] = feature_id
                items.append(new_entry)
            migrated["features"] = items
        else:
            migrated[key] = value
    return migrated


def downgrade_workstream_marker(data: dict) -> dict:
    """Revert workstream.yaml back to domain.yaml content."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "kind":
            migrated["kind"] = "domain"
        elif key == "workstream":
            migrated["domain"] = value
        else:
            migrated[key] = value
    return migrated


def downgrade_project_marker(data: dict) -> dict:
    """Revert project.yaml back to service.yaml content."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "kind":
            migrated["kind"] = "service"
        elif key == "workstream":
            migrated["domain"] = value
        elif key == "project":
            migrated["service"] = value
        else:
            migrated[key] = value
    return migrated


def downgrade_milestone_yaml(data: dict) -> dict:
    """Revert milestone.yaml back to feature.yaml content."""
    migrated: dict = {}
    for key, value in data.items():
        if key == "milestoneId":
            migrated["featureId"] = value
        elif key == "workstream":
            migrated["domain"] = value
        elif key == "project":
            migrated["service"] = value
        elif key == "checkpoints":
            migrated["milestones"] = value
        elif key == "docs" and isinstance(value, dict):
            docs = dict(value)
            governance_docs_path = str(docs.get("governance_docs_path") or "")
            if governance_docs_path.startswith("milestones/"):
                docs["governance_docs_path"] = "features/" + governance_docs_path[len("milestones/"):]
            migrated[key] = docs
        else:
            migrated[key] = value
    return migrated


# ---------------------------------------------------------------------------
# Governance downgrade plan and execution
# ---------------------------------------------------------------------------

def build_governance_downgrade_plan(governance_repo: Path) -> tuple[list[str], list[str]]:
    """Return (operations, conflicts) describing the governance downgrade."""
    operations: list[str] = []
    conflicts: list[str] = []

    if not governance_repo.exists():
        conflicts.append(f"Governance repo does not exist: {governance_repo}")
        return operations, conflicts

    milestone_index = governance_repo / "milestone-index.yaml"
    feature_index = governance_repo / "feature-index.yaml"
    milestones_dir = governance_repo / "milestones"
    features_dir = governance_repo / "features"

    if feature_index.exists():
        conflicts.append(f"Target index already exists: {feature_index}")
    if features_dir.exists():
        conflicts.append(f"Target features directory already exists: {features_dir}")

    if milestone_index.exists():
        operations.append("rename milestone-index.yaml -> feature-index.yaml")
    if milestones_dir.exists():
        operations.append("rename governance tree milestones/ -> features/")

    return operations, conflicts


def write_downgraded_governance(governance_repo: Path) -> None:
    """Apply governance downgrade atomically (milestones/ -> features/)."""
    milestone_index = governance_repo / "milestone-index.yaml"
    milestones_dir = governance_repo / "milestones"

    tmp_root = Path(tempfile.mkdtemp(prefix="lens-downgrade-v4-", dir=str(governance_repo)))
    tmp_index = tmp_root / "feature-index.yaml"
    tmp_tree = tmp_root / "features"

    try:
        if milestone_index.exists():
            atomic_write_yaml(tmp_index, downgrade_index_data(read_yaml(milestone_index)))

        if milestones_dir.exists():
            for source in sorted(milestones_dir.rglob("*")):
                if source.is_dir():
                    continue

                rel = source.relative_to(milestones_dir)
                target_rel = rel

                if source.name == "workstream.yaml":
                    target_rel = rel.with_name("domain.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, downgrade_workstream_marker(read_yaml(source)))
                    continue
                if source.name == "project.yaml":
                    target_rel = rel.with_name("service.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, downgrade_project_marker(read_yaml(source)))
                    continue
                if source.name == "milestone.yaml":
                    target_rel = rel.with_name("feature.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, downgrade_milestone_yaml(read_yaml(source)))
                    continue

                destination = tmp_tree / target_rel
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)

        # Backup current v5 files before replacing
        milestone_index_backup = governance_repo / "milestone-index.yaml.v5-backup"
        milestones_backup = governance_repo / "milestones.v5-backup"

        if milestone_index.exists():
            milestone_index.rename(milestone_index_backup)
        if milestones_dir.exists():
            milestones_dir.rename(milestones_backup)

        try:
            if tmp_index.exists():
                tmp_index.rename(governance_repo / "feature-index.yaml")
            if tmp_tree.exists():
                tmp_tree.rename(governance_repo / "features")
        except Exception:
            # Roll back on failure
            if (governance_repo / "feature-index.yaml").exists():
                (governance_repo / "feature-index.yaml").unlink()
            if (governance_repo / "features").exists():
                shutil.rmtree(governance_repo / "features")
            if milestone_index_backup.exists():
                milestone_index_backup.rename(milestone_index)
            if milestones_backup.exists():
                milestones_backup.rename(milestones_dir)
            raise

        # Clean up backups on success
        if milestone_index_backup.exists():
            milestone_index_backup.unlink()
        if milestones_backup.exists():
            shutil.rmtree(milestones_backup)
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


# ---------------------------------------------------------------------------
# Local state downgrade
# ---------------------------------------------------------------------------

def collect_local_downgrade_changes(
    project_root: Path,
) -> tuple[list[str], dict[Path, object], list[str]]:
    """Build the local .lens state downgrade plan."""
    operations: list[str] = []
    writes: dict[Path, object] = {}
    warnings: list[str] = []

    version_path = project_root / ".lens" / "LENS_VERSION"
    operations.append("write .lens/LENS_VERSION = 4.0.0")
    writes[version_path] = TARGET_VERSION_TEXT + "\n"

    context_path = project_root / ".lens" / "personal" / "context.yaml"
    if context_path.exists():
        operations.append("rewrite .lens/personal/context.yaml keys to domain/service")
        writes[context_path] = downgrade_context_data(read_yaml(context_path))
    else:
        warnings.append(f"Local context file not found: {context_path}")

    profile_path = project_root / ".lens" / "personal" / "profile.yaml"
    if profile_path.exists():
        operations.append("rewrite .lens/personal/profile.yaml keys to domain")
        writes[profile_path] = downgrade_profile_data(read_yaml(profile_path))
    else:
        warnings.append(f"Local profile file not found: {profile_path}")

    return operations, writes, warnings


def apply_local_downgrade_changes(writes: dict[Path, object]) -> dict[Path, str | None]:
    """Write downgraded local files with rollback on failure."""
    backups: dict[Path, str | None] = {}
    for path in writes:
        backups[path] = path.read_text(encoding="utf-8") if path.exists() else None

    try:
        for path, value in writes.items():
            if isinstance(value, dict):
                atomic_write_yaml(path, value)
            else:
                atomic_write_text(path, str(value))
    except Exception:
        for path, old_text in backups.items():
            if old_text is None:
                if path.exists():
                    path.unlink()
                continue
            atomic_write_text(path, old_text)
        raise

    return backups


# ---------------------------------------------------------------------------
# Command entry point
# ---------------------------------------------------------------------------

def cmd_downgrade(args: argparse.Namespace) -> dict:
    project_root = Path(args.project_root).resolve()
    governance_repo = load_governance_repo(project_root, getattr(args, "governance_repo", None))
    detected_from = detect_current_version(project_root)
    from_version = str(getattr(args, "from_version", None) or detected_from)
    to_version = str(getattr(args, "to_version", None) or TO_VERSION)

    if from_version != FROM_VERSION or to_version != TO_VERSION:
        return {
            "status": "fail",
            "error": f"Unsupported downgrade path: {from_version} -> {to_version}. Only 5 -> 4 is supported.",
        }

    try:
        ensure_supported_downgrade(from_version, to_version)
    except RuntimeError as exc:
        return {"status": "fail", "error": str(exc)}

    local_operations, local_writes, warnings = collect_local_downgrade_changes(project_root)
    governance_operations: list[str] = []
    conflicts: list[str] = []

    if governance_repo is not None:
        ops, governance_conflicts = build_governance_downgrade_plan(governance_repo)
        governance_operations.extend(ops)
        conflicts.extend(governance_conflicts)
    else:
        warnings.append("Governance repo path not configured; only local .lens state will be downgraded")

    result = {
        "status": "pass" if not conflicts else "fail",
        "from_version": from_version,
        "to_version": to_version,
        "project_root": str(project_root),
        "governance_repo": str(governance_repo) if governance_repo is not None else None,
        "dry_run": bool(args.dry_run),
        "local_operations": local_operations,
        "governance_operations": governance_operations,
        "warnings": warnings,
        "conflicts": conflicts,
    }

    if conflicts or args.dry_run:
        return result

    try:
        apply_local_downgrade_changes(local_writes)
        if governance_repo is not None:
            write_downgraded_governance(governance_repo)
    except Exception as exc:
        return {
            **result,
            "status": "fail",
            "error": str(exc),
        }

    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Downgrade Lens schema from version 5 to version 4")
    parser.add_argument("--project-root", default=".", help="Control-repo root path")
    parser.add_argument("--governance-repo", help="Optional governance repo override")
    parser.add_argument("--from", dest="from_version", help="Source schema version (default: 5)")
    parser.add_argument("--to", dest="to_version", help="Target schema version (default: 4)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing changes")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    result = cmd_downgrade(args)
    print(json.dumps(result, indent=2))
    return 0 if result.get("status") == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
