#!/usr/bin/env python3
"""Shared Lens two-tree metadata, projection, Salmon, promotion, and validation helpers."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment contract
    raise SystemExit("PyYAML is required for Lens seed metadata parsing") from exc


PREFIX_BY_TYPE = {
    "program": "program:",
    "domain": "domain:",
    "service": "service:",
    "feature": "feature:",
    "projection": "projection:",
}
PARENT_PREFIXES = {
    "domain": {"program:"},
    "service": {"domain:", "program:", "unknown"},
    "feature": {"service:", "domain:", "program:", "unknown"},
}
CORE_FIELDS = ("stable_id", "entity_type", "title", "status", "publication_state", "updated_at")
FEATURE_FIELDS = ("feature_id", "track", "phase", "docs_path")
WAIVER_FIELDS = (
    "code",
    "owner",
    "rationale",
    "affected_stable_ids",
    "review_point",
    "impacted_gate",
    "status",
    "accepted_at",
)
LEGAL_SALMON_TRANSITIONS = {
    "advisory": {"material"},
    "material": {"blocked", "resolved"},
    "blocked": {"waived", "resolved"},
    "waived": {"resolved"},
    "resolved": set(),
}
MATERIALITY_TRIGGERS = {
    "published_truth_conflict",
    "identity_break",
    "parent_resolution_break",
    "lifecycle_invalidated",
    "critical_dependency",
    "security_inconsistency",
    "api_inconsistency",
}
LOCAL_TRACK_PHASES = {
    "full": {"preplan", "businessplan", "techplan", "finalizeplan", "dev", "complete"},
    "express": {"expressplan", "finalizeplan", "dev", "complete"},
    "quickdev": {"finalizeplan", "dev", "complete"},
    "hotfix-express": {"techplan", "finalizeplan", "dev", "complete"},
    "spike": {"preplan", "complete"},
}
RELEASE_DEFERRALS = [
    "Full Workbench UI remains out of scope.",
    "Broad historical migration remains out of scope.",
    "Weak Salmon text similarity remains advisory only.",
]
LENS_CONTEXT_FIELDS = (
    "lens_feature_id",
    "lens_track",
    "lens_phase",
    "lens_docs_path",
    "lens_constitution_status",
    "lens_preflight_status",
)


def utc_now() -> str:
    return os.environ.get("LENS_PROJECTION_NOW") or datetime.now(timezone.utc).isoformat()


def stable_now(value: str | None = None) -> str:
    return value or utc_now()


def as_list(value: Any) -> list[Any]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_status(value: Any) -> str:
    return normalize_text(value).lower()


def phase_base(value: Any) -> str:
    text = normalize_status(value)
    return text[: -len("-complete")] if text.endswith("-complete") else text


def resolve_path(root: Path, value: str | os.PathLike[str]) -> Path:
    text = os.fspath(value).replace("{project-root}/", "").replace("{project-root}\\", "")
    path = Path(text)
    return path if path.is_absolute() else root / path


def rel_path(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return data if isinstance(data, dict) else {}


def split_frontmatter(text: str) -> tuple[dict[str, Any], str] | None:
    if not text.startswith("---"):
        return None
    lines = text.splitlines()
    end_index = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end_index = index
            break
    if end_index is None:
        return None
    metadata = yaml.safe_load("\n".join(lines[1:end_index])) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    body = "\n".join(lines[end_index + 1 :])
    return metadata, body


def parse_metadata_file(path: Path) -> tuple[dict[str, Any], str] | None:
    if path.suffix.lower() == ".md":
        return split_frontmatter(path.read_text(encoding="utf-8"))
    if path.suffix.lower() in {".yaml", ".yml"}:
        return read_yaml(path), ""
    return None


def source_kind(path: Path) -> str:
    text = path.as_posix().lower()
    if "legacy" in text or "old-codebase" in text:
        return "legacy_compat"
    return "two_tree"


def discover_authored_files(root: Path, paths: list[Path]) -> list[Path]:
    seen: set[Path] = set()
    discovered: list[Path] = []
    for source in paths:
        if not source.exists():
            continue
        candidates = [source] if source.is_file() else [
            item for item in source.rglob("*") if item.suffix.lower() in {".md", ".yaml", ".yml"}
        ]
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            discovered.append(candidate)
    return sorted(discovered, key=lambda item: rel_path(item, root))


def is_governed_metadata(metadata: dict[str, Any]) -> bool:
    return bool(
        metadata.get("stable_id")
        or metadata.get("entity_type")
        or metadata.get("feature_id")
        or metadata.get("salmon_upstream")
        or metadata.get("topology_waiver")
        or metadata.get("features")
    )


def normalize_entity(metadata: dict[str, Any], body: str, path: Path, root: Path) -> dict[str, Any]:
    entity_type = normalize_text(metadata.get("entity_type"))
    stable_id = normalize_text(metadata.get("stable_id"))
    if not stable_id and metadata.get("feature_id"):
        stable_id = f"feature:{metadata['feature_id']}"
    if not entity_type and stable_id:
        entity_type = stable_id.split(":", 1)[0]
    return {
        "stable_id": stable_id,
        "entity_type": entity_type,
        "title": normalize_text(metadata.get("title") or metadata.get("name")),
        "status": normalize_text(metadata.get("status")),
        "publication_state": normalize_text(metadata.get("publication_state")),
        "updated_at": normalize_text(metadata.get("updated_at")),
        "belongs_to": normalize_text(metadata.get("belongs_to")),
        "feature_id": normalize_text(metadata.get("feature_id") or metadata.get("featureId") or metadata.get("id")),
        "track": normalize_text(metadata.get("track")),
        "phase": normalize_text(metadata.get("phase")),
        "docs_path": normalize_text(metadata.get("docs_path") or metadata.get("docs", {}).get("path") if isinstance(metadata.get("docs"), dict) else metadata.get("docs_path")),
        "target_repos": as_list(metadata.get("target_repos")),
        "depends_on": as_list(metadata.get("depends_on")),
        "related_to": as_list(metadata.get("related_to")),
        "features": as_list(metadata.get("features")),
        "promotion_status": normalize_text(metadata.get("promotion_status")),
        "salmon_upstream": as_list(metadata.get("salmon_upstream")),
        "salmon_status": normalize_text(metadata.get("salmon_status")),
        "topology_waiver": metadata.get("topology_waiver") if isinstance(metadata.get("topology_waiver"), dict) else {},
        "links": as_list(metadata.get("links")),
        "source_kind": source_kind(path),
        "path": rel_path(path, root),
        "body": body,
        "metadata": metadata,
    }


def collect_entities_from_paths(root: Path, paths: list[Path]) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    for artifact in discover_authored_files(root, paths):
        parsed = parse_metadata_file(artifact)
        if not parsed:
            continue
        metadata, body = parsed
        if not is_governed_metadata(metadata):
            continue
        entities.append(normalize_entity(metadata, body, artifact, root))
    return entities


def collect_entities(args: argparse.Namespace) -> list[dict[str, Any]]:
    root = Path(args.project_root).resolve()
    paths = [
        resolve_path(root, getattr(args, "work_intake_path", "docs/features")),
        resolve_path(root, getattr(args, "feature_archive_path", "docs/features")),
        resolve_path(root, getattr(args, "landscape_root", "docs")),
    ]
    return collect_entities_from_paths(root, paths)


def finding(severity: str, code: str, entity: dict[str, Any], message: str, recommendation: str, **extra: Any) -> dict[str, Any]:
    payload = {
        "severity": severity,
        "code": code,
        "stable_id": entity.get("stable_id") or "unknown",
        "entity_type": entity.get("entity_type") or "unknown",
        "source_path": entity.get("path", ""),
        "message": message,
        "recommendation": recommendation,
    }
    payload.update(extra)
    return payload


def severity_for_entity(entity: dict[str, Any], code: str = "") -> str:
    if entity.get("publication_state") == "published":
        return "blocker"
    phase = phase_base(entity.get("phase"))
    if phase in {"dev", "complete"} and code in {"unknown_parent", "missing_parent_entity", "invalid_waiver"}:
        return "blocker"
    if phase == "finalizeplan" and code in {"unknown_parent", "invalid_waiver"}:
        return "blocker"
    return "warning"


def validate_required_fields(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        required = list(CORE_FIELDS)
        if entity.get("entity_type") == "feature":
            required.extend(FEATURE_FIELDS)
        for field in required:
            if entity.get(source_field := field) in (None, "", [], {}):
                findings.append(finding(severity_for_entity(entity), "missing_required_field", entity, f"Missing required metadata field `{source_field}`.", f"Add `{source_field}` to the source metadata."))
    return findings


def validate_prefixes(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        entity_type = entity.get("entity_type")
        stable_id = entity.get("stable_id")
        expected = PREFIX_BY_TYPE.get(entity_type)
        if stable_id and expected and not stable_id.startswith(expected):
            findings.append(finding("blocker", "invalid_stable_id_prefix", entity, f"`{stable_id}` does not match entity type `{entity_type}`.", f"Use prefix `{expected}`."))
    return findings


def validate_duplicates(entities: list[dict[str, Any]], include_drafts: bool) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entity in entities:
        stable_id = entity.get("stable_id")
        if not stable_id or entity.get("publication_state") == "retired":
            continue
        if entity.get("publication_state") == "draft" and not include_drafts:
            continue
        grouped[stable_id].append(entity)
    findings: list[dict[str, Any]] = []
    for stable_id, matches in grouped.items():
        if len(matches) < 2:
            continue
        paths = ", ".join(item["path"] for item in matches)
        severity = "warning" if all(item.get("publication_state") == "draft" for item in matches) else "blocker"
        for entity in matches:
            findings.append(finding(severity, "duplicate_stable_id", entity, f"Duplicate stable ID `{stable_id}` also appears in {paths}.", "Give each governed entity a unique stable ID.", duplicate_paths=[item["path"] for item in matches]))
    return findings


def waiver_missing_fields(waiver: dict[str, Any]) -> list[str]:
    missing = [field for field in WAIVER_FIELDS if waiver.get(field) in (None, "", [], {})]
    affected = waiver.get("affected_stable_ids")
    if not isinstance(affected, list) or not affected:
        if "affected_stable_ids" not in missing:
            missing.append("affected_stable_ids")
    return missing


def waiver_complete(entity: dict[str, Any]) -> bool:
    waiver = entity.get("topology_waiver")
    return isinstance(waiver, dict) and not waiver_missing_fields(waiver)


def pilot_service_linked(entity: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> bool:
    stable_id = entity.get("stable_id")
    service = by_id.get("service:lens-workbench")
    return bool(service and stable_id in as_list(service.get("features")))


def build_edges(entities: list[dict[str, Any]]) -> list[dict[str, str]]:
    edges: list[dict[str, str]] = []
    by_id = {entity["stable_id"]: entity for entity in entities if entity.get("stable_id")}
    for entity in entities:
        source = entity.get("stable_id")
        if not source:
            continue
        parent = entity.get("belongs_to")
        if parent and parent != "unknown":
            edges.append({"type": "parent", "source": source, "target": parent, "source_path": entity["path"]})
            if parent in by_id:
                edges.append({"type": "child", "source": parent, "target": source, "source_path": entity["path"]})
        for feature in entity.get("features", []):
            edges.append({"type": "membership", "source": entity.get("stable_id", ""), "target": normalize_text(feature), "source_path": entity["path"]})
        for related in entity.get("related_to", []):
            edges.append({"type": "related_to", "source": source, "target": normalize_text(related), "source_path": entity["path"]})
        for dependency in entity.get("depends_on", []):
            edges.append({"type": "depends_on", "source": source, "target": normalize_text(dependency), "source_path": entity["path"]})
        for signal in entity.get("salmon_upstream", []):
            if isinstance(signal, dict) and signal.get("target_stable_id"):
                edges.append({"type": "salmon", "source": source, "target": normalize_text(signal["target_stable_id"]), "source_path": entity["path"]})
    return sorted(edges, key=lambda item: (item["type"], item["source"], item["target"], item["source_path"]))


def validate_parentage(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {entity["stable_id"]: entity for entity in entities if entity.get("stable_id")}
    findings: list[dict[str, Any]] = []
    for entity in entities:
        entity_type = entity.get("entity_type")
        if entity_type not in PARENT_PREFIXES:
            continue
        parent = entity.get("belongs_to")
        if parent == "unknown":
            if pilot_service_linked(entity, by_id):
                continue
            if waiver_complete(entity):
                severity = "blocker" if phase_base(entity.get("phase")) in {"dev", "complete"} else "warning"
                findings.append(finding(severity, "unknown_parent", entity, "`belongs_to` is unknown but a complete waiver is present.", "Verify the pilot ledger relationship before Dev completion."))
            else:
                findings.append(finding(severity_for_entity(entity, "unknown_parent"), "unknown_parent", entity, "`belongs_to` is unknown without a complete waiver.", "Resolve parentage or add a complete reviewed topology waiver."))
            continue
        if not parent:
            findings.append(finding(severity_for_entity(entity, "unknown_parent"), "missing_parent", entity, "`belongs_to` is missing.", "Set a valid parent stable ID or a complete waiver."))
            continue
        expected = PARENT_PREFIXES[entity_type]
        if not any(parent.startswith(prefix) for prefix in expected if prefix != "unknown"):
            findings.append(finding("blocker", "parent_type_mismatch", entity, f"Parent `{parent}` is not valid for `{entity_type}`.", f"Use one of: {', '.join(sorted(expected - {'unknown'}))}."))
        elif parent not in by_id:
            findings.append(finding(severity_for_entity(entity, "missing_parent_entity"), "missing_parent_entity", entity, f"Parent `{parent}` was not found.", "Create the parent ledger or correct the parent stable ID."))
    return findings


def validate_waivers(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        waiver = entity.get("topology_waiver")
        if not waiver:
            continue
        missing = waiver_missing_fields(waiver)
        if missing:
            findings.append(finding(severity_for_entity(entity, "invalid_waiver"), "invalid_waiver", entity, f"Topology waiver is missing: {', '.join(missing)}.", "Complete all waiver provenance fields.", missing_fields=missing))
    return findings


def validate_cycles(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {entity["stable_id"]: entity for entity in entities if entity.get("stable_id")}
    graph = {entity["stable_id"]: entity.get("belongs_to") for entity in entities if entity.get("stable_id") and entity.get("belongs_to") in by_id}
    findings: list[dict[str, Any]] = []
    for stable_id in sorted(graph):
        seen: list[str] = []
        current = stable_id
        while current in graph:
            if current in seen:
                cycle = seen[seen.index(current) :] + [current]
                findings.append(finding("blocker", "parent_cycle", by_id[stable_id], f"Parent graph contains a cycle: {' -> '.join(cycle)}.", "Break the cycle by correcting one parent reference.", cycle=cycle))
                break
            seen.append(current)
            current = graph[current]
    return findings


def local_links(body: str) -> list[str]:
    return [match.strip() for match in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", body)]


def validate_links(entities: list[dict[str, Any]], root: Path) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        source_path = root / entity["path"]
        for target in local_links(entity.get("body", "")):
            if "://" in target or target.startswith(("mailto:", "#")):
                continue
            clean = target.split("#", 1)[0]
            if clean and not (source_path.parent / clean).resolve().exists():
                findings.append(finding(severity_for_entity(entity), "broken_link", entity, f"Local link target `{target}` does not exist.", "Fix or remove the broken link."))
    return findings


def validate_lifecycle(entities: list[dict[str, Any]], root: Path, branch: str | None = None) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        if entity.get("entity_type") != "feature":
            continue
        track = normalize_status(entity.get("track"))
        phase = phase_base(entity.get("phase"))
        if track and track not in LOCAL_TRACK_PHASES:
            findings.append(finding(severity_for_entity(entity), "local_track_unknown", entity, f"Track `{track}` is not recognized.", "Use a supported lifecycle track."))
        if track in LOCAL_TRACK_PHASES and phase and phase not in LOCAL_TRACK_PHASES[track]:
            findings.append(finding(severity_for_entity(entity), "local_phase_not_in_track", entity, f"Phase `{entity.get('phase')}` is not valid for track `{track}`.", "Use a phase in the selected track."))
        docs_path = entity.get("docs_path")
        if docs_path and not resolve_path(root, docs_path).exists():
            findings.append(finding(severity_for_entity(entity), "local_docs_path_missing", entity, f"Docs path `{docs_path}` does not exist.", "Create the docs path or correct metadata."))
        if entity.get("target_repos") in (None, [], "") and phase in {"dev", "complete"}:
            findings.append(finding("blocker", "target_repo_missing", entity, "Dev/Complete feature lacks target repo metadata.", "Add target_repos before implementation."))
        if branch and branch not in {"main", "develop"} and phase in {"preplan", "businessplan", "techplan", "finalizeplan"}:
            findings.append(finding("warning", "branch_phase_separation", entity, f"Branch `{branch}` is separate from metadata phase `{entity.get('phase')}`.", "Use metadata phase as source truth, not branch name."))
    return findings


def has_lens_context(entity: dict[str, Any]) -> bool:
    metadata = entity.get("metadata", {})
    return any(metadata.get(field) not in (None, "", [], {}) for field in LENS_CONTEXT_FIELDS)


def validate_lens_context(entities: list[dict[str, Any]], root: Path) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    known_phases = set().union(*LOCAL_TRACK_PHASES.values())
    for entity in entities:
        if not has_lens_context(entity):
            continue
        metadata = entity.get("metadata", {})
        track = normalize_status(metadata.get("lens_track"))
        phase = phase_base(metadata.get("lens_phase"))
        if track and track not in LOCAL_TRACK_PHASES:
            findings.append(finding(severity_for_entity(entity), "lens_track_unknown", entity, f"Lens track `{track}` is not recognized.", "Refresh or correct Lens context."))
        if phase and phase not in known_phases:
            findings.append(finding(severity_for_entity(entity), "lens_phase_unknown", entity, f"Lens phase `{phase}` is not recognized.", "Refresh or correct Lens context."))
        if track in LOCAL_TRACK_PHASES and phase and phase not in LOCAL_TRACK_PHASES[track]:
            findings.append(finding("blocker", "lens_phase_not_in_track", entity, f"Lens phase `{phase}` is not valid for track `{track}`.", "Refresh or correct Lens context."))
        docs_path = normalize_text(metadata.get("lens_docs_path"))
        if docs_path and not resolve_path(root, docs_path).exists():
            findings.append(finding(severity_for_entity(entity), "lens_docs_path_missing", entity, f"Lens docs path `{docs_path}` does not exist.", "Refresh Lens context or create the docs path through Lens."))
        if normalize_status(metadata.get("lens_constitution_status")) == "blocked":
            findings.append(finding("blocker", "lens_constitution_blocked", entity, "Lens constitution status is blocked.", "Resolve constitution blockers before promotion or projection."))
        if normalize_status(metadata.get("lens_preflight_status")) == "blocked":
            findings.append(finding("blocker", "lens_preflight_blocked", entity, "Lens preflight status is blocked.", "Run preflight and resolve blockers."))
    return findings


def validate_completed_promotion(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for entity in entities:
        if entity.get("entity_type") != "feature":
            continue
        if normalize_status(entity.get("status")) not in {"completed", "done"}:
            continue
        if normalize_status(entity.get("promotion_status")) in {"", "pending", "not_started", "planned"}:
            findings.append(finding("warning", "completed_unpromoted", entity, "Completed feature knowledge has not been promoted to a living ledger.", "Run ledger promotion after parentage and doctor checks pass."))
    return findings


def salmon_signals(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    for entity in entities:
        for index, signal in enumerate(entity.get("salmon_upstream", []), start=1):
            if not isinstance(signal, dict):
                continue
            normalized = deepcopy(signal)
            normalized.setdefault("signal_id", f"{entity.get('stable_id', 'unknown')}#salmon-{index}")
            normalized["source_feature"] = entity.get("stable_id")
            normalized["source_path"] = entity.get("path")
            normalized["category"] = normalize_text(normalized.get("category") or "general")
            normalized["target_stable_id"] = normalize_text(normalized.get("target_stable_id"))
            normalized["status"] = normalize_status(normalized.get("status") or "advisory")
            normalized["materiality"] = normalize_status(normalized.get("materiality") or normalized.get("gate_impact"))
            signals.append(normalized)
    return sorted(signals, key=lambda item: (item.get("target_stable_id", ""), item.get("category", ""), item.get("signal_id", "")))


def classify_salmon_signal(signal: dict[str, Any]) -> str:
    triggers = {normalize_status(item) for item in as_list(signal.get("triggers"))}
    if signal.get("materiality") in {"material", "blocked"} or triggers & MATERIALITY_TRIGGERS:
        return "material"
    return "advisory"


def validate_salmon(entities: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    signals = salmon_signals(entities)
    pseudo_entity = {"stable_id": "salmon:signals", "entity_type": "salmon", "path": ""}
    for signal in signals:
        for field in ("signal_id", "target_stable_id", "category", "owner", "rationale", "status"):
            if not signal.get(field):
                findings.append(finding("warning", "salmon_missing_field", pseudo_entity, f"Salmon signal is missing `{field}`.", "Complete Salmon signal provenance.", signal_id=signal.get("signal_id")))
        current = normalize_status(signal.get("from_status") or signal.get("previous_status") or signal.get("status"))
        requested = normalize_status(signal.get("to_status") or signal.get("requested_status") or signal.get("status"))
        if requested != current and requested not in LEGAL_SALMON_TRANSITIONS.get(current, set()):
            findings.append(finding("blocker", "illegal_salmon_transition", pseudo_entity, f"Illegal Salmon transition `{current}` -> `{requested}`.", "Use a legal Salmon state transition.", signal_id=signal.get("signal_id"), current_status=current, requested_status=requested))
        signal["classification"] = classify_salmon_signal(signal)
    return signals, findings


def salmon_clusters(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for signal in signals:
        if signal.get("target_stable_id") and signal.get("category"):
            grouped[(signal["target_stable_id"], signal["category"])].append(signal)
    clusters: list[dict[str, Any]] = []
    for (target, category), matches in grouped.items():
        if len({item.get("source_feature") for item in matches}) < 2:
            continue
        highest = "blocked" if any(item.get("status") == "blocked" for item in matches) else "material" if any(item.get("classification") == "material" for item in matches) else "advisory"
        ready = highest == "material" and all(item.get("status") not in {"blocked"} for item in matches)
        digest = hashlib.sha1(f"{target}:{category}".encode("utf-8")).hexdigest()[:10]
        clusters.append({
            "candidate_id": f"salmon-candidate-{digest}",
            "title": f"{category.title()} signal cluster for {target}",
            "target_stable_id": target,
            "category": category,
            "source_signals": [item["signal_id"] for item in matches],
            "source_features": sorted({item.get("source_feature", "") for item in matches}),
            "cluster_confidence": "strong",
            "highest_status": highest,
            "promotion_ready": ready,
        })
    return sorted(clusters, key=lambda item: item["candidate_id"])


def validate_promotion(entities: list[dict[str, Any]], doctor: dict[str, Any] | None = None) -> dict[str, Any]:
    signals, salmon_findings = validate_salmon(entities)
    material_open = [signal for signal in signals if signal.get("classification") == "material" and signal.get("status") not in {"resolved", "waived"}]
    findings: list[dict[str, Any]] = list(salmon_findings)
    pseudo = {"stable_id": "promotion:review", "entity_type": "promotion", "path": ""}
    for entity in entities:
        if entity.get("entity_type") != "service":
            continue
        metadata = entity.get("metadata", {})
        provenance = metadata.get("promotion_provenance", {}) if isinstance(metadata.get("promotion_provenance"), dict) else {}
        if entity.get("features") and not provenance:
            findings.append(finding("warning", "promotion_provenance_missing", entity, "Ledger has linked features without promotion provenance.", "Record source_feature, source_signals, reviewer, projection evidence, and rationale."))
    if material_open:
        findings.append(finding("blocker", "material_salmon_blocks_promotion", pseudo, "Material Salmon signals remain unresolved.", "Resolve or waive each material signal before promotion.", signal_ids=[item["signal_id"] for item in material_open]))
    if doctor and doctor.get("blocking_count"):
        findings.append(finding("blocker", "doctor_blocks_promotion", pseudo, "Doctor blockers prevent promotion.", "Resolve doctor blockers before promotion."))
    blockers = [item for item in findings if item["severity"] == "blocker"]
    return {
        "module": "lens",
        "report_type": "ledger_promotion",
        "status": "blocked" if blockers else "pass",
        "findings": findings,
        "material_signal_count": len(material_open),
        "blocking_count": len(blockers),
    }


def public_entity(entity: dict[str, Any]) -> dict[str, Any]:
    keys = ("stable_id", "entity_type", "title", "status", "publication_state", "belongs_to", "updated_at", "path", "source_kind")
    public = {key: entity.get(key) for key in keys if entity.get(key) not in (None, "", [], {})}
    lifecycle = {key: entity.get(key) for key in ("feature_id", "track", "phase", "docs_path", "target_repos", "depends_on", "salmon_status") if entity.get(key) not in (None, "", [], {})}
    if lifecycle:
        public["lifecycle"] = lifecycle
    if entity.get("features"):
        public["features"] = entity["features"]
    lens_context = {
        field: entity.get("metadata", {}).get(field)
        for field in LENS_CONTEXT_FIELDS
        if entity.get("metadata", {}).get(field) not in (None, "", [], {})
    }
    if lens_context:
        public["lens_context"] = lens_context
    return public


def run_doctor(args: argparse.Namespace) -> dict[str, Any]:
    root = Path(args.project_root).resolve()
    entities = collect_entities(args)
    findings: list[dict[str, Any]] = []
    include_drafts = bool(getattr(args, "include_drafts", False))
    findings.extend(validate_required_fields(entities))
    findings.extend(validate_prefixes(entities))
    findings.extend(validate_duplicates(entities, include_drafts))
    findings.extend(validate_waivers(entities))
    findings.extend(validate_parentage(entities))
    findings.extend(validate_cycles(entities))
    findings.extend(validate_links(entities, root))
    findings.extend(validate_lifecycle(entities, root, getattr(args, "branch", None)))
    findings.extend(validate_lens_context(entities, root))
    findings.extend(validate_completed_promotion(entities))
    _, salmon_findings = validate_salmon(entities)
    findings.extend(salmon_findings)
    blockers = [item for item in findings if item["severity"] == "blocker"]
    warnings = [item for item in findings if item["severity"] == "warning"]
    infos = [item for item in findings if item["severity"] == "info"]
    result = {
        "module": "lens",
        "report_type": "lens_doctor",
        "status": "blocked" if blockers else "pass",
        "project_root": root.as_posix(),
        "entity_count": len(entities),
        "blocking_count": len(blockers),
        "warning_count": len(warnings),
        "info_count": len(infos),
        "advisory_count": len(warnings) + len(infos),
        "projection_rebuild_ready": not blockers,
        "include_drafts": include_drafts,
        "findings": sorted(findings, key=lambda item: (item["severity"], item["code"], item["source_path"], item["stable_id"])),
    }
    if getattr(args, "verbose", False):
        result["entities"] = [public_entity(entity) for entity in entities]
        result["edges"] = build_edges(entities)
    return result


def projection_payload(args: argparse.Namespace, generated_at: str | None = None) -> dict[str, Any]:
    entities = collect_entities(args)
    doctor = run_doctor(args)
    include_drafts = bool(getattr(args, "include_drafts", False))
    projected = [
        public_entity(entity)
        for entity in entities
        if entity.get("publication_state") != "retired" and (include_drafts or entity.get("publication_state") != "draft")
    ]
    projected = sorted(projected, key=lambda item: item.get("stable_id", ""))
    payload = {
        "module": "lens",
        "report_type": "governance_map",
        "generated_at": stable_now(generated_at),
        "derived": True,
        "source_model": "authored_metadata",
        "include_drafts": include_drafts,
        "source_paths": sorted({entity["path"] for entity in entities}),
        "entity_count": len(projected),
        "entities": projected,
        "edges": build_edges(entities),
        "diagnostics": doctor["findings"],
        "doctor": {
            "status": doctor["status"],
            "blocking_count": doctor["blocking_count"],
            "warning_count": doctor["warning_count"],
            "info_count": doctor["info_count"],
        },
    }
    return payload


def write_projection_markdown(path: Path, projection: dict[str, Any]) -> None:
    lines = [
        "---",
        "stable_id: projection:governance-map",
        "entity_type: projection",
        "title: Lens Governance Map",
        "status: derived",
        "publication_state: published",
        f"generated_at: {projection['generated_at']}",
        f"doctor_status: {projection['doctor']['status']}",
        "---",
        "",
        "# Lens Governance Map",
        "",
        "This file is generated from authored metadata. Do not edit it as source truth.",
        "",
        "## Summary",
        "",
        f"- Entity count: {projection['entity_count']}",
        f"- Blocking findings: {projection['doctor']['blocking_count']}",
        f"- Warning findings: {projection['doctor']['warning_count']}",
        f"- Drafts included: {str(projection['include_drafts']).lower()}",
        "",
        "## Entities",
        "",
        "| Stable ID | Type | Parent | State | Path |",
        "| --------- | ---- | ------ | ----- | ---- |",
    ]
    for entity in projection["entities"]:
        lines.append(f"| {entity.get('stable_id', 'unknown')} | {entity.get('entity_type', 'unknown')} | {entity.get('belongs_to', '')} | {entity.get('publication_state', '')} | {entity.get('path', '')} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def projection_paths(args: argparse.Namespace) -> tuple[Path, Path]:
    output_dir = resolve_path(Path(args.project_root).resolve(), args.reporting_output_path)
    return output_dir / "governance-map.json", output_dir / "governance-map.md"


def normalize_projection_for_check(payload: dict[str, Any]) -> dict[str, Any]:
    copy = deepcopy(payload)
    copy["generated_at"] = "<normalized>"
    return copy


def explain_entity(args: argparse.Namespace, stable_id: str) -> dict[str, Any]:
    entities = collect_entities(args)
    by_id = {entity["stable_id"]: entity for entity in entities if entity.get("stable_id")}
    entity = by_id.get(stable_id)
    if not entity:
        return {"status": "not_found", "stable_id": stable_id}
    edges = [edge for edge in build_edges(entities) if edge["source"] == stable_id or edge["target"] == stable_id]
    diagnostics = [item for item in run_doctor(args)["findings"] if item["stable_id"] == stable_id]
    return {"status": "pass", "entity": public_entity(entity), "source_fields": entity["metadata"], "edges": edges, "diagnostics": diagnostics}


def run_rebuild(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    if not getattr(args, "reporting_output_path", None):
        return 2, {"module": "lens", "report_type": "projection_rebuild", "status": "blocked", "error": "reporting_output_path_required"}
    if getattr(args, "explain", None):
        return 0, explain_entity(args, args.explain)
    projection = projection_payload(args, getattr(args, "generated_at", None))
    json_path, markdown_path = projection_paths(args)
    mode_check = bool(getattr(args, "check", False))
    mode_write = bool(getattr(args, "write", False) or not mode_check)
    if projection["doctor"]["blocking_count"] and mode_write and not getattr(args, "force", False):
        return 1, {"module": "lens", "report_type": "projection_rebuild", "status": "blocked", "reason": "Doctor found blocking issues; use --check or resolve blockers before --write.", "doctor": projection["doctor"], "diagnostics": projection["diagnostics"]}
    if mode_check:
        expected = normalize_projection_for_check(projection)
        existing_ok = False
        if json_path.exists():
            try:
                existing_ok = normalize_projection_for_check(json.loads(json_path.read_text(encoding="utf-8"))) == expected
            except json.JSONDecodeError:
                existing_ok = False
        return (0 if existing_ok else 1), {
            "module": "lens",
            "report_type": "projection_rebuild",
            "status": "pass" if existing_ok else "drift",
            "mode": "check",
            "json_path": json_path.as_posix(),
            "markdown_path": markdown_path.as_posix(),
            "would_write": False,
            "doctor": projection["doctor"],
        }
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(projection, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_projection_markdown(markdown_path, projection)
    return 0, {
        "module": "lens",
        "report_type": "projection_rebuild",
        "status": "complete" if not projection["doctor"]["blocking_count"] else "forced",
        "mode": "write",
        "json_path": json_path.as_posix(),
        "markdown_path": markdown_path.as_posix(),
        "entity_count": projection["entity_count"],
        "blocking_count": projection["doctor"]["blocking_count"],
        "warning_count": projection["doctor"]["warning_count"],
        "include_drafts": projection["include_drafts"],
    }


def run_salmon_report(args: argparse.Namespace) -> dict[str, Any]:
    entities = collect_entities(args)
    signals, findings = validate_salmon(entities)
    clusters = salmon_clusters(signals)
    blockers = [item for item in findings if item["severity"] == "blocker"]
    return {
        "module": "lens",
        "report_type": "salmon_impact",
        "status": "blocked" if blockers else "pass",
        "signals": signals,
        "candidate_records": clusters,
        "findings": findings,
        "blocking_count": len(blockers),
    }


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        return [], []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def validate_module_assets(root: Path) -> dict[str, Any]:
    module_yaml = root / "_bmad" / "lens-work" / "module.yaml"
    module_help = root / "_bmad" / "lens-work" / "module-help.csv"
    findings: list[dict[str, Any]] = []
    if not module_yaml.exists():
        findings.append({"severity": "blocker", "code": "module_yaml_missing", "message": str(module_yaml)})
        module_data: dict[str, Any] = {}
    else:
        module_data = read_yaml(module_yaml)
    _, rows = read_csv_rows(module_help)
    if not rows:
        findings.append({"severity": "blocker", "code": "module_help_missing", "message": str(module_help)})
    menu_groups: dict[str, list[str]] = defaultdict(list)
    skill_names: set[str] = set()
    for skill_root in (root / "skills", root / "_bmad" / "lens-work" / "skills"):
        if skill_root.exists():
            skill_names.update(item.name for item in skill_root.iterdir() if item.is_dir())
    for row in rows:
        menu_groups[row.get("menu-code", "")].append(row.get("skill", ""))
        skill = row.get("skill", "")
        if skill and skill.startswith("lens-") and skill not in skill_names and skill != "lens-bmad-skill":
            findings.append({"severity": "blocker", "code": "orphan_help_skill", "message": skill})
        if len(normalize_text(row.get("description"))) < 20:
            findings.append({"severity": "warning", "code": "weak_help_description", "message": skill})
    for code, skills in menu_groups.items():
        if code and len(skills) > 1:
            findings.append({"severity": "blocker", "code": "duplicate_menu_code", "message": code, "skills": skills})
    for skill in module_data.get("skills", []) or []:
        if skill.startswith("lens-") and skill not in skill_names and skill != "lens-bmad-skill":
            findings.append({"severity": "blocker", "code": "module_yaml_orphan_skill", "message": skill})
    skill_dirs = list((root / "skills").glob("lens-*")) if (root / "skills").exists() else []
    skill_dirs += list((root / "_bmad" / "lens-work" / "skills").glob("lens-*")) if (root / "_bmad" / "lens-work" / "skills").exists() else []
    for skill_dir in sorted(skill_dirs):
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists() and len(skill_file.read_text(encoding="utf-8")) > 30000:
            findings.append({"severity": "warning", "code": "progressive_disclosure_risk", "message": skill_dir.name})
    blockers = [item for item in findings if item["severity"] == "blocker"]
    return {"module": "lens", "report_type": "module_asset_validation", "status": "blocked" if blockers else "pass", "findings": findings, "blocking_count": len(blockers), "checked_files": [module_yaml.as_posix(), module_help.as_posix()]}


def git_branch(root: Path) -> str:
    result = subprocess.run(["git", "-C", str(root), "branch", "--show-current"], check=False, capture_output=True, text=True)
    return result.stdout.strip()


def run_release_validation(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    root = Path(args.project_root).resolve()
    output_dir = resolve_path(root, getattr(args, "reporting_output_path", "_bmad-output/lens"))
    branch = getattr(args, "branch", None) or git_branch(root)
    setattr(args, "branch", branch)
    doctor = run_doctor(args)
    projection_args = argparse.Namespace(**{**vars(args), "check": True, "write": False, "explain": None, "branch": None})
    projection_code, projection = run_rebuild(projection_args)
    salmon = run_salmon_report(args)
    promotion = validate_promotion(collect_entities(args), doctor)
    module_validation = validate_module_assets(root)
    checks = {
        "doctor": doctor["status"],
        "projection_check": projection["status"],
        "salmon": salmon["status"],
        "promotion": promotion["status"],
        "module_assets": module_validation["status"],
    }
    blockers = [
        name for name, status in checks.items()
        if status in {"blocked", "error"} or (name == "projection_check" and status == "drift" and not getattr(args, "allow_projection_drift", False))
    ]
    report = {
        "module": "lens",
        "report_type": "release_validation",
        "status": "blocked" if blockers else "pass",
        "branch": branch,
        "commands_run": [
            "lens-doctor",
            "lens-projection-rebuild --check",
            "lens-salmon-impact",
            "lens-ledger-promotion review",
            "module asset validation",
        ],
        "fixtures_covered": ["seed_improvements", "feature-a-b-c salmon", "invalid topology cases"],
        "output_paths_checked": [projection.get("json_path"), projection.get("markdown_path")],
        "module_assets_checked": module_validation["checked_files"],
        "intentional_deferrals": RELEASE_DEFERRALS,
        "checks": checks,
        "blockers": blockers,
        "details": {
            "doctor": doctor,
            "projection": projection,
            "salmon": salmon,
            "promotion": promotion,
            "module_assets": module_validation,
        },
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "release-validation.json"
    md_path = output_dir / "release-validation.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    md_path.write_text(
        "# Lens Release Validation\n\n"
        f"- Status: {report['status']}\n"
        f"- Commands run: {', '.join(report['commands_run'])}\n"
        f"- Blockers: {', '.join(blockers) if blockers else 'none'}\n"
        f"- Deferrals: {'; '.join(RELEASE_DEFERRALS)}\n",
        encoding="utf-8",
    )
    report["report_paths"] = {"json": json_path.as_posix(), "markdown": md_path.as_posix()}
    return (0 if not blockers else 1), report
