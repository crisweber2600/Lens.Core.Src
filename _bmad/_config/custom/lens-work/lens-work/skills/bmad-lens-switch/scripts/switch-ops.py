#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6.0"]
# ///
"""Switch operations — manage active milestone context for Lens agent sessions.

Reads milestone-index.yaml (with legacy fallback) and milestone.yaml files to
validate targets, load cross-milestone context paths, and confirm switches.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import yaml


SAFE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
MAX_INDEX_BYTES = 1_000_000  # 1 MB sanity cap on milestone-index.yaml
STALE_DAYS = 30
INDEX_CANDIDATES = [
    ("milestone-index.yaml", "milestones"),
    ("feature-index.yaml", "features"),
]
ROOT_CANDIDATES = ["milestones", "features"]
RECORD_CANDIDATES = ["milestone.yaml", "feature.yaml"]
SERVICE_RECORD_CANDIDATES = ["project.yaml", "service.yaml"]
DOMAIN_RECORD_CANDIDATES = ["workstream.yaml", "domain.yaml"]


def entry_id(entry: dict) -> str:
    """Return the milestone identifier from a milestone or feature index entry."""
    return str(entry.get("milestoneId") or entry.get("featureId") or entry.get("id") or "").strip()


def entry_workstream(entry: dict) -> str:
    """Return the workstream slug from a milestone or feature index entry."""
    return str(entry.get("workstream") or entry.get("domain") or "").strip()


def entry_project(entry: dict) -> str:
    """Return the project slug from a milestone or feature index entry."""
    return str(entry.get("project") or entry.get("service") or "").strip()


def feature_id_from_data(feature_data: dict) -> str:
    """Return the milestone identifier from a milestone or feature record."""
    return str(
        feature_data.get("milestoneId") or feature_data.get("featureId") or feature_data.get("id") or ""
    ).strip()


def feature_workstream(feature_data: dict) -> str:
    """Return the workstream slug from a milestone or feature record."""
    return str(feature_data.get("workstream") or feature_data.get("domain") or "").strip()


def feature_project(feature_data: dict) -> str:
    """Return the project slug from a milestone or feature record."""
    return str(feature_data.get("project") or feature_data.get("service") or "").strip()


def get_index_entries(index_data: dict) -> list[dict]:
    """Return the first recognized list of milestone or feature index entries."""
    for _, key in INDEX_CANDIDATES:
        entries = index_data.get(key)
        if isinstance(entries, list):
            return [entry for entry in entries if isinstance(entry, dict)]
    return []


def normalize_target_repo_state(feature_data: dict) -> dict | None:
    """Return the primary target repo dev state summary from feature metadata."""
    target_repos = feature_data.get("target_repos") or []
    if not isinstance(target_repos, list):
        return None

    primary = next((entry for entry in target_repos if isinstance(entry, dict)), None)
    if not primary:
        return None

    dev_branch_mode = str(primary.get("dev_branch_mode") or "").strip() or None
    working_branch = (
        str(primary.get("dev_branch_name") or primary.get("working_branch") or primary.get("branch") or "").strip() or None
    )
    base_branch = str(primary.get("dev_base_branch") or primary.get("default_branch") or "").strip() or None
    final_pr_url = str(primary.get("final_pr_url") or "").strip() or None
    final_review_report = str(primary.get("final_review_report") or "").strip() or None
    final_party_mode_report = str(primary.get("final_party_mode_report") or "").strip() or None

    if dev_branch_mode == "direct-default":
        final_pr_state = "not-required"
    elif final_pr_url:
        final_pr_state = "created"
    elif dev_branch_mode:
        final_pr_state = "pending"
    else:
        final_pr_state = "unknown"

    return {
        "name": primary.get("name", ""),
        "local_path": primary.get("local_path", ""),
        "remote_url": primary.get("remote_url") or primary.get("url", ""),
        "dev_branch_mode": dev_branch_mode,
        "working_branch": working_branch,
        "base_branch": base_branch,
        "final_pr_state": final_pr_state,
        "final_pr_url": final_pr_url,
        "final_review_report": final_review_report,
        "final_party_mode_report": final_party_mode_report,
    }


def load_feature_yaml_for_index_entry(governance_repo: str, entry: dict) -> dict | None:
    """Load milestone.yaml or feature.yaml for an index entry when available."""
    feature_id = entry_id(entry)
    workstream = entry_workstream(entry)
    project = entry_project(entry)
    if not feature_id or not workstream or not project:
        return None

    governance_root = Path(governance_repo)
    for root_name in ROOT_CANDIDATES:
        for record_name in RECORD_CANDIDATES:
            feature_path = governance_root / root_name / workstream / project / feature_id / record_name
            if not feature_path.exists():
                continue
            try:
                with open(feature_path) as f:
                    data = yaml.safe_load(f)
            except (yaml.YAMLError, OSError):
                return None
            return data if isinstance(data, dict) else None
    return None


def validate_identifier(value: str, field_name: str) -> str | None:
    """Validate that a path-constructing identifier is safe. Returns error message or None."""
    if not SAFE_ID_PATTERN.match(value):
        return (
            f"Invalid {field_name}: '{value}'. "
            f"Must match [a-z0-9][a-z0-9._-]{{0,63}} "
            f"(lowercase alphanumeric, dots, hyphens, underscores)."
        )
    return None


def load_feature_index(governance_repo: str) -> tuple[dict | None, str | None]:
    """Load milestone-index.yaml from the governance repo root.

    Returns (data, error). On success error is None; on failure data is None.
    """
    governance_root = Path(governance_repo)
    for index_name, _ in INDEX_CANDIDATES:
        index_path = governance_root / index_name
        if not index_path.exists():
            continue

        if index_path.stat().st_size > MAX_INDEX_BYTES:
            return None, f"{index_name} exceeds size limit ({MAX_INDEX_BYTES} bytes)"

        try:
            with open(index_path) as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            return None, f"Failed to parse {index_name}: {e}"
        except OSError as e:
            return None, f"Failed to read {index_name}: {e}"

        if not isinstance(data, dict):
            return None, f"{index_name} must be a YAML mapping"

        return data, None

    return None, f"milestone-index.yaml not found at {governance_root / 'milestone-index.yaml'}"


def find_feature_yaml(governance_repo: str, feature_id: str) -> Path | None:
    """Find milestone.yaml or feature.yaml by scanning governance trees."""
    governance_root = Path(governance_repo)
    for root_name in ROOT_CANDIDATES:
        root_dir = governance_root / root_name
        if not root_dir.exists():
            continue
        for record_name in RECORD_CANDIDATES:
            for yaml_file in sorted(root_dir.rglob(record_name)):
                try:
                    with open(yaml_file) as f:
                        data = yaml.safe_load(f)
                    if isinstance(data, dict) and feature_id_from_data(data) == feature_id:
                        return yaml_file
                except (yaml.YAMLError, OSError):
                    continue
    return None


def write_context_yaml(personal_folder: str, workstream: str, project: str, source: str) -> Path:
    """Write context.yaml to the personal folder with current workstream/project context."""
    context_path = Path(personal_folder) / "context.yaml"
    context_path.parent.mkdir(parents=True, exist_ok=True)
    context_data = {
        "workstream": workstream,
        "project": project,
        "domain": workstream,
        "service": project,
        "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "updated_by": source,
    }

    fd, tmp_path = tempfile.mkstemp(dir=str(context_path.parent), suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w") as f:
            yaml.dump(context_data, f, default_flow_style=False, sort_keys=False)
        os.replace(tmp_path, str(context_path))
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

    return context_path


def find_service_by_id(governance_repo: str, service_id: str) -> dict | None:
    """Find project metadata by project id from project.yaml files in governance trees."""
    governance_root = Path(governance_repo)
    for root_name in ROOT_CANDIDATES:
        root_dir = governance_root / root_name
        if not root_dir.exists():
            continue
        for record_name in SERVICE_RECORD_CANDIDATES:
            for yaml_file in sorted(root_dir.rglob(record_name)):
                try:
                    with open(yaml_file) as f:
                        data = yaml.safe_load(f)
                except (yaml.YAMLError, OSError):
                    continue
                if not isinstance(data, dict):
                    continue
                record_id = str(data.get("id") or "").strip()
                workstream = str(data.get("workstream") or data.get("domain") or "").strip()
                project = str(data.get("project") or data.get("service") or yaml_file.parent.name).strip()
                if record_id == service_id:
                    return {
                        "id": record_id,
                        "name": data.get("name", ""),
                        "workstream": workstream,
                        "project": project,
                        "domain": workstream,
                        "service": project,
                        "status": data.get("status", "active"),
                        "owner": data.get("owner", ""),
                    }
    return None


def load_service_by_path(governance_repo: str, domain: str, service: str) -> dict | None:
    """Load project metadata using an explicit workstream/project path."""
    governance_root = Path(governance_repo)
    for root_name in ROOT_CANDIDATES:
        for record_name in SERVICE_RECORD_CANDIDATES:
            service_yaml = governance_root / root_name / domain / service / record_name
            if not service_yaml.exists():
                continue
            try:
                with open(service_yaml) as f:
                    data = yaml.safe_load(f)
            except (yaml.YAMLError, OSError):
                return None
            if not isinstance(data, dict):
                return None
            workstream = str(data.get("workstream") or data.get("domain") or domain).strip()
            project = str(data.get("project") or data.get("service") or service).strip()
            return {
                "id": data.get("id", f"{workstream}-{project}"),
                "name": data.get("name", ""),
                "workstream": workstream,
                "project": project,
                "domain": workstream,
                "service": project,
                "status": data.get("status", "active"),
                "owner": data.get("owner", ""),
            }
    return None


def resolve_service_context(
    governance_repo: str,
    selector_id: str,
    domain: str | None,
    service: str | None,
) -> tuple[dict | None, str | None]:
    """Resolve a project context from explicit workstream/project or project id."""
    if domain and service:
        service_meta = load_service_by_path(governance_repo, domain, service)
        if not service_meta:
            return None, f"Project '{domain}/{service}' not found in governance repo"
        return service_meta, None

    service_meta = find_service_by_id(governance_repo, selector_id)
    if service_meta:
        return service_meta, None

    return None, (
        "milestone-index.yaml not found and no matching project context found. "
        f"Expected project id '{selector_id}' from workstream inventory, or provide --workstream and --project."
    )


def resolve_personal_folder(governance_repo: str, personal_folder: str | None) -> str:
    """Resolve the personal folder used for context.yaml persistence.

    If not provided explicitly, default to sibling of governance repo root:
    <governance_repo_parent>/.lens/personal
    """
    if personal_folder:
        return personal_folder
    return str(Path(governance_repo).parent / ".lens" / "personal")


def is_stale(feature_data: dict) -> bool:
    """Return True if the feature has not been updated in STALE_DAYS days."""
    updated = feature_data.get("updated") or feature_data.get("updated_at") or ""
    if not updated or not isinstance(updated, str):
        return False
    try:
        dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days > STALE_DAYS
    except ValueError:
        return False


def build_context_paths(
    governance_repo: str,
    feature_data: dict,
    index_by_id: dict[str, dict],
) -> tuple[list[str], list[str]]:
    """Derive cross-milestone context paths from dependencies.

    Returns (summaries, full_docs):
      - summaries: summary.md paths for related milestones
      - full_docs: tech-plan.md paths for depends_on and blocks milestones
    """
    deps = feature_data.get("dependencies") or {}
    depends_on: list[str] = deps.get("depends_on") or []
    related: list[str] = deps.get("related") or []
    blocks: list[str] = deps.get("blocks") or []

    full_doc_ids = list(dict.fromkeys(depends_on + blocks))
    # related features not already in full_doc_ids get summaries only
    summary_ids = [fid for fid in related if fid not in full_doc_ids]

    summaries: list[str] = []
    for fid in summary_ids:
        feature_path = find_feature_yaml(governance_repo, fid)
        if feature_path:
            summaries.append(str(feature_path.parent.relative_to(governance_repo) / "summary.md"))
            continue
        entry = index_by_id.get(fid)
        if entry:
            summaries.append(
                str(Path("milestones") / entry_workstream(entry) / entry_project(entry) / fid / "summary.md")
            )

    full_docs: list[str] = []
    for fid in full_doc_ids:
        feature_path = find_feature_yaml(governance_repo, fid)
        if feature_path:
            full_docs.append(str(feature_path.parent.relative_to(governance_repo) / "tech-plan.md"))
            continue
        entry = index_by_id.get(fid)
        if entry:
            full_docs.append(
                str(Path("milestones") / entry_workstream(entry) / entry_project(entry) / fid / "tech-plan.md")
            )

    return summaries, full_docs


def scan_domain_inventory(governance_repo: str) -> dict:
    """Scan governance trees for workstream.yaml/domain.yaml and project.yaml/service.yaml files.

    Fallback used when milestone-index.yaml does not yet exist. Returns workstream/project
    inventory so the agent can orient the user without requiring milestone initialization.
    """
    domains: list[dict] = []

    governance_root = Path(governance_repo)
    seen_workstreams: set[str] = set()
    for root_name in ROOT_CANDIDATES:
        root_dir = governance_root / root_name
        if not root_dir.exists():
            continue
        for workstream_dir in sorted(d for d in root_dir.iterdir() if d.is_dir()):
            workstream_slug = workstream_dir.name
            if workstream_slug in seen_workstreams:
                continue

            domain_data: dict | None = None
            for record_name in DOMAIN_RECORD_CANDIDATES:
                domain_yaml = workstream_dir / record_name
                if not domain_yaml.exists():
                    continue
                try:
                    with open(domain_yaml) as f:
                        loaded = yaml.safe_load(f)
                except (yaml.YAMLError, OSError):
                    loaded = None
                if isinstance(loaded, dict):
                    domain_data = loaded
                    break
            if not isinstance(domain_data, dict):
                continue

            services: list[dict] = []
            for project_dir in sorted(d for d in workstream_dir.iterdir() if d.is_dir()):
                service_data: dict | None = None
                for record_name in SERVICE_RECORD_CANDIDATES:
                    service_yaml = project_dir / record_name
                    if not service_yaml.exists():
                        continue
                    try:
                        with open(service_yaml) as f:
                            loaded = yaml.safe_load(f)
                    except (yaml.YAMLError, OSError):
                        loaded = None
                    if isinstance(loaded, dict):
                        service_data = loaded
                        break
                if not isinstance(service_data, dict):
                    continue

                project_slug = str(
                    service_data.get("project") or service_data.get("service") or project_dir.name
                ).strip()
                services.append(
                    {
                        "id": service_data.get("id", ""),
                        "name": service_data.get("name", ""),
                        "project": project_slug,
                        "service": project_slug,
                        "status": service_data.get("status", "active"),
                        "owner": service_data.get("owner", ""),
                    }
                )

            domains.append(
                {
                    "id": domain_data.get("id", ""),
                    "name": domain_data.get("name", ""),
                    "workstream": str(domain_data.get("workstream") or domain_data.get("domain") or workstream_slug),
                    "domain": str(domain_data.get("workstream") or domain_data.get("domain") or workstream_slug),
                    "status": domain_data.get("status", "active"),
                    "owner": domain_data.get("owner", ""),
                    "services": services,
                }
            )
            seen_workstreams.add(workstream_slug)

    total_services = sum(len(d["services"]) for d in domains)
    if domains:
        message = "No milestones initialized yet. Showing workstream/project inventory from governance repo."
    else:
        message = "No milestones initialized and no workstreams registered. Run /init-milestone to begin."
    return {
        "status": "pass",
        "mode": "domains",
        "domains": domains,
        "total_domains": len(domains),
        "total_services": total_services,
        "message": message,
    }


def cmd_list(args: argparse.Namespace) -> dict:
    """List milestones from milestone-index.yaml with optional status filter.

    Falls back to workstream/project inventory (scan_domain_inventory) when
    milestone-index.yaml does not yet exist in the governance repo.
    """
    index_data, err = load_feature_index(args.governance_repo)
    if err:
        if "not found" in err:
            return scan_domain_inventory(args.governance_repo)
        return {"status": "fail", "error": err}

    raw_features = get_index_entries(index_data)

    status_filter: str = args.status_filter
    if status_filter == "archived":
        raw_features = [f for f in raw_features if f.get("status") == "archived"]
    elif status_filter != "all":
        raw_features = [f for f in raw_features if f.get("status") != "archived"]

    features = []
    for i, f in enumerate(raw_features):
        feature_data = load_feature_yaml_for_index_entry(args.governance_repo, f)
        features.append(
            {
                "num": i + 1,
                "id": entry_id(f),
                "milestoneId": entry_id(f),
                "workstream": entry_workstream(f),
                "project": entry_project(f),
                "domain": entry_workstream(f),
                "service": entry_project(f),
                "status": f.get("status", "active"),
                "owner": f.get("owner", ""),
                "summary": f.get("summary", ""),
                "target_repo": normalize_target_repo_state(feature_data or {}),
            }
        )

    return {"status": "pass", "mode": "features", "features": features, "total": len(features)}


def try_git_checkout(control_repo: str, branch: str) -> tuple[bool, str | None]:
    """Attempt git checkout of branch in control_repo. Returns (switched, error_msg)."""
    try:
        result = subprocess.run(
            ["git", "-C", control_repo, "checkout", branch],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return True, None
        return False, result.stderr.strip() or result.stdout.strip() or f"git checkout {branch} failed"
    except OSError as e:
        return False, f"git not available: {e}"


def cmd_switch(args: argparse.Namespace) -> dict:
    """Validate and prepare context for switching to a milestone."""
    err = validate_identifier(args.feature_id, "milestone-id")
    if err:
        return {"status": "fail", "error": err}

    if args.domain:
        err = validate_identifier(args.domain, "workstream")
        if err:
            return {"status": "fail", "error": err}
    if args.service:
        err = validate_identifier(args.service, "project")
        if err:
            return {"status": "fail", "error": err}

    personal_folder = resolve_personal_folder(args.governance_repo, args.personal_folder)
    plan_branch = f"{args.feature_id}-plan"
    control_repo = getattr(args, "control_repo", ".") or "."

    index_data, err = load_feature_index(args.governance_repo)
    if err:
        if "not found" not in err:
            return {"status": "fail", "error": err}

        service_meta, service_err = resolve_service_context(
            args.governance_repo,
            args.feature_id,
            args.domain,
            args.service,
        )
        if service_err:
            return {"status": "fail", "error": service_err}

        try:
            context_path = str(
                write_context_yaml(
                    personal_folder,
                    service_meta["workstream"],
                    service_meta["project"],
                    "lens-switch",
                )
            )
        except OSError as e:
            return {"status": "fail", "error": f"Failed to write context.yaml: {e}"}

        branch_switched: bool | None = None
        branch_error: str | None = None
        if control_repo:
            branch_switched, branch_error = try_git_checkout(control_repo, plan_branch)

        result: dict = {
            "status": "pass",
            "mode": "service-context",
            "plan_branch": plan_branch,
            "service_context": {
                "id": service_meta["id"],
                "name": service_meta["name"],
                "workstream": service_meta["workstream"],
                "project": service_meta["project"],
                "domain": service_meta["domain"],
                "service": service_meta["service"],
                "status": service_meta["status"],
                "owner": service_meta["owner"],
                "context_path": context_path,
            },
            "context_to_load": {
                "summaries": [],
                "full_docs": [],
            },
            "message": "milestone-index.yaml missing; switched to project context fallback.",
        }
        if control_repo is not None:
            result["branch_switched"] = branch_switched
            if branch_error:
                result["branch_error"] = branch_error
        return result

    raw_features = get_index_entries(index_data)
    index_by_id = {entry_id(f): f for f in raw_features if entry_id(f)}

    index_entry = index_by_id.get(args.feature_id)
    if not index_entry:
        return {
            "status": "fail",
            "error": f"Milestone '{args.feature_id}' not found in milestone-index.yaml",
        }

    feature_path = find_feature_yaml(args.governance_repo, args.feature_id)
    if not feature_path:
        return {
            "status": "fail",
            "error": f"milestone.yaml not found for '{args.feature_id}'",
        }

    try:
        with open(feature_path) as f:
            feature_data = yaml.safe_load(f)
    except (yaml.YAMLError, OSError) as e:
        return {"status": "fail", "error": f"Failed to read milestone.yaml: {e}"}

    if not isinstance(feature_data, dict):
        return {"status": "fail", "error": "milestone.yaml is not a valid YAML mapping"}

    summaries, full_docs = build_context_paths(args.governance_repo, feature_data, index_by_id)

    try:
        context_path = str(
            write_context_yaml(
                personal_folder,
                feature_workstream(feature_data),
                feature_project(feature_data),
                "lens-switch",
            )
        )
    except OSError as e:
        return {"status": "fail", "error": f"Failed to write context.yaml: {e}"}

    branch_switched2: bool | None = None
    branch_error2: str | None = None
    if control_repo:
        branch_switched2, branch_error2 = try_git_checkout(control_repo, plan_branch)

    out: dict = {
        "status": "pass",
        "plan_branch": plan_branch,
        "feature": {
            "id": args.feature_id,
            "milestoneId": feature_id_from_data(feature_data) or args.feature_id,
            "name": feature_data.get("name", ""),
            "workstream": feature_workstream(feature_data),
            "project": feature_project(feature_data),
            "domain": feature_workstream(feature_data),
            "service": feature_project(feature_data),
            "phase": feature_data.get("phase", ""),
            "track": feature_data.get("track", ""),
            "priority": feature_data.get("priority", ""),
            "status": index_entry.get("status", "active"),
            "owner": index_entry.get("owner", ""),
            "stale": is_stale(feature_data),
            "updated": str(feature_data.get("updated") or feature_data.get("updated_at") or ""),
            "context_path": context_path,
            "target_repo": normalize_target_repo_state(feature_data),
        },
        "context_to_load": {
            "summaries": summaries,
            "full_docs": full_docs,
        },
    }
    if control_repo is not None:
        out["branch_switched"] = branch_switched2
        if branch_error2:
            out["branch_error"] = branch_error2
    return out


def cmd_context_paths(args: argparse.Namespace) -> dict:
    """Get file paths needed for cross-milestone context for a given milestone."""
    err = validate_identifier(args.feature_id, "milestone-id")
    if err:
        return {"status": "fail", "error": err}

    feature_path: Path | None = None
    governance_root = Path(args.governance_repo)
    for root_name in ROOT_CANDIDATES:
        for record_name in RECORD_CANDIDATES:
            direct_path = governance_root / root_name / args.domain / args.service / args.feature_id / record_name
            if direct_path.exists():
                feature_path = direct_path
                break
        if feature_path:
            break
    if not feature_path:
        feature_path = find_feature_yaml(args.governance_repo, args.feature_id)

    if not feature_path:
        return {
            "status": "fail",
            "error": f"Milestone '{args.feature_id}' not found",
        }

    try:
        with open(feature_path) as f:
            feature_data = yaml.safe_load(f)
    except (yaml.YAMLError, OSError) as e:
        return {"status": "fail", "error": f"Failed to read milestone.yaml: {e}"}

    if not isinstance(feature_data, dict):
        return {"status": "fail", "error": "milestone.yaml is not a valid YAML mapping"}

    # Load index for workstream/project lookups of dependency milestones.
    index_data, _ = load_feature_index(args.governance_repo)
    index_by_id: dict[str, dict] = {}
    if index_data:
        for f in get_index_entries(index_data):
            resolved_id = entry_id(f)
            if resolved_id:
                index_by_id[resolved_id] = f

    summaries, full_docs = build_context_paths(args.governance_repo, feature_data, index_by_id)

    return {"status": "pass", "summaries": summaries, "full_docs": full_docs}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
                description="Switch operations — manage active milestone context.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s list --governance-repo /path/to/repo/
  %(prog)s list --governance-repo /path/to/repo/ --status-filter all

    %(prog)s switch --governance-repo /path/to/repo/ --milestone-id auth-login

  %(prog)s context-paths --governance-repo /path/to/repo/ \\
        --milestone-id auth-login --workstream platform --project identity
""",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # list
    list_p = subparsers.add_parser("list", help="List milestones from milestone-index.yaml")
    list_p.add_argument("--governance-repo", required=True, help="Governance repo root path")
    list_p.add_argument(
        "--status-filter",
        default="active",
        choices=["all", "active", "archived"],
        help="Filter by milestone status (default: non-archived milestones)",
    )

    # switch
    switch_p = subparsers.add_parser("switch", help="Validate and prepare context for a milestone switch")
    switch_p.add_argument("--governance-repo", required=True, help="Governance repo root path")
    switch_p.add_argument("--feature-id", "--milestone-id", required=True, dest="feature_id", help="Target milestone identifier")
    switch_p.add_argument(
        "--domain",
        "--workstream",
        required=False,
        help="Workstream for project-context fallback when milestone-index.yaml is missing",
        dest="domain",
    )
    switch_p.add_argument(
        "--service",
        "--project",
        required=False,
        help="Project for project-context fallback when milestone-index.yaml is missing",
        dest="service",
    )
    switch_p.add_argument(
        "--personal-folder",
        required=False,
        help=(
            "Path to personal folder for context.yaml persistence. "
            "If omitted, defaults to <governance_repo_parent>/.lens/personal"
        ),
    )
    switch_p.add_argument(
        "--control-repo",
        required=False,
        default=".",
        dest="control_repo",
        help=(
            "Path to the control repo root. Defaults to '.' (the workspace root) and performs "
            "'git checkout {milestoneId}-plan' there after resolving the milestone context."
        ),
    )

    # context-paths
    ctx_p = subparsers.add_parser("context-paths", help="Get cross-milestone context file paths")
    ctx_p.add_argument("--governance-repo", required=True, help="Governance repo root path")
    ctx_p.add_argument("--feature-id", "--milestone-id", required=True, dest="feature_id", help="Milestone identifier")
    ctx_p.add_argument("--domain", "--workstream", required=True, dest="domain", help="Milestone workstream")
    ctx_p.add_argument("--service", "--project", required=True, dest="service", help="Milestone project")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    commands = {
        "list": cmd_list,
        "switch": cmd_switch,
        "context-paths": cmd_context_paths,
    }

    result = commands[args.command](args)
    json.dump(result, sys.stdout, indent=2, default=str)
    print()

    sys.exit(0 if result.get("status") in ("pass", "warning") else 1)


if __name__ == "__main__":
    main()
