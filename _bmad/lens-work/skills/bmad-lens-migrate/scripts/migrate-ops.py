#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Migration operations — scan legacy LENS v3 branches, check conflicts, migrate features.

Transitions features from the old domain-service-feature-milestone branch topology
to the Lens Next 2-branch model ({featureId} + {featureId}-plan).
"""

import argparse
import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import yaml

# Sanitization pattern for path-constructing identifiers
SAFE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")

SCRIPT_DIR = Path(__file__).resolve().parent
INIT_FEATURE_OPS_PATH = SCRIPT_DIR.parent.parent / "bmad-lens-init-feature" / "scripts" / "init-feature-ops.py"
PROBLEMS_TEMPLATE_PATH = SCRIPT_DIR.parent.parent.parent / "assets" / "templates" / "problems-template.md"
LEGACY_BRANCHES_DIR = "branches"
LEGACY_ARTIFACTS_DIR = Path("_bmad-output/lens-work/planning-artifacts")

# Document source types for discovery
DOC_SOURCE_GOVERNANCE_LEGACY = "governance-legacy"
DOC_SOURCE_REPO_DOCS = "source-docs"
DOC_SOURCE_BMAD_OUTPUT = "bmad-output"

# Priority order for conflict resolution (first wins)
DOC_SOURCE_PRIORITY = [DOC_SOURCE_GOVERNANCE_LEGACY, DOC_SOURCE_REPO_DOCS, DOC_SOURCE_BMAD_OUTPUT]

LEGACY_PHASE_MAP = {
    "planning": "preplan",
    "preplan": "preplan",
    "businessplan": "businessplan",
    "techplan": "techplan",
    "devproposal": "sprintplan",
    "sprintplan": "sprintplan",
    "dev": "dev",
    "dev-ready": "dev",
    "complete": "complete",
    "paused": "paused",
}

LEGACY_MILESTONE_MAP = {
    "businessplan": "businessplan",
    "techplan": "techplan",
    "devproposal": "sprintplan",
    "sprintplan": "sprintplan",
    "dev-ready": "dev-ready",
    "dev-complete": "dev-complete",
}

# Default legacy branch pattern
DEFAULT_BRANCH_PATTERN = r"^([a-z0-9-]+)-([a-z0-9-]+)-([a-z0-9-]+)(?:-([a-z0-9-]+))?$"

# Phase ordering for state derivation (earliest to latest)
PHASE_ORDER = ["planning", "businessplan", "techplan", "sprintplan", "dev", "complete"]


def validate_identifier(value: str, field_name: str) -> str | None:
    """Validate that a path-constructing identifier is safe. Returns error message or None."""
    if not SAFE_ID_PATTERN.match(value):
        return (
            f"Invalid {field_name}: '{value}'. "
            f"Must match [a-z0-9][a-z0-9._-]{{0,63}} (lowercase alphanumeric, dots, hyphens, underscores)."
        )
    return None


def now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@lru_cache(maxsize=1)
def load_init_feature_ops():
    """Load the canonical init-feature helper module by file path."""
    spec = importlib.util.spec_from_file_location("lens_init_feature_ops", INIT_FEATURE_OPS_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load init-feature helpers from {INIT_FEATURE_OPS_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def atomic_write_yaml(path: Path, data: dict) -> None:
    """Write YAML atomically via temp file + rename to prevent corruption."""
    dir_path = path.parent
    fd, tmp_path = tempfile.mkstemp(dir=str(dir_path), suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w") as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        os.replace(tmp_path, str(path))
    except Exception:
        os.unlink(tmp_path)
        raise


def read_yaml_if_exists(path: Path) -> dict | None:
    """Return parsed YAML if the file exists and is valid, else None."""
    if not path.exists() or not path.is_file():
        return None
    try:
        with open(path) as f:
            data = yaml.safe_load(f)
    except (yaml.YAMLError, OSError):
        return None
    return data if isinstance(data, dict) else None


def group_legacy_branches(names: list[str]) -> dict[str, dict]:
    """Group branch names into base branches with their milestones.

    Uses prefix-matching: if name B starts with name A + "-", then B is a
    milestone branch of A, and B's suffix (after A + "-") is the milestone label.
    Names not identified as milestones of any other name are treated as base branches.
    """
    sorted_names = sorted(names)
    milestone_map: dict[str, list[str]] = {}
    is_milestone: set[str] = set()

    for name in sorted_names:
        for base in sorted_names:
            if base == name:
                continue
            prefix = base + "-"
            if name.startswith(prefix):
                milestone = name[len(prefix):]
                if base not in milestone_map:
                    milestone_map[base] = []
                milestone_map[base].append(milestone)
                is_milestone.add(name)

    features = {}
    for name in sorted_names:
        if name in is_milestone:
            continue
        parts = name.split("-")
        if len(parts) < 3:
            continue
        domain = parts[0]
        service = parts[1]
        feature_id = "-".join(parts[2:])
        features[name] = {
            "old_id": name,
            "derived_domain": domain,
            "derived_service": service,
            "feature_id": feature_id,
            "milestones": milestone_map.get(name, []),
        }

    return features


def derive_state(milestones: list[str]) -> str:
    """Derive current state from list of discovered milestone labels."""
    for phase in reversed(PHASE_ORDER):
        if phase in milestones:
            return phase
    return "preplan" if not milestones else "planning"


def normalize_phase(raw_phase: str | None) -> tuple[str, list[str]]:
    """Normalize a legacy phase into the current Lens phase set."""
    warnings: list[str] = []
    if not raw_phase:
        return "preplan", warnings

    phase = str(raw_phase).strip().lower()
    mapped = LEGACY_PHASE_MAP.get(phase)
    if mapped is None:
        warnings.append(f"Unknown legacy phase '{phase}' defaulted to 'preplan'")
        return "preplan", warnings
    if mapped != phase:
        warnings.append(f"Mapped legacy phase '{phase}' to '{mapped}'")
    return mapped, warnings


def normalize_milestone(raw_milestone: str | None) -> tuple[str | None, list[str]]:
    """Normalize a legacy milestone into the current Lens milestone set."""
    warnings: list[str] = []
    if not raw_milestone:
        return None, warnings

    milestone = str(raw_milestone).strip().lower()
    mapped = LEGACY_MILESTONE_MAP.get(milestone)
    if mapped is None:
        warnings.append(f"Ignored unmapped legacy milestone '{milestone}'")
        return None, warnings
    if mapped != milestone:
        warnings.append(f"Mapped legacy milestone '{milestone}' to '{mapped}'")
    return mapped, warnings


def normalize_phase_transitions(transitions: object, timestamp: str, username: str) -> tuple[list[dict], list[str]]:
    """Normalize legacy phase transition records to the current Lens shape."""
    warnings: list[str] = []
    normalized: list[dict] = []

    if isinstance(transitions, list):
        for entry in transitions:
            if not isinstance(entry, dict):
                continue
            phase, phase_warnings = normalize_phase(entry.get("phase"))
            warnings.extend(phase_warnings)
            normalized.append(
                {
                    "phase": phase,
                    "timestamp": entry.get("timestamp") or timestamp,
                    "user": entry.get("user") or username,
                }
            )

    if not normalized:
        normalized = [{"phase": "preplan", "timestamp": timestamp, "user": username}]

    return normalized, warnings


def detect_legacy_milestones(governance_repo: Path, old_id: str) -> list[str]:
    """Infer legacy milestone suffixes from sibling branch directories."""
    branches_dir = governance_repo / LEGACY_BRANCHES_DIR
    if not branches_dir.exists():
        return []

    prefix = old_id + "-"
    milestones: list[str] = []
    for entry in sorted(branches_dir.iterdir()):
        if entry.is_dir() and entry.name.startswith(prefix):
            milestones.append(entry.name[len(prefix):])
    return milestones


def find_legacy_state(governance_repo: Path, old_id: str, domain: str, service: str, feature_id: str) -> tuple[dict | None, str | None]:
    """Locate a legacy initiative-state.yaml in known historical locations."""
    branch_dir = governance_repo / LEGACY_BRANCHES_DIR / old_id
    candidates = [
        branch_dir / "initiative-state.yaml",
        branch_dir / "_bmad-output" / "lens-work" / "initiative-state.yaml",
        branch_dir / "_bmad-output" / "lens-work" / "initiatives" / domain / service / feature_id / "initiative-state.yaml",
        branch_dir / "_bmad-output" / "lens-work" / "initiatives" / domain / service / "initiative-state.yaml",
    ]

    for path in candidates:
        data = read_yaml_if_exists(path)
        if data is not None:
            return data, str(path)

    return None, None


def render_problems_template(feature_id: str, domain: str, service: str, created_date: str) -> str:
    """Render the standard problems.md template with feature values."""
    if PROBLEMS_TEMPLATE_PATH.exists():
        template = PROBLEMS_TEMPLATE_PATH.read_text(encoding="utf-8")
    else:
        template = (
            "# Problems Log: {featureId}\n\n"
            "> Feature: {domain}/{service}/{featureId}\n"
            "> Created: {created_date}\n\n"
            "<!-- Entries appended by /log-problem. Consumed by /retrospective. -->\n\n"
            "---\n"
        )

    return (
        template.replace("{featureId}", feature_id)
        .replace("{domain}", domain)
        .replace("{service}", service)
        .replace("{created_date}", created_date)
    )


def create_problems_log(feature_dir: Path, feature_id: str, domain: str, service: str, created_date: str) -> bool:
    """Create a problems.md file if one is not already present."""
    problems_path = feature_dir / "problems.md"
    if problems_path.exists():
        return False
    problems_path.write_text(
        render_problems_template(feature_id, domain, service, created_date),
        encoding="utf-8",
    )
    return True


def copy_legacy_artifacts(governance_repo: Path, old_id: str, feature_dir: Path) -> list[str]:
    """Copy legacy planning artifacts from the old branch snapshot when present."""
    source_root = governance_repo / LEGACY_BRANCHES_DIR / old_id / LEGACY_ARTIFACTS_DIR
    if not source_root.exists():
        return []

    copied: list[str] = []
    for source_path in sorted(source_root.rglob("*")):
        if not source_path.is_file():
            continue
        relative_path = source_path.relative_to(source_root)
        target_path = feature_dir / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target_path)
        copied.append(str(relative_path))
    return copied


# ---------------------------------------------------------------------------
# Document Discovery & Migration
# ---------------------------------------------------------------------------

def _find_docs_folder(repo_root: Path) -> Path | None:
    """Find a Docs or docs folder at the repo root (case-insensitive)."""
    for name in ("Docs", "docs", "DOCS"):
        candidate = repo_root / name
        if candidate.is_dir():
            return candidate
    return None


def discover_documents(
    governance_repo: Path,
    old_id: str,
    domain: str,
    service: str,
    feature_id: str,
    source_repo: Path | None,
) -> list[dict]:
    """Discover documents from all three sources for a feature.

    Returns list of dicts: {source_type, source_path, relative_path, filename}.
    """
    discovered: list[dict] = []

    # Source 1: Governance legacy artifacts (branches/{old_id}/_bmad-output/...)
    legacy_root = governance_repo / LEGACY_BRANCHES_DIR / old_id / LEGACY_ARTIFACTS_DIR
    if legacy_root.is_dir():
        for fpath in sorted(legacy_root.rglob("*")):
            if fpath.is_file():
                discovered.append({
                    "source_type": DOC_SOURCE_GOVERNANCE_LEGACY,
                    "source_path": str(fpath),
                    "relative_path": str(fpath.relative_to(legacy_root)),
                    "filename": fpath.name,
                })

    if source_repo is not None:
        # Source 2: Source repo Docs/{domain}/{service}/{featureId}/
        docs_folder = _find_docs_folder(source_repo)
        if docs_folder is not None:
            feature_docs = docs_folder / domain / service / feature_id
            if feature_docs.is_dir():
                for fpath in sorted(feature_docs.rglob("*")):
                    if fpath.is_file():
                        discovered.append({
                            "source_type": DOC_SOURCE_REPO_DOCS,
                            "source_path": str(fpath),
                            "relative_path": str(fpath.relative_to(feature_docs)),
                            "filename": fpath.name,
                        })

        # Source 3: Source repo _bmad-output/lens-work/initiatives/{domain}/{service}/
        bmad_output = source_repo / "_bmad-output" / "lens-work" / "initiatives" / domain / service
        if bmad_output.is_dir():
            for fpath in sorted(bmad_output.rglob("*")):
                if fpath.is_file():
                    discovered.append({
                        "source_type": DOC_SOURCE_BMAD_OUTPUT,
                        "source_path": str(fpath),
                        "relative_path": str(fpath.relative_to(bmad_output)),
                        "filename": fpath.name,
                    })

    return discovered


def migrate_documents(
    governance_repo: Path,
    old_id: str,
    domain: str,
    service: str,
    feature_id: str,
    source_repo: Path | None,
) -> tuple[list[str], dict[str, int]]:
    """Copy discovered documents into governance feature docs/ folder.

    Conflict resolution: first source wins per DOC_SOURCE_PRIORITY order.
    Returns (list of copied relative paths, {source_type: count} dict).
    """
    docs = discover_documents(governance_repo, old_id, domain, service, feature_id, source_repo)
    if not docs:
        return [], {}

    target_dir = governance_repo / "features" / domain / service / feature_id / "docs"
    target_dir.mkdir(parents=True, exist_ok=True)

    # Sort by priority so higher-priority sources are copied first
    priority_rank = {src: i for i, src in enumerate(DOC_SOURCE_PRIORITY)}
    docs.sort(key=lambda d: priority_rank.get(d["source_type"], 99))

    copied: list[str] = []
    source_counts: dict[str, int] = {}
    seen_targets: set[str] = set()

    for doc in docs:
        rel = doc["relative_path"]
        if rel in seen_targets:
            continue  # Higher-priority source already placed this file
        seen_targets.add(rel)

        target_path = target_dir / rel
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(doc["source_path"], target_path)
        copied.append(rel)
        source_counts[doc["source_type"]] = source_counts.get(doc["source_type"], 0) + 1

    return copied, source_counts


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def verify_migration(
    governance_repo: Path,
    feature_id: str,
    domain: str,
    service: str,
) -> dict:
    """Verify a migrated feature has all expected artifacts in the governance repo."""
    checks: list[dict] = []
    feature_dir = governance_repo / "features" / domain / service / feature_id

    # Check 1: feature.yaml exists and is valid
    feature_path = feature_dir / "feature.yaml"
    feature_data = read_yaml_if_exists(feature_path)
    checks.append({
        "name": "feature_yaml",
        "result": "pass" if feature_data else "fail",
        "details": str(feature_path),
    })

    # Check 2: feature-index.yaml entry exists
    index_path = governance_repo / "feature-index.yaml"
    index_data = read_yaml_if_exists(index_path)
    index_has_entry = False
    if index_data and isinstance(index_data.get("features"), list):
        index_has_entry = any(
            (e.get("id") == feature_id or e.get("featureId") == feature_id)
            for e in index_data["features"]
        )
    checks.append({
        "name": "feature_index_entry",
        "result": "pass" if index_has_entry else "fail",
        "details": str(index_path),
    })

    # Check 3: summary.md exists
    summary_path = feature_dir / "summary.md"
    checks.append({
        "name": "summary_md",
        "result": "pass" if summary_path.is_file() else "fail",
        "details": str(summary_path),
    })

    # Check 4: problems.md exists
    problems_path = feature_dir / "problems.md"
    checks.append({
        "name": "problems_md",
        "result": "pass" if problems_path.is_file() else "fail",
        "details": str(problems_path),
    })

    # Check 5: docs/ directory (only if documents were migrated)
    docs_dir = feature_dir / "docs"
    if docs_dir.is_dir():
        doc_count = sum(1 for f in docs_dir.rglob("*") if f.is_file())
        checks.append({
            "name": "documents",
            "result": "pass" if doc_count > 0 else "warn",
            "details": f"{doc_count} documents at {docs_dir}",
        })

    overall = "pass" if all(c["result"] in ("pass", "warn") for c in checks) else "fail"
    return {
        "status": overall,
        "feature_id": feature_id,
        "domain": domain,
        "service": service,
        "checks": checks,
    }


def make_migration_summary(feature_id: str, domain: str, service: str, username: str, timestamp: str, old_id: str) -> str:
    """Build a summary stub compatible with the current Lens Next layout."""
    title = feature_id.replace("-", " ").title()
    return (
        f"# {title}\n\n"
        f"> Status: migrated | Feature ID: `{feature_id}`\n\n"
        f"Migrated from legacy branch `{old_id}`. Update as planning resumes.\n\n"
        f"**Domain:** {domain}  \n"
        f"**Service:** {service}  \n"
        f"**Owner:** {username}  \n"
        f"**Migrated:** {timestamp}\n"
    )


def build_index_entry(feature_data: dict, old_id: str, username: str) -> dict:
    """Build a compatibility index entry that works with both index readers in the repo."""
    feature_id = feature_data["featureId"]
    depends_on = feature_data.get("dependencies", {}).get("depends_on", [])
    updated_at = feature_data.get("updated") or now_iso()
    phase = feature_data.get("phase", "preplan")
    stale = bool(feature_data.get("context", {}).get("stale", False))
    return {
        "id": feature_id,
        "featureId": feature_id,
        "domain": feature_data.get("domain", ""),
        "service": feature_data.get("service", ""),
        "status": phase,
        "phase": phase,
        "owner": username,
        "plan_branch": f"{feature_id}-plan",
        "related_features": {
            "depends_on": depends_on,
            "blocks": [],
            "related": [],
        },
        "updated_at": updated_at,
        "summary": f"Migrated from legacy branch: {old_id}",
        "stale": stale,
        "migrated_from": old_id,
    }


def build_migrated_feature_data(
    governance_repo: Path,
    old_id: str,
    feature_id: str,
    domain: str,
    service: str,
    username: str,
    timestamp: str,
    fallback_phase: str,
) -> tuple[dict, str | None, list[str]]:
    """Create a Lens Next feature.yaml payload, preserving legacy state where possible."""
    init_feature_ops = load_init_feature_ops()
    legacy_state, legacy_state_path = find_legacy_state(governance_repo, old_id, domain, service, feature_id)
    warnings: list[str] = []

    raw_track = None
    raw_name = None
    raw_description = None
    if legacy_state:
        raw_track = legacy_state.get("track")
        raw_name = legacy_state.get("name")
        raw_description = legacy_state.get("description")

    valid_tracks = getattr(init_feature_ops, "VALID_TRACKS", [])
    track = raw_track if raw_track in valid_tracks else "full"
    if raw_track and raw_track not in valid_tracks:
        warnings.append(f"Unsupported legacy track '{raw_track}' defaulted to 'full'")

    name = raw_name or feature_id.replace("-", " ").title()
    feature_data = init_feature_ops.make_feature_yaml(feature_id, domain, service, name, track, username, timestamp)
    feature_data["description"] = raw_description or f"Migrated from legacy branch: {old_id}"
    feature_data["migrated_from"] = old_id

    if not legacy_state:
        phase, phase_warnings = normalize_phase(fallback_phase)
        warnings.extend(phase_warnings)
        feature_data["phase"] = phase
        return feature_data, legacy_state_path, warnings

    feature_data["created"] = legacy_state.get("created") or feature_data.get("created") or timestamp
    feature_data["updated"] = (
        legacy_state.get("updated")
        or legacy_state.get("updated_at")
        or legacy_state.get("last_updated")
        or timestamp
    )

    raw_phase = legacy_state.get("current_phase") or legacy_state.get("phase") or fallback_phase
    phase, phase_warnings = normalize_phase(raw_phase)
    warnings.extend(phase_warnings)
    feature_data["phase"] = phase

    transitions, transition_warnings = normalize_phase_transitions(
        legacy_state.get("phase_transitions"),
        feature_data["updated"],
        username,
    )
    warnings.extend(transition_warnings)
    if not transitions or transitions[-1].get("phase") != phase:
        transitions.append({"phase": phase, "timestamp": feature_data["updated"], "user": username})
    feature_data["phase_transitions"] = transitions

    legacy_milestones = legacy_state.get("milestones")
    if isinstance(legacy_milestones, dict):
        for milestone, value in legacy_milestones.items():
            if milestone in feature_data.get("milestones", {}):
                feature_data["milestones"][milestone] = value

    milestone, milestone_warnings = normalize_milestone(
        legacy_state.get("current_milestone") or legacy_state.get("milestone")
    )
    warnings.extend(milestone_warnings)
    if milestone and feature_data["milestones"].get(milestone) is None:
        feature_data["milestones"][milestone] = feature_data["updated"]

    dependencies = legacy_state.get("dependencies")
    if isinstance(dependencies, dict):
        feature_data.setdefault("dependencies", {})
        feature_data["dependencies"]["depends_on"] = list(dependencies.get("depends_on") or [])
        feature_data["dependencies"]["depended_by"] = list(dependencies.get("depended_by") or [])

    links = legacy_state.get("links")
    if isinstance(links, dict):
        feature_data.setdefault("links", {})
        feature_data["links"].update(links)

    context = legacy_state.get("context")
    if isinstance(context, dict):
        feature_data["context"] = {
            "last_pulled": context.get("last_pulled"),
            "stale": bool(context.get("stale", False)),
        }

    priority = legacy_state.get("priority")
    if isinstance(priority, str) and priority:
        feature_data["priority"] = priority

    return feature_data, legacy_state_path, warnings


def cmd_scan(args: argparse.Namespace) -> dict:
    """Detect legacy branches and build migration plan."""
    governance_repo = Path(args.governance_repo)
    if not governance_repo.exists():
        print(f"Error: Governance repo not found: {governance_repo}", file=sys.stderr)
        sys.exit(1)

    source_repo = Path(args.source_repo) if getattr(args, "source_repo", None) else None
    if source_repo and not source_repo.exists():
        print(f"Error: Source repo not found: {source_repo}", file=sys.stderr)
        sys.exit(1)

    branches_dir = governance_repo / LEGACY_BRANCHES_DIR
    if not branches_dir.exists():
        return {"status": "pass", "legacy_features": [], "total": 0, "conflicts": []}

    pattern_str = args.branch_pattern or DEFAULT_BRANCH_PATTERN
    try:
        pattern = re.compile(pattern_str)
    except re.error as e:
        return {"status": "fail", "error": f"Invalid branch pattern: {e}"}

    candidate_names = []
    for entry in branches_dir.iterdir():
        if entry.is_dir() and pattern.match(entry.name):
            candidate_names.append(entry.name)

    if not candidate_names:
        return {"status": "pass", "legacy_features": [], "total": 0, "conflicts": []}

    grouped = group_legacy_branches(candidate_names)

    legacy_features = []
    conflicts = []

    for base_name, info in sorted(grouped.items()):
        feature_id = info["feature_id"]
        domain = info["derived_domain"]
        service = info["derived_service"]
        milestones = info["milestones"]
        state = derive_state(milestones)

        new_feature_path = governance_repo / "features" / domain / service / feature_id / "feature.yaml"
        if new_feature_path.exists():
            conflicts.append(
                {
                    "old_id": base_name,
                    "feature_id": feature_id,
                    "conflict_path": str(new_feature_path),
                }
            )

        legacy_features.append(
            {
                "old_id": base_name,
                "derived_domain": domain,
                "derived_service": service,
                "feature_id": feature_id,
                "milestones": milestones,
                "proposed": {
                    "base_branch": feature_id,
                    "plan_branch": f"{feature_id}-plan",
                },
                "state": state,
                "documents": discover_documents(
                    governance_repo, base_name, domain, service, feature_id, source_repo,
                ),
            }
        )

    return {
        "status": "pass",
        "legacy_features": legacy_features,
        "total": len(legacy_features),
        "conflicts": conflicts,
    }


def cmd_migrate_feature(args: argparse.Namespace) -> dict:
    """Execute migration for a single feature."""
    governance_repo = Path(args.governance_repo)
    if not governance_repo.exists():
        print(f"Error: Governance repo not found: {governance_repo}", file=sys.stderr)
        sys.exit(1)

    init_feature_ops = load_init_feature_ops()

    err = init_feature_ops.validate_feature_id(args.feature_id)
    if err:
        return {"status": "fail", "error": err}

    for field_name, value in [("domain", args.domain), ("service", args.service)]:
        err = init_feature_ops.validate_safe_id(value, field_name)
        if err:
            return {"status": "fail", "error": err}

    dry_run = args.dry_run
    feature_id = args.feature_id
    domain = args.domain
    service = args.service
    old_id = args.old_id
    username = args.username or "unknown"
    timestamp = now_iso()
    source_repo = Path(args.source_repo) if getattr(args, "source_repo", None) else None

    feature_dir = governance_repo / "features" / domain / service / feature_id
    feature_path = feature_dir / "feature.yaml"
    index_path = governance_repo / "feature-index.yaml"
    summary_path = feature_dir / "summary.md"
    problems_path = feature_dir / "problems.md"
    artifact_source = governance_repo / LEGACY_BRANCHES_DIR / old_id / LEGACY_ARTIFACTS_DIR

    try:
        index_data, _index_exists = init_feature_ops.read_feature_index(str(governance_repo))
    except RuntimeError as e:
        return {"status": "fail", "error": str(e)}

    existing_ids = [entry.get("id") or entry.get("featureId") for entry in index_data.get("features", [])]
    if feature_id in existing_ids:
        return {
            "status": "fail",
            "error": f"Feature '{feature_id}' already exists in feature-index.yaml",
        }

    milestones = detect_legacy_milestones(governance_repo, old_id)
    fallback_phase = derive_state(milestones)
    legacy_state, legacy_state_path = find_legacy_state(governance_repo, old_id, domain, service, feature_id)
    if legacy_state:
        raw_phase = legacy_state.get("current_phase") or legacy_state.get("phase")
        if isinstance(raw_phase, str) and raw_phase:
            fallback_phase = raw_phase

    if dry_run:
        planned_actions = [
            f"Create feature.yaml at {feature_path}",
            f"Update feature-index.yaml at {index_path}",
            f"Create summary stub at {summary_path}",
            f"Create problems log at {problems_path}",
        ]
        if legacy_state_path:
            planned_actions.append(f"Preserve legacy state from {legacy_state_path}")
        if artifact_source.exists():
            planned_actions.append(f"Copy legacy artifacts from {artifact_source}")

        # Document discovery preview
        docs = discover_documents(governance_repo, old_id, domain, service, feature_id, source_repo)
        docs_target = governance_repo / "features" / domain / service / feature_id / "docs"
        for doc in docs:
            planned_actions.append(
                f"Copy document [{doc['source_type']}] {doc['relative_path']} → {docs_target / doc['relative_path']}"
            )

        return {
            "status": "pass",
            "feature_id": feature_id,
            "dry_run": True,
            "planned_actions": planned_actions,
            "feature_yaml_created": False,
            "index_updated": False,
            "legacy_state_path": legacy_state_path,
            "documents_discovered": len(docs),
        }

    feature_data, legacy_state_path, warnings = build_migrated_feature_data(
        governance_repo,
        old_id,
        feature_id,
        domain,
        service,
        username,
        timestamp,
        fallback_phase,
    )

    feature_dir.mkdir(parents=True, exist_ok=True)

    feature_yaml_created = False
    if not feature_path.exists():
        try:
            init_feature_ops.atomic_write_yaml(feature_path, feature_data)
            feature_yaml_created = True
        except OSError as e:
            return {"status": "fail", "error": f"Failed to create feature.yaml: {e}"}

    index_updated = False
    try:
        if "features" not in index_data:
            index_data["features"] = []

        existing_ids = [entry.get("id") or entry.get("featureId") for entry in index_data["features"]]
        if feature_id not in existing_ids:
            index_data["features"].append(build_index_entry(feature_data, old_id, username))
            index_path.parent.mkdir(parents=True, exist_ok=True)
            init_feature_ops.atomic_write_yaml(index_path, index_data)
            index_updated = True
    except (OSError, yaml.YAMLError) as e:
        return {"status": "fail", "error": f"Failed to update feature-index.yaml: {e}"}

    summary_created = False
    try:
        if not summary_path.exists():
            summary_path.parent.mkdir(parents=True, exist_ok=True)
            summary_path.write_text(
                make_migration_summary(feature_id, domain, service, username, timestamp, old_id),
                encoding="utf-8",
            )
            summary_created = True
    except OSError as e:
        return {"status": "fail", "error": f"Failed to create summary.md: {e}"}

    try:
        problems_created = create_problems_log(feature_dir, feature_id, domain, service, timestamp)
    except OSError as e:
        return {"status": "fail", "error": f"Failed to create problems.md: {e}"}

    try:
        artifacts_copied = copy_legacy_artifacts(governance_repo, old_id, feature_dir)
    except OSError as e:
        return {"status": "fail", "error": f"Failed to copy legacy artifacts: {e}"}

    # Document migration
    try:
        documents_migrated, documents_source = migrate_documents(
            governance_repo, old_id, domain, service, feature_id, source_repo,
        )
    except OSError as e:
        return {"status": "fail", "error": f"Failed to migrate documents: {e}"}

    return {
        "status": "pass",
        "feature_id": feature_id,
        "dry_run": False,
        "feature_yaml_created": feature_yaml_created,
        "index_updated": index_updated,
        "summary_created": summary_created,
        "problems_created": problems_created,
        "artifacts_copied": artifacts_copied,
        "documents_migrated": documents_migrated,
        "documents_source": documents_source,
        "legacy_state_path": legacy_state_path,
        "warnings": sorted(set(warnings)),
    }


def cmd_check_conflicts(args: argparse.Namespace) -> dict:
    """Check for naming conflicts before migration."""
    governance_repo = Path(args.governance_repo)
    if not governance_repo.exists():
        print(f"Error: Governance repo not found: {governance_repo}", file=sys.stderr)
        sys.exit(1)

    feature_id = args.feature_id
    domain = args.domain
    service = args.service

    target_path = governance_repo / "features" / domain / service / feature_id / "feature.yaml"

    if target_path.exists():
        return {
            "status": "conflict",
            "conflict": True,
            "existing_path": str(target_path),
        }

    return {
        "status": "pass",
        "conflict": False,
        "existing_path": None,
    }


def cmd_verify(args: argparse.Namespace) -> dict:
    """Verify a migrated feature has all expected artifacts."""
    governance_repo = Path(args.governance_repo)
    if not governance_repo.exists():
        print(f"Error: Governance repo not found: {governance_repo}", file=sys.stderr)
        sys.exit(1)

    init_feature_ops = load_init_feature_ops()

    err = init_feature_ops.validate_feature_id(args.feature_id)
    if err:
        return {"status": "fail", "error": err}

    for field_name, value in [("domain", args.domain), ("service", args.service)]:
        err = init_feature_ops.validate_safe_id(value, field_name)
        if err:
            return {"status": "fail", "error": err}

    return verify_migration(governance_repo, args.feature_id, args.domain, args.service)


def cmd_cleanup(args: argparse.Namespace) -> dict:
    """Clean up legacy artifacts and source documents after verified migration."""
    governance_repo = Path(args.governance_repo)
    if not governance_repo.exists():
        print(f"Error: Governance repo not found: {governance_repo}", file=sys.stderr)
        sys.exit(1)

    init_feature_ops = load_init_feature_ops()

    err = init_feature_ops.validate_feature_id(args.feature_id)
    if err:
        return {"status": "fail", "error": err}

    for field_name, value in [("domain", args.domain), ("service", args.service)]:
        err = init_feature_ops.validate_safe_id(value, field_name)
        if err:
            return {"status": "fail", "error": err}

    feature_id = args.feature_id
    domain = args.domain
    service = args.service
    old_id = args.old_id
    dry_run = args.dry_run
    source_repo = Path(args.source_repo) if getattr(args, "source_repo", None) else None

    # Gate: verify migration passed before allowing cleanup
    verification = verify_migration(governance_repo, feature_id, domain, service)
    if verification["status"] != "pass":
        return {
            "status": "fail",
            "error": "Cleanup blocked — migration verification did not pass. Run 'verify' first.",
            "verification": verification,
        }

    planned_deletions: list[dict] = []

    # 1. Governance legacy branch directory
    legacy_dir = governance_repo / LEGACY_BRANCHES_DIR / old_id
    if legacy_dir.is_dir():
        planned_deletions.append({
            "path": str(legacy_dir),
            "type": "directory",
            "source": "governance-legacy-branch",
        })

    # 2. Source repo Docs/{domain}/{service}/{featureId}/
    if source_repo:
        docs_folder = _find_docs_folder(source_repo)
        if docs_folder:
            source_docs = docs_folder / domain / service / feature_id
            if source_docs.is_dir():
                planned_deletions.append({
                    "path": str(source_docs),
                    "type": "directory",
                    "source": "source-repo-docs",
                })

        # 3. Source repo _bmad-output/lens-work/initiatives/{domain}/{service}/
        bmad_output = source_repo / "_bmad-output" / "lens-work" / "initiatives" / domain / service
        if bmad_output.is_dir():
            planned_deletions.append({
                "path": str(bmad_output),
                "type": "directory",
                "source": "source-bmad-output",
            })

    if dry_run:
        return {
            "status": "pass",
            "feature_id": feature_id,
            "dry_run": True,
            "planned_deletions": planned_deletions,
        }

    # Execute deletions
    cleaned: list[dict] = []
    errors: list[str] = []
    for deletion in planned_deletions:
        target = Path(deletion["path"])
        try:
            if target.is_dir():
                shutil.rmtree(target)
                cleaned.append(deletion)
        except OSError as e:
            errors.append(f"Failed to delete {target}: {e}")

    result: dict = {
        "status": "pass" if not errors else "partial",
        "feature_id": feature_id,
        "dry_run": False,
        "cleaned": cleaned,
    }
    if errors:
        result["errors"] = errors
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Migration operations — scan legacy LENS v3 branches and migrate to Lens Next model.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s scan --governance-repo /path/to/repo
  %(prog)s scan --governance-repo /path/to/repo --branch-pattern "^custom-.*$"

  %(prog)s scan --governance-repo /path/to/repo --source-repo /path/to/source

  %(prog)s check-conflicts --governance-repo /path/to/repo \\
    --feature-id auth-login --domain platform --service identity

  %(prog)s migrate-feature --governance-repo /path/to/repo \\
    --old-id platform-identity-auth-login --feature-id auth-login \\
    --domain platform --service identity --username cweber --dry-run

  %(prog)s migrate-feature --governance-repo /path/to/repo \\
    --old-id platform-identity-auth-login --feature-id auth-login \\
    --domain platform --service identity --username cweber \\
    --source-repo /path/to/source

  %(prog)s verify --governance-repo /path/to/repo \\
    --feature-id auth-login --domain platform --service identity

  %(prog)s cleanup --governance-repo /path/to/repo \\
    --old-id platform-identity-auth-login --feature-id auth-login \\
    --domain platform --service identity --dry-run

  %(prog)s cleanup --governance-repo /path/to/repo \\
    --old-id platform-identity-auth-login --feature-id auth-login \\
    --domain platform --service identity --source-repo /path/to/source
""",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    scan_p = subparsers.add_parser("scan", help="Detect legacy branches and build migration plan")
    scan_p.add_argument("--governance-repo", required=True, help="Path to governance repo root")
    scan_p.add_argument("--branch-pattern", help="Optional regex override for branch pattern detection")
    scan_p.add_argument("--source-repo", help="Path to source repo for document discovery")

    mig_p = subparsers.add_parser("migrate-feature", help="Execute migration for a single feature")
    mig_p.add_argument("--governance-repo", required=True, help="Path to governance repo root")
    mig_p.add_argument("--old-id", required=True, help="Old branch name (legacy ID)")
    mig_p.add_argument("--feature-id", required=True, help="New feature ID (kebab-case)")
    mig_p.add_argument("--domain", required=True, help="Domain name")
    mig_p.add_argument("--service", required=True, help="Service name")
    mig_p.add_argument("--username", default="unknown", help="Username performing the migration")
    mig_p.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    mig_p.add_argument("--source-repo", help="Path to source repo for document migration")

    cc_p = subparsers.add_parser("check-conflicts", help="Check for naming conflicts before migration")
    cc_p.add_argument("--governance-repo", required=True, help="Path to governance repo root")
    cc_p.add_argument("--feature-id", required=True, help="Target feature ID")
    cc_p.add_argument("--domain", required=True, help="Domain name")
    cc_p.add_argument("--service", required=True, help="Service name")

    ver_p = subparsers.add_parser("verify", help="Verify a migrated feature has all expected artifacts")
    ver_p.add_argument("--governance-repo", required=True, help="Path to governance repo root")
    ver_p.add_argument("--feature-id", required=True, help="Feature ID to verify")
    ver_p.add_argument("--domain", required=True, help="Domain name")
    ver_p.add_argument("--service", required=True, help="Service name")

    cl_p = subparsers.add_parser("cleanup", help="Remove legacy branches and source docs after verified migration")
    cl_p.add_argument("--governance-repo", required=True, help="Path to governance repo root")
    cl_p.add_argument("--old-id", required=True, help="Old branch name (legacy ID)")
    cl_p.add_argument("--feature-id", required=True, help="Feature ID to clean up")
    cl_p.add_argument("--domain", required=True, help="Domain name")
    cl_p.add_argument("--service", required=True, help="Service name")
    cl_p.add_argument("--source-repo", help="Path to source repo (for Docs/ and _bmad-output cleanup)")
    cl_p.add_argument("--dry-run", action="store_true", help="Preview deletions without executing")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    commands = {
        "scan": cmd_scan,
        "migrate-feature": cmd_migrate_feature,
        "check-conflicts": cmd_check_conflicts,
        "verify": cmd_verify,
        "cleanup": cmd_cleanup,
    }

    result = commands[args.command](args)
    json.dump(result, sys.stdout, indent=2, default=str)
    print()

    status = result.get("status", "fail")
    sys.exit(0 if status in ("pass", "conflict") else 1)


if __name__ == "__main__":
    main()
