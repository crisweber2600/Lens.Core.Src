#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Complete operations — feature lifecycle archival for Lens governance.

Subcommands:
  check-preconditions  Validate a feature is ready to be finalized (read-only).
  finalize             Archive the feature atomically (write; requires --confirm or --dry-run).
  archive-status       Report archive state without modifying any file (read-only).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

COMPLETABLE_PHASES = {"dev", "dev-complete"}
TERMINAL_PHASES = {"complete", "abandoned"}
PLANNING_PHASES = {
    "preplan", "businessplan", "techplan", "finalizeplan",
    "expressplan", "expressplan-complete", "finalizeplan-complete",
    "techplan-complete", "businessplan-complete",
}

# Governance keys that must never appear after finalize that weren't there before
ALLOWED_WRITE_FILES = {"feature.yaml", "feature-index.yaml", "summary.md"}


# ---------------------------------------------------------------------------
# JSON output helpers
# ---------------------------------------------------------------------------

def _out(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2, default=str))


def _fail(error: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"status": "fail", "error": error, "message": message, **extra}


# ---------------------------------------------------------------------------
# YAML helpers
# ---------------------------------------------------------------------------

def _read_yaml(path: Path) -> dict[str, Any]:
    """Read a YAML file and return a dict. Raises ValueError on parse/read failure."""
    try:
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
    except (OSError, yaml.YAMLError) as exc:
        raise ValueError(f"Could not read {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping, got {type(data).__name__}")
    return data


def _atomic_write_yaml(path: Path, data: dict[str, Any]) -> None:
    """Write YAML to path atomically via a temp file + rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)
        os.replace(tmp, str(path))
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _atomic_write_text(path: Path, content: str) -> None:
    """Write text to path atomically via a temp file + rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.replace(tmp, str(path))
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Governance path resolution
# ---------------------------------------------------------------------------

def _resolve_governance_repo(args: argparse.Namespace) -> Path:
    explicit = getattr(args, "governance_repo", None)
    if explicit:
        return Path(explicit).resolve()

    workspace_root = Path(getattr(args, "workspace_root", None) or os.getcwd()).resolve()
    override = workspace_root / ".lens" / "governance-setup.yaml"
    if override.exists():
        try:
            data = _read_yaml(override)
            val = str(data.get("governance_repo_path") or "").strip()
            if val:
                return Path(val.replace("{project-root}", str(workspace_root))).resolve()
        except ValueError:
            pass

    for candidate in [
        workspace_root / "_bmad" / "lens-work" / "bmadconfig.yaml",
        workspace_root / "lens.core" / "_bmad" / "lens-work" / "bmadconfig.yaml",
    ]:
        if candidate.exists():
            try:
                data = _read_yaml(candidate)
                val = str(data.get("governance_repo_path") or "").strip()
                if val:
                    return Path(val.replace("{project-root}", str(workspace_root))).resolve()
            except ValueError:
                pass

    raise ValueError("governance_repo_path not found in any config. Run /lens-onboard first.")


def _discover_feature_dir(governance_repo: Path, feature_id: str) -> Path | None:
    """Find the feature directory by scanning features/{domain}/{service}/{featureId}/."""
    features_root = governance_repo / "features"
    if not features_root.is_dir():
        return None
    # Try direct path derivation from featureId segments first
    candidate = features_root
    for entry in features_root.rglob(f"{feature_id}"):
        if entry.is_dir() and (entry / "feature.yaml").exists():
            return entry
    return None


def _find_feature_yaml(governance_repo: Path, feature_id: str) -> Path | None:
    """Return path to feature.yaml for feature_id, or None if not found."""
    feature_dir = _discover_feature_dir(governance_repo, feature_id)
    if feature_dir:
        return feature_dir / "feature.yaml"
    return None


# ---------------------------------------------------------------------------
# Retrospective check helpers
# ---------------------------------------------------------------------------

def _check_retrospective(feature_dir: Path) -> dict[str, Any] | None:
    """Return a blocker dict if retrospective is missing or not approved, else None."""
    retro_path = feature_dir / "retrospective.md"
    if not retro_path.exists():
        return {
            "name": "retrospective",
            "status": "fail",
            "blocker": "retrospective_missing",
            "message": (
                "retrospective.md is required before completing a feature. "
                "Run 'lens-retrospective' to create it, then set status: approved."
            ),
        }
    # Check frontmatter status
    text = retro_path.read_text(encoding="utf-8")
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1])
                if isinstance(fm, dict):
                    retro_status = str(fm.get("status") or "").strip()
                    if retro_status != "approved":
                        return {
                            "name": "retrospective",
                            "status": "fail",
                            "blocker": "retrospective_not_approved",
                            "retrospective_status": retro_status,
                            "message": (
                                f"retrospective.md exists but status is '{retro_status}', not 'approved'. "
                                "Update the file and set status: approved before completing."
                            ),
                        }
            except yaml.YAMLError:
                return {
                    "name": "retrospective",
                    "status": "fail",
                    "blocker": "retrospective_not_approved",
                    "retrospective_status": "malformed_frontmatter",
                    "message": (
                        "retrospective.md frontmatter could not be parsed. "
                        "Fix the YAML and set status: approved before completing."
                    ),
                }
    # No frontmatter or missing status — treat as not approved
    text_stripped = text.strip()
    if not text_stripped.startswith("---"):
        return {
            "name": "retrospective",
            "status": "fail",
            "blocker": "retrospective_not_approved",
            "retrospective_status": "no_frontmatter",
            "message": (
                "retrospective.md has no YAML frontmatter. "
                "Add frontmatter with status: approved before completing."
            ),
        }
    return None


def _check_document_project(feature_dir: Path) -> dict[str, Any]:
    """Check for document-project output (advisory, not a blocker)."""
    # Common document-project output patterns
    indicators = [
        feature_dir / "project-documentation.md",
        feature_dir / "project-docs.md",
        feature_dir / "docs" / "project-documentation.md",
    ]
    found = any(p.exists() for p in indicators)
    if found:
        return {"name": "document_project", "status": "pass", "message": "Project documentation artifact found."}
    return {
        "name": "document_project",
        "status": "warn",
        "message": (
            "No project documentation artifact found. "
            "Consider running lens-document-project before finalizing."
        ),
    }


# ---------------------------------------------------------------------------
# check-preconditions
# ---------------------------------------------------------------------------

def cmd_check_preconditions(args: argparse.Namespace) -> int:
    feature_id = str(getattr(args, "feature_id", "") or "").strip()
    if not feature_id:
        _out(_fail("feature_id_missing", "Provide --feature-id."))
        return 1

    try:
        governance_repo = _resolve_governance_repo(args)
    except ValueError as exc:
        _out(_fail("config_missing", str(exc)))
        return 1

    feature_yaml_path = _find_feature_yaml(governance_repo, feature_id)
    if feature_yaml_path is None:
        _out(_fail("feature_not_found", f"feature.yaml not found for '{feature_id}' in {governance_repo}/features/."))
        return 1

    try:
        feature_data = _read_yaml(feature_yaml_path)
    except ValueError as exc:
        _out(_fail("feature_yaml_malformed", str(exc)))
        return 1

    feature_dir = feature_yaml_path.parent
    phase = str(feature_data.get("phase") or "").strip()
    checks: list[dict[str, Any]] = []
    blockers: list[str] = []
    warnings: list[str] = []

    # Phase check
    if phase in TERMINAL_PHASES:
        phase_check = {
            "name": "phase",
            "status": "fail",
            "message": f"Feature phase is '{phase}'; feature is already terminal and cannot be re-completed.",
        }
        blockers.append("phase")
    elif phase in PLANNING_PHASES:
        phase_check = {
            "name": "phase",
            "status": "fail",
            "message": (
                f"Feature phase is '{phase}'; expected dev or dev-complete to complete. "
                "Advance through all planning phases first."
            ),
        }
        blockers.append("phase")
    elif phase in COMPLETABLE_PHASES:
        phase_check = {"name": "phase", "status": "pass", "message": f"Feature phase '{phase}' is completable."}
    else:
        phase_check = {
            "name": "phase",
            "status": "fail",
            "message": f"Feature phase '{phase}' is unrecognized. Expected dev or dev-complete.",
        }
        blockers.append("phase")
    checks.append(phase_check)

    # Retrospective check (blocking)
    retro_result = _check_retrospective(feature_dir)
    if retro_result is not None:
        checks.append(retro_result)
        blockers.append(retro_result["blocker"])
    else:
        checks.append({"name": "retrospective", "status": "pass", "message": "retrospective.md exists and status is approved."})

    # Document-project check (advisory)
    doc_check = _check_document_project(feature_dir)
    checks.append(doc_check)
    if doc_check["status"] == "warn":
        warnings.append("document_project_skipped")

    # Aggregate result
    if blockers:
        # Surface the first blocker's message as top-level for easy reading
        first_blocker_check = next(c for c in checks if c.get("status") == "fail")
        _out(
            _fail(
                first_blocker_check.get("blocker", "check_failed"),
                first_blocker_check["message"],
                feature_id=feature_id,
                phase=phase,
                checks=checks,
                blockers=blockers,
                warnings=warnings,
            )
        )
        return 1

    overall = "warn" if warnings else "pass"
    _out(
        {
            "status": overall,
            "feature_id": feature_id,
            "phase": phase,
            "retrospective_skipped": False,
            "document_project_skipped": bool(warnings),
            "checks": checks,
            "warnings": warnings,
            "blockers": [],
        }
    )
    return 0


# ---------------------------------------------------------------------------
# finalize
# ---------------------------------------------------------------------------

def cmd_finalize(args: argparse.Namespace) -> int:
    feature_id = str(getattr(args, "feature_id", "") or "").strip()
    dry_run: bool = bool(getattr(args, "dry_run", False))
    confirm: bool = bool(getattr(args, "confirm", False))

    if not feature_id:
        _out(_fail("feature_id_missing", "Provide --feature-id."))
        return 1

    if not dry_run and not confirm:
        _out(
            _fail(
                "confirmation_required",
                "finalize is irreversible. Pass --confirm to execute or --dry-run to preview.",
            )
        )
        return 1

    try:
        governance_repo = _resolve_governance_repo(args)
    except ValueError as exc:
        _out(_fail("config_missing", str(exc)))
        return 1

    feature_yaml_path = _find_feature_yaml(governance_repo, feature_id)
    if feature_yaml_path is None:
        _out(_fail("feature_not_found", f"feature.yaml not found for '{feature_id}'."))
        return 1

    try:
        feature_data = _read_yaml(feature_yaml_path)
    except ValueError as exc:
        _out(_fail("feature_yaml_malformed", str(exc)))
        return 1

    # Run preconditions — finalize requires pass or warn; fail aborts
    phase = str(feature_data.get("phase") or "").strip()
    feature_dir = feature_yaml_path.parent

    # Inline precondition check for finalize (mirrors check-preconditions logic)
    retro_result = _check_retrospective(feature_dir)
    if phase not in COMPLETABLE_PHASES:
        _out(
            _fail(
                "wrong_phase",
                f"Feature phase is '{phase}'; expected dev or dev-complete. check-preconditions failed.",
                feature_id=feature_id,
                phase=phase,
            )
        )
        return 1
    if retro_result is not None:
        _out(
            _fail(
                retro_result["blocker"],
                retro_result["message"],
                feature_id=feature_id,
            )
        )
        return 1

    # Load feature-index.yaml
    index_path = governance_repo / "feature-index.yaml"
    if not index_path.exists():
        _out(_fail("feature_index_malformed", f"feature-index.yaml not found at {index_path}."))
        return 1
    try:
        index_data = _read_yaml(index_path)
    except ValueError as exc:
        _out(_fail("feature_index_malformed", str(exc)))
        return 1

    summary_path = feature_dir / "summary.md"
    now_ts = datetime.now(timezone.utc).isoformat()

    planned_changes = [
        {"path": str(feature_yaml_path.relative_to(governance_repo)), "change": f"phase: {phase} → complete, completed_at: {now_ts}"},
        {"path": str(index_path.relative_to(governance_repo)), "change": f"status for '{feature_id}': {_index_status(index_data, feature_id)} → archived"},
        {"path": str(summary_path.relative_to(governance_repo)), "change": "write archive summary section"},
    ]

    doc_check = _check_document_project(feature_dir)
    warnings = []
    if doc_check["status"] == "warn":
        warnings.append("document_project_skipped")

    if dry_run:
        _out(
            {
                "status": "dry_run",
                "feature_id": feature_id,
                "planned_changes": planned_changes,
                "warnings": warnings,
            }
        )
        return 0

    # --- Execute atomic writes ---
    # 1. Update feature.yaml
    feature_data["phase"] = "complete"
    feature_data["completed_at"] = now_ts
    # Record the transition
    transitions = feature_data.get("phase_transitions")
    if not isinstance(transitions, list):
        transitions = []
    transitions.append({"phase": "complete", "timestamp": now_ts, "user": "lens-complete"})
    feature_data["phase_transitions"] = transitions

    try:
        _atomic_write_yaml(feature_yaml_path, feature_data)
    except Exception as exc:
        _out(_fail("write_failed", f"Failed to write feature.yaml: {exc}"))
        return 1

    # 2. Update feature-index.yaml
    entries = index_data.get("features")
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict) and (entry.get("id") == feature_id or entry.get("featureId") == feature_id):
                entry["status"] = "archived"
                entry["updated_at"] = now_ts
                break

    try:
        _atomic_write_yaml(index_path, index_data)
    except Exception as exc:
        # Partial write — attempt to rollback feature.yaml
        _out(_fail("write_failed", f"Failed to write feature-index.yaml: {exc}. feature.yaml may be partially updated."))
        return 1

    # 3. Write summary.md
    summary_content = _build_summary(feature_data, feature_id, now_ts)
    try:
        _atomic_write_text(summary_path, summary_content)
    except Exception as exc:
        _out(_fail("write_failed", f"Failed to write summary.md: {exc}. feature.yaml and feature-index.yaml have been updated."))
        return 1

    changes_applied = [
        {"path": str(feature_yaml_path.relative_to(governance_repo)), "change": "phase → complete"},
        {"path": str(index_path.relative_to(governance_repo)), "change": "status → archived"},
        {"path": str(summary_path.relative_to(governance_repo)), "change": "archive summary written"},
    ]

    _out(
        {
            "status": "complete",
            "feature_id": feature_id,
            "archived_at": now_ts,
            "changes_applied": changes_applied,
            "retrospective_skipped": False,
            "document_project_skipped": bool(warnings),
            "warnings": warnings,
        }
    )
    return 0


def _index_status(index_data: dict[str, Any], feature_id: str) -> str:
    for entry in index_data.get("features") or []:
        if isinstance(entry, dict) and (entry.get("id") == feature_id or entry.get("featureId") == feature_id):
            return str(entry.get("status") or "unknown")
    return "not_found"


def _build_summary(feature_data: dict[str, Any], feature_id: str, archived_at: str) -> str:
    name = feature_data.get("name") or feature_id
    domain = feature_data.get("domain") or ""
    service = feature_data.get("service") or ""
    track = feature_data.get("track") or ""
    return (
        f"---\n"
        f"feature: {feature_id}\n"
        f"doc_type: summary\n"
        f"status: archived\n"
        f"archived_at: {archived_at}\n"
        f"---\n\n"
        f"# {name}\n\n"
        f"**Domain:** {domain}  \n"
        f"**Service:** {service}  \n"
        f"**Track:** {track}  \n"
        f"**Archived:** {archived_at}\n\n"
        f"## Archive Notes\n\n"
        f"Feature archived via `lens-complete`. "
        f"See `feature.yaml` for full lifecycle history.\n"
    )


# ---------------------------------------------------------------------------
# archive-status
# ---------------------------------------------------------------------------

def cmd_archive_status(args: argparse.Namespace) -> int:
    feature_id = str(getattr(args, "feature_id", "") or "").strip()
    if not feature_id:
        _out(_fail("feature_id_missing", "Provide --feature-id."))
        return 1

    try:
        governance_repo = _resolve_governance_repo(args)
    except ValueError as exc:
        _out(_fail("config_missing", str(exc)))
        return 1

    feature_yaml_path = _find_feature_yaml(governance_repo, feature_id)
    if feature_yaml_path is None:
        _out(_fail("feature_not_found", f"feature.yaml not found for '{feature_id}'."))
        return 1

    try:
        feature_data = _read_yaml(feature_yaml_path)
    except ValueError as exc:
        _out(_fail("feature_yaml_malformed", str(exc)))
        return 1

    index_path = governance_repo / "feature-index.yaml"
    index_status = "unknown"
    if index_path.exists():
        try:
            index_data = _read_yaml(index_path)
            index_status = _index_status(index_data, feature_id)
        except ValueError:
            index_status = "malformed"

    phase = str(feature_data.get("phase") or "").strip()
    archived = phase == "complete"
    completed_at = feature_data.get("completed_at")

    _out(
        {
            "status": "pass",
            "feature_id": feature_id,
            "archived": archived,
            "phase": phase,
            "index_status": index_status,
            "completed_at": completed_at,
        }
    )
    return 0


# ---------------------------------------------------------------------------
# CLI parser
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="complete-ops — Lens feature lifecycle archival operations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="subcommand", required=True)

    # Shared parent
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--governance-repo", dest="governance_repo", default=None)
    shared.add_argument("--feature-id", dest="feature_id", required=True)
    shared.add_argument("--workspace-root", dest="workspace_root", default=None)

    # check-preconditions
    sub.add_parser("check-preconditions", parents=[shared],
                   help="Validate a feature is ready to be finalized (read-only)")

    # finalize
    p_fin = sub.add_parser("finalize", parents=[shared],
                            help="Archive a feature atomically")
    p_fin.add_argument("--dry-run", dest="dry_run", action="store_true",
                       help="Preview changes without writing")
    p_fin.add_argument("--confirm", dest="confirm", action="store_true",
                       help="Required for non-dry-run execution")

    # archive-status
    sub.add_parser("archive-status", parents=[shared],
                   help="Report archive state without modifying any file (read-only)")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    dispatch = {
        "check-preconditions": cmd_check_preconditions,
        "finalize": cmd_finalize,
        "archive-status": cmd_archive_status,
    }
    handler = dispatch.get(args.subcommand)
    if handler is None:
        _out(_fail("unknown_subcommand", f"Unknown subcommand: {args.subcommand}"))
        return 1
    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
