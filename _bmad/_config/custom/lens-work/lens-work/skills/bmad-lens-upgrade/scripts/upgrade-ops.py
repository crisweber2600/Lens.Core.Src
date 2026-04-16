#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Upgrade Lens control-repo schema between versions.

This implementation currently supports the breaking 4 -> 5 terminology
migration foundation:

- `.lens` local state: `domain/service` -> `workstream/project`
- governance index: `feature-index.yaml` -> `milestone-index.yaml`
- governance tree: `features/.../feature.yaml` -> `milestones/.../milestone.yaml`
- lifecycle gates: `milestones` -> `checkpoints`
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
TARGET_VERSION_TEXT = "5.0.0"


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


def ensure_supported_migration(from_version: str, to_version: str) -> None:
    lifecycle = read_yaml(LIFECYCLE_PATH)
    if str(lifecycle.get("schema_version") or "") != to_version:
        raise RuntimeError(
            f"lifecycle.yaml schema_version is {lifecycle.get('schema_version')}, expected {to_version}"
        )

    for entry in lifecycle.get("migrations") or []:
        if str(entry.get("from_version")) == from_version and str(entry.get("to_version")) == to_version:
            return
    raise RuntimeError(f"No lifecycle migration descriptor found for {from_version} -> {to_version}")


def migrate_context_data(data: dict) -> dict:
    migrated: dict = {}
    for key, value in data.items():
        if key == "domain":
            migrated["workstream"] = value
        elif key == "service":
            migrated["project"] = value
        elif key == "updated_by":
            migrated[key] = {
                "new-domain": "new-workstream",
                "new-service": "new-project",
                "new-feature": "new-milestone",
            }.get(str(value), value)
        else:
            migrated[key] = value
    return migrated


def migrate_profile_data(data: dict) -> dict:
    migrated: dict = {}
    for key, value in data.items():
        if key == "domain":
            migrated["workstream"] = value
        else:
            migrated[key] = value
    return migrated


def migrate_index_data(data: dict) -> dict:
    migrated: dict = {}
    for key, value in data.items():
        if key == "features":
            items: list[dict] = []
            for entry in value or []:
                if not isinstance(entry, dict):
                    continue
                milestone_id = entry.get("milestoneId") or entry.get("featureId") or entry.get("id")
                new_entry: dict = {}
                for entry_key, entry_value in entry.items():
                    if entry_key in {"featureId", "id"}:
                        continue
                    if entry_key == "domain":
                        new_entry["workstream"] = entry_value
                    elif entry_key == "service":
                        new_entry["project"] = entry_value
                    else:
                        new_entry[entry_key] = entry_value
                if milestone_id:
                    new_entry["milestoneId"] = milestone_id
                items.append(new_entry)
            migrated["milestones"] = items
        else:
            migrated[key] = value
    return migrated


def migrate_marker_data(data: dict, marker_type: str) -> dict:
    migrated: dict = {}
    for key, value in data.items():
        if key == "kind":
            migrated["kind"] = marker_type
        elif key == "domain":
            migrated["workstream"] = value
        elif key == "service":
            migrated["project"] = value
        else:
            migrated[key] = value
    return migrated


def migrate_milestone_yaml(data: dict) -> dict:
    migrated: dict = {}
    for key, value in data.items():
        if key == "featureId":
            migrated["milestoneId"] = value
        elif key == "domain":
            migrated["workstream"] = value
        elif key == "service":
            migrated["project"] = value
        elif key == "milestones":
            migrated["checkpoints"] = value
        elif key == "docs" and isinstance(value, dict):
            docs = dict(value)
            governance_docs_path = str(docs.get("governance_docs_path") or "")
            if governance_docs_path.startswith("features/"):
                docs["governance_docs_path"] = "milestones/" + governance_docs_path[len("features/") :]
            migrated[key] = docs
        else:
            migrated[key] = value
    return migrated


def build_governance_plan(governance_repo: Path) -> tuple[list[str], list[str]]:
    operations: list[str] = []
    conflicts: list[str] = []

    if not governance_repo.exists():
        conflicts.append(f"Governance repo does not exist: {governance_repo}")
        return operations, conflicts

    feature_index = governance_repo / "feature-index.yaml"
    milestone_index = governance_repo / "milestone-index.yaml"
    features_dir = governance_repo / "features"
    milestones_dir = governance_repo / "milestones"

    if milestone_index.exists():
        conflicts.append(f"Target index already exists: {milestone_index}")
    if milestones_dir.exists():
        conflicts.append(f"Target milestones directory already exists: {milestones_dir}")

    if feature_index.exists():
        operations.append("rename feature-index.yaml -> milestone-index.yaml")
    if features_dir.exists():
        operations.append("rename governance tree features/ -> milestones/")

    return operations, conflicts


def write_transformed_governance(governance_repo: Path) -> None:
    feature_index = governance_repo / "feature-index.yaml"
    features_dir = governance_repo / "features"

    tmp_root = Path(tempfile.mkdtemp(prefix="lens-upgrade-v5-", dir=str(governance_repo)))
    tmp_index = tmp_root / "milestone-index.yaml"
    tmp_tree = tmp_root / "milestones"

    try:
        if feature_index.exists():
            atomic_write_yaml(tmp_index, migrate_index_data(read_yaml(feature_index)))

        if features_dir.exists():
            for source in sorted(features_dir.rglob("*")):
                if source.is_dir():
                    continue

                rel = source.relative_to(features_dir)
                target_rel = rel
                if source.name == "domain.yaml":
                    target_rel = rel.with_name("workstream.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, migrate_marker_data(read_yaml(source), "workstream"))
                    continue
                if source.name == "service.yaml":
                    target_rel = rel.with_name("project.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, migrate_marker_data(read_yaml(source), "project"))
                    continue
                if source.name == "feature.yaml":
                    target_rel = rel.with_name("milestone.yaml")
                    atomic_write_yaml(tmp_tree / target_rel, migrate_milestone_yaml(read_yaml(source)))
                    continue

                destination = tmp_tree / target_rel
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)

        feature_index_backup = governance_repo / "feature-index.yaml.v4-backup"
        features_backup = governance_repo / "features.v4-backup"

        if feature_index.exists():
            feature_index.rename(feature_index_backup)
        if features_dir.exists():
            features_dir.rename(features_backup)

        try:
            if tmp_index.exists():
                tmp_index.rename(governance_repo / "milestone-index.yaml")
            if tmp_tree.exists():
                tmp_tree.rename(governance_repo / "milestones")
        except Exception:
            if (governance_repo / "milestone-index.yaml").exists():
                (governance_repo / "milestone-index.yaml").unlink()
            if (governance_repo / "milestones").exists():
                shutil.rmtree(governance_repo / "milestones")
            if feature_index_backup.exists():
                feature_index_backup.rename(feature_index)
            if features_backup.exists():
                features_backup.rename(features_dir)
            raise

        if feature_index_backup.exists():
            feature_index_backup.unlink()
        if features_backup.exists():
            shutil.rmtree(features_backup)
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


def collect_local_changes(project_root: Path) -> tuple[list[str], dict[Path, object], list[str]]:
    operations: list[str] = []
    writes: dict[Path, object] = {}
    warnings: list[str] = []

    version_path = project_root / ".lens" / "LENS_VERSION"
    operations.append("write .lens/LENS_VERSION = 5.0.0")
    writes[version_path] = TARGET_VERSION_TEXT + "\n"

    context_path = project_root / ".lens" / "personal" / "context.yaml"
    if context_path.exists():
        operations.append("rewrite .lens/personal/context.yaml keys to workstream/project")
        writes[context_path] = migrate_context_data(read_yaml(context_path))
    else:
        warnings.append(f"Local context file not found: {context_path}")

    profile_path = project_root / ".lens" / "personal" / "profile.yaml"
    if profile_path.exists():
        operations.append("rewrite .lens/personal/profile.yaml keys to workstream")
        writes[profile_path] = migrate_profile_data(read_yaml(profile_path))
    else:
        warnings.append(f"Local profile file not found: {profile_path}")

    return operations, writes, warnings


def apply_local_changes(writes: dict[Path, object]) -> dict[Path, str | None]:
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


def cmd_upgrade(args: argparse.Namespace) -> dict:
    project_root = Path(args.project_root).resolve()
    governance_repo = load_governance_repo(project_root, args.governance_repo)
    detected_from = detect_current_version(project_root)
    from_version = str(args.from_version or detected_from)
    to_version = str(args.to_version or "5")

    try:
        ensure_supported_migration(from_version, to_version)
    except RuntimeError as exc:
        return {"status": "fail", "error": str(exc)}

    if from_version != "4" or to_version != "5":
        return {"status": "fail", "error": f"Unsupported upgrade path: {from_version} -> {to_version}"}

    local_operations, local_writes, warnings = collect_local_changes(project_root)
    governance_operations: list[str] = []
    conflicts: list[str] = []

    if governance_repo is not None:
        ops, governance_conflicts = build_governance_plan(governance_repo)
        governance_operations.extend(ops)
        conflicts.extend(governance_conflicts)
    else:
        warnings.append("Governance repo path not configured; only local .lens state will be upgraded")

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
        apply_local_changes(local_writes)
        if governance_repo is not None:
            write_transformed_governance(governance_repo)
    except Exception as exc:
        return {
            **result,
            "status": "fail",
            "error": str(exc),
        }

    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Upgrade Lens schema between versions")
    parser.add_argument("--project-root", default=".", help="Control-repo root path")
    parser.add_argument("--governance-repo", help="Optional governance repo override")
    parser.add_argument("--from", dest="from_version", help="Source schema version")
    parser.add_argument("--to", dest="to_version", help="Target schema version")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing changes")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    result = cmd_upgrade(args)
    print(json.dumps(result, indent=2))
    return 0 if result.get("status") == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())