#!/usr/bin/env python3
"""Update the repository wiki with changelog entries for newly merged pull requests."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_CHANGELOG_PAGE = "PR-Change-Log.md"
DEFAULT_STATE_FILE = ".pr-changelog-state.json"
HOME_MARKER_START = "<!-- pr-changelog-wiki:start -->"
HOME_MARKER_END = "<!-- pr-changelog-wiki:end -->"
CHANGELOG_SEPARATOR = "\n---\n"
CHANGELOG_HEADER = "# Pull Request Change Log"


@dataclass(frozen=True)
class PullFile:
    filename: str
    status: str
    additions: int
    deletions: int
    changes: int


@dataclass(frozen=True)
class PullRequestSummary:
    number: int
    title: str
    url: str
    author: str
    merged_at: str
    body: str
    base_ref: str
    head_ref: str
    files: tuple[PullFile, ...]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN"))
    parser.add_argument("--api-url", default=os.environ.get("GITHUB_API_URL", "https://api.github.com"))
    parser.add_argument("--wiki-dir", required=True)
    parser.add_argument("--changelog-page", default=DEFAULT_CHANGELOG_PAGE)
    parser.add_argument("--state-file", default=DEFAULT_STATE_FILE)
    return parser.parse_args(argv)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def require_value(value: str | None, message: str) -> str:
    if value:
        return value
    raise SystemExit(message)


def request_json(url: str, token: str) -> Any:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "pr-changelog-wiki",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urlopen(request) as response:
            return json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"GitHub API request failed ({exc.code}) for {url}") from exc
    except URLError as exc:
        raise RuntimeError(f"GitHub API request failed for {url}: {exc.reason}") from exc


def paginated_request(base_url: str, token: str, params: dict[str, Any]) -> list[Any]:
    page = 1
    items: list[Any] = []
    while True:
        query = urlencode({**params, "page": page})
        payload = request_json(f"{base_url}?{query}", token)
        if not payload:
            return items
        if not isinstance(payload, list):
            raise RuntimeError(f"Expected list response from {base_url}")
        items.extend(payload)
        page += 1


def fetch_merged_pull_requests(repo: str, token: str, api_url: str) -> list[dict[str, Any]]:
    url = f"{api_url.rstrip('/')}/repos/{repo}/pulls"
    pulls = paginated_request(
        url,
        token,
        {
            "state": "closed",
            "sort": "updated",
            "direction": "desc",
            "per_page": 100,
        },
    )
    merged = [pull for pull in pulls if pull.get("merged_at")]
    merged.sort(key=lambda pull: (pull["merged_at"], pull["number"]), reverse=True)
    return merged


def fetch_pull_files(repo: str, pull_number: int, token: str, api_url: str) -> tuple[PullFile, ...]:
    url = f"{api_url.rstrip('/')}/repos/{repo}/pulls/{pull_number}/files"
    files = paginated_request(url, token, {"per_page": 100})
    return tuple(
        PullFile(
            filename=item["filename"],
            status=item.get("status", "modified"),
            additions=int(item.get("additions", 0)),
            deletions=int(item.get("deletions", 0)),
            changes=int(item.get("changes", 0)),
        )
        for item in files
    )


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"processed_pull_numbers": []}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid changelog state file: {path}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"Invalid changelog state file: {path}")
    payload.setdefault("processed_pull_numbers", [])
    return payload


def save_state(path: Path, repo: str, processed_numbers: set[int], updated_at: str) -> None:
    payload = {
        "repository": repo,
        "processed_pull_numbers": sorted(processed_numbers),
        "updated_at": updated_at,
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def strip_markdown(text: str) -> str:
    cleaned = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    cleaned = cleaned.replace("`", "")
    cleaned = cleaned.replace("**", "")
    cleaned = cleaned.replace("__", "")
    cleaned = cleaned.replace("*", "")
    cleaned = cleaned.replace("_", "")
    return " ".join(cleaned.split()).strip()


def extract_section(body: str, heading: str) -> str | None:
    if not body.strip():
        return None
    pattern = re.compile(
        rf"(?ims)^\s*#+\s*{re.escape(heading)}\s*$\n(.*?)(?=^\s*#|\Z)"
    )
    match = pattern.search(body)
    if match:
        return match.group(1).strip()
    return None


def extract_bullets(text: str) -> list[str]:
    bullets: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[-*+]\s+\[[ xX]\]\s+", stripped):
            continue
        if re.match(r"^[-*+]\s+", stripped):
            bullets.append(strip_markdown(re.sub(r"^[-*+]\s+", "", stripped)))
            continue
        if re.match(r"^\d+\.\s+", stripped):
            bullets.append(strip_markdown(re.sub(r"^\d+\.\s+", "", stripped)))
    return [bullet for bullet in bullets if bullet]


def extract_first_paragraph(text: str) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    for paragraph in paragraphs:
        lines = []
        for raw_line in paragraph.splitlines():
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped.startswith(">"):
                stripped = stripped.lstrip(">").strip()
            lines.append(stripped)
        if lines:
            sentence = strip_markdown(" ".join(lines))
            if sentence:
                return [sentence]
    return []


def extract_accomplishments(body: str, title: str) -> list[str]:
    candidates = []
    for heading in ("Summary", "What Changed", "Changes", "Overview"):
        section = extract_section(body, heading)
        if section:
            candidates.append(section)
    candidates.append(body)

    accomplishments: list[str] = []
    for candidate in candidates:
        if not candidate.strip():
            continue
        accomplishments = extract_bullets(candidate) or extract_first_paragraph(candidate)
        if accomplishments:
            break

    if not accomplishments:
        accomplishments = [strip_markdown(title)]

    return accomplishments[:5]


def summarize_areas(files: tuple[PullFile, ...]) -> list[str]:
    seen: dict[str, None] = {}
    for changed_file in files:
        area = changed_file.filename.split("/", 1)[0]
        if area not in seen:
            seen[area] = None
        if len(seen) == 5:
            break
    return list(seen)


def format_merged_at(merged_at: str) -> str:
    parsed = datetime.strptime(merged_at, "%Y-%m-%dT%H:%M:%SZ")
    return parsed.strftime("%Y-%m-%d %H:%M UTC")


def render_file_entry(changed_file: PullFile) -> str:
    stats = f"+{changed_file.additions}/-{changed_file.deletions}"
    return f"- `{changed_file.filename}` ({changed_file.status}, {stats})"


def render_pull_request_entry(pr: PullRequestSummary, max_files: int = 25) -> str:
    areas = summarize_areas(pr.files)
    accomplishments = extract_accomplishments(pr.body, pr.title)
    visible_files = pr.files[:max_files]
    hidden_file_count = len(pr.files) - len(visible_files)

    lines = [
        f"## PR #{pr.number}: {pr.title}",
        "",
        f"- Merged: {format_merged_at(pr.merged_at)}",
        f"- Author: @{pr.author}",
        f"- Branches: `{pr.head_ref}` → `{pr.base_ref}`",
        f"- Link: {pr.url}",
        f"- Files changed: {len(pr.files)}",
    ]
    if areas:
        lines.append("- Areas: " + ", ".join(f"`{area}`" for area in areas))

    lines.extend(["", "### Accomplished"])
    lines.extend(f"- {item}" for item in accomplishments)

    lines.extend(["", "### Files touched"])
    lines.extend(render_file_entry(changed_file) for changed_file in visible_files)
    if hidden_file_count > 0:
        lines.append(f"- _{hidden_file_count} additional files omitted for brevity_")

    return "\n".join(lines).rstrip() + "\n"


def strip_existing_changelog_header(existing: str) -> str:
    stripped = existing.strip()
    if not stripped:
        return ""
    if stripped.startswith(CHANGELOG_HEADER) and CHANGELOG_SEPARATOR in stripped:
        _, remainder = stripped.split(CHANGELOG_SEPARATOR, 1)
        return remainder.strip()
    return stripped


def render_changelog_page(existing: str, new_entries: list[str], repo: str, updated_at: str) -> str:
    existing_body = strip_existing_changelog_header(existing)
    body_parts = [entry.strip() for entry in new_entries if entry.strip()]
    if existing_body:
        body_parts.append(existing_body)

    header = (
        f"{CHANGELOG_HEADER}\n\n"
        f"This page is updated automatically from merged pull requests in `{repo}`.\n\n"
        f"_Last updated: {updated_at}_\n"
        f"{CHANGELOG_SEPARATOR}"
    )
    body = "\n\n".join(body_parts).strip()
    return header + (body + "\n" if body else "")


def link_target_for_page(page_name: str) -> str:
    return Path(page_name).stem.replace(" ", "-")


def render_home_page(existing: str, changelog_page: str, updated_at: str) -> str:
    block = (
        f"{HOME_MARKER_START}\n"
        f"## Automated Reports\n"
        f"- [Pull Request Change Log]({link_target_for_page(changelog_page)})\n\n"
        f"_Last PR changelog update: {updated_at}_\n"
        f"{HOME_MARKER_END}"
    )

    stripped = existing.strip()
    if not stripped:
        return f"# Home\n\n{block}\n"

    marker_pattern = re.compile(
        rf"{re.escape(HOME_MARKER_START)}.*?{re.escape(HOME_MARKER_END)}",
        flags=re.DOTALL,
    )
    if marker_pattern.search(existing):
        return marker_pattern.sub(block, existing).rstrip() + "\n"

    return existing.rstrip() + "\n\n" + block + "\n"


def build_pull_request_summary(repo: str, pull: dict[str, Any], token: str, api_url: str) -> PullRequestSummary:
    author = "unknown"
    if isinstance(pull.get("user"), dict):
        author = pull["user"].get("login") or author

    return PullRequestSummary(
        number=int(pull["number"]),
        title=pull["title"],
        url=pull["html_url"],
        author=author,
        merged_at=pull["merged_at"],
        body=pull.get("body") or "",
        base_ref=pull["base"]["ref"],
        head_ref=pull["head"]["ref"],
        files=fetch_pull_files(repo, int(pull["number"]), token, api_url),
    )


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    repo = require_value(args.repo, "--repo or GITHUB_REPOSITORY is required")
    token = require_value(args.token, "--token or GITHUB_TOKEN is required")
    updated_at = now_iso()

    wiki_dir = Path(args.wiki_dir).resolve()
    wiki_dir.mkdir(parents=True, exist_ok=True)

    state_path = wiki_dir / args.state_file
    changelog_path = wiki_dir / args.changelog_page
    home_path = wiki_dir / "Home.md"
    existing_state = state_path.read_text(encoding="utf-8") if state_path.exists() else ""

    state = load_state(state_path)
    processed_numbers = {int(number) for number in state.get("processed_pull_numbers", [])}

    merged_pulls = fetch_merged_pull_requests(repo, token, args.api_url)
    new_pulls = [pull for pull in merged_pulls if int(pull["number"]) not in processed_numbers]

    summaries = [
        build_pull_request_summary(repo, pull, token, args.api_url)
        for pull in new_pulls
    ]

    changelog_entries = [render_pull_request_entry(summary) for summary in summaries]

    existing_changelog = changelog_path.read_text(encoding="utf-8") if changelog_path.exists() else ""
    existing_home = home_path.read_text(encoding="utf-8") if home_path.exists() else ""

    should_update_pages = bool(summaries) or not changelog_path.exists() or not home_path.exists()
    if should_update_pages:
        rendered_changelog = render_changelog_page(existing_changelog, changelog_entries, repo, updated_at)
        rendered_home = render_home_page(existing_home, args.changelog_page, updated_at)

        if rendered_changelog != existing_changelog:
            changelog_path.write_text(rendered_changelog, encoding="utf-8")
        if rendered_home != existing_home:
            home_path.write_text(rendered_home, encoding="utf-8")

    processed_numbers.update(summary.number for summary in summaries)
    rendered_state = json.dumps(
        {
            "repository": repo,
            "processed_pull_numbers": sorted(processed_numbers),
            "updated_at": updated_at,
        },
        indent=2,
        sort_keys=True,
    ) + "\n"
    if summaries or not state_path.exists():
        if rendered_state != existing_state:
            state_path.write_text(rendered_state, encoding="utf-8")

    payload = {
        "repo": repo,
        "processed_new_pull_requests": [summary.number for summary in summaries],
        "total_processed_pull_requests": len(processed_numbers),
        "wiki_dir": str(wiki_dir),
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
